import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DEFAULT_ACCOUNTS } from '@/types/accounting.types'

// 生成傳票編號
async function generateVoucherNo(supabase: any, workspaceId: string, date: string): Promise<string> {
  const yearMonth = date.substring(0, 7).replace('-', '')
  const prefix = `JV${yearMonth}`

  const { data, error } = await supabase
    .from('journal_vouchers')
    .select('voucher_no')
    .eq('workspace_id', workspaceId)
    .like('voucher_no', `${prefix}%`)
    .order('voucher_no', { ascending: false })
    .limit(1)

  if (error && error.code !== 'PGRST116') throw error

  let seq = 1
  if (data && data.length > 0) {
    const lastNo = data[0].voucher_no
    const lastSeq = parseInt(lastNo.slice(-4))
    seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 驗證 session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 取得 user 資料
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id, id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData?.workspace_id) {
      return NextResponse.json({ error: 'User workspace not found' }, { status: 400 })
    }

    const stats = {
      accounts_created: 0,
      payment_vouchers: 0,
      request_vouchers: 0,
      errors: [] as string[],
    }

    // ============================================
    // 1. 初始化科目表
    // ============================================
    const { data: existingAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('workspace_id', userData.workspace_id)
      .limit(1)

    if (!existingAccounts || existingAccounts.length === 0) {
      // 插入預設科目
      const accountsToInsert = DEFAULT_ACCOUNTS.map(account => ({
        ...account,
        workspace_id: userData.workspace_id,
      }))

      const { error: accountsError } = await supabase
        .from('chart_of_accounts')
        .insert(accountsToInsert)

      if (accountsError) {
        stats.errors.push(`科目表初始化失敗: ${accountsError.message}`)
      } else {
        stats.accounts_created = accountsToInsert.length
      }
    }

    // 查詢科目 ID（用於生成傳票）
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('workspace_id', userData.workspace_id)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: '科目表為空，無法生成傳票' }, { status: 400 })
    }

    const accountMap = new Map(accounts.map(a => [a.code, a.id]))

    // ============================================
    // 2. 批量生成收款傳票
    // ============================================
    const { data: payments } = await supabase
      .from('payments')
      .select('id, order_id, payment_date, amount, payment_method, notes')
      .eq('workspace_id', userData.workspace_id)
      .is('accounting_voucher_id', null) // 只處理未生成傳票的
      .order('payment_date', { ascending: true })

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        try {
          const voucherNo = await generateVoucherNo(
            supabase,
            userData.workspace_id,
            payment.payment_date
          )

          // 決定借方科目（銀行存款或現金）
          const debitAccountCode = payment.payment_method === 'cash' ? '1110' : '1100'
          const debitAccountId = accountMap.get(debitAccountCode)
          const creditAccountId = accountMap.get('2100') // 預收團款

          if (!debitAccountId || !creditAccountId) {
            stats.errors.push(`收款 ${payment.id} 缺少科目`)
            continue
          }

          // 建立傳票
          const { data: voucher, error: voucherError } = await supabase
            .from('journal_vouchers')
            .insert({
              workspace_id: userData.workspace_id,
              voucher_no: voucherNo,
              voucher_date: payment.payment_date,
              memo: `收款 - ${payment.notes || ''}`,
              status: 'posted',
              total_debit: payment.amount,
              total_credit: payment.amount,
              created_by: userData.id,
            })
            .select()
            .single()

          if (voucherError) {
            stats.errors.push(`收款傳票建立失敗: ${voucherError.message}`)
            continue
          }

          // 建立分錄
          const lines = [
            {
              voucher_id: voucher.id,
              line_no: 1,
              account_id: debitAccountId,
              description: '收款',
              debit_amount: payment.amount,
              credit_amount: 0,
            },
            {
              voucher_id: voucher.id,
              line_no: 2,
              account_id: creditAccountId,
              description: '預收團款',
              debit_amount: 0,
              credit_amount: payment.amount,
            },
          ]

          const { error: linesError } = await supabase.from('journal_lines').insert(lines)

          if (linesError) {
            stats.errors.push(`收款分錄建立失敗: ${linesError.message}`)
            // 刪除傳票
            await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
            continue
          }

          // 更新 payment 記錄
          await supabase
            .from('payments')
            .update({ accounting_voucher_id: voucher.id })
            .eq('id', payment.id)

          stats.payment_vouchers++
        } catch (error) {
          stats.errors.push(`收款 ${payment.id} 處理失敗: ${error}`)
        }
      }
    }

    // ============================================
    // 3. 批量生成請款傳票
    // ============================================
    const { data: requests } = await supabase
      .from('payment_requests')
      .select('id, created_at, amount, description')
      .eq('workspace_id', userData.workspace_id)
      .eq('status', 'approved')
      .is('accounting_voucher_id', null)
      .order('created_at', { ascending: true })

    if (requests && requests.length > 0) {
      for (const request of requests) {
        try {
          const requestDate = new Date(request.created_at).toISOString().split('T')[0]
          const voucherNo = await generateVoucherNo(supabase, userData.workspace_id, requestDate)

          const debitAccountId = accountMap.get('1200') // 預付團務成本
          const creditAccountId = accountMap.get('1100') // 銀行存款

          if (!debitAccountId || !creditAccountId) {
            stats.errors.push(`請款 ${request.id} 缺少科目`)
            continue
          }

          // 建立傳票
          const { data: voucher, error: voucherError } = await supabase
            .from('journal_vouchers')
            .insert({
              workspace_id: userData.workspace_id,
              voucher_no: voucherNo,
              voucher_date: requestDate,
              memo: `請款 - ${request.description || ''}`,
              status: 'posted',
              total_debit: request.amount,
              total_credit: request.amount,
              created_by: userData.id,
            })
            .select()
            .single()

          if (voucherError) {
            stats.errors.push(`請款傳票建立失敗: ${voucherError.message}`)
            continue
          }

          // 建立分錄
          const lines = [
            {
              voucher_id: voucher.id,
              line_no: 1,
              account_id: debitAccountId,
              description: '預付團務成本',
              debit_amount: request.amount,
              credit_amount: 0,
            },
            {
              voucher_id: voucher.id,
              line_no: 2,
              account_id: creditAccountId,
              description: '銀行存款',
              debit_amount: 0,
              credit_amount: request.amount,
            },
          ]

          const { error: linesError } = await supabase.from('journal_lines').insert(lines)

          if (linesError) {
            stats.errors.push(`請款分錄建立失敗: ${linesError.message}`)
            await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
            continue
          }

          // 更新 payment_request 記錄
          await supabase
            .from('payment_requests')
            .update({ accounting_voucher_id: voucher.id })
            .eq('id', request.id)

          stats.request_vouchers++
        } catch (error) {
          stats.errors.push(`請款 ${request.id} 處理失敗: ${error}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `初始化完成：科目 ${stats.accounts_created} 個，收款傳票 ${stats.payment_vouchers} 筆，請款傳票 ${stats.request_vouchers} 筆`,
    })
  } catch (error) {
    console.error('Accounting initialization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
