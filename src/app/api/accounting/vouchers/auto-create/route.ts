import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { getServerAuth } from '@/lib/auth/server-auth'

const getSupabase = getSupabaseAdminClient

/**
 * 自動產生傳票 API（使用使用者設定的科目，不再硬編碼）
 *
 * POST /api/accounting/vouchers/auto-create
 *
 * Body:
 * - source_type: 'payment_request' | 'receipt'
 * - source_id: string (請款單/收款單 ID)
 * - workspace_id: string
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 必須登入、且 body 內的 workspace_id 必須等於使用者所屬 workspace、防跨租戶建傳票
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const { source_type, source_id, workspace_id } = body

    if (!source_type || !source_id || !workspace_id) {
      return NextResponse.json(
        { error: '缺少必要參數：source_type, source_id, workspace_id' },
        { status: 400 }
      )
    }

    if (workspace_id !== auth.data.workspaceId) {
      return NextResponse.json(
        { error: '無權對其他 workspace 建立傳票' },
        { status: 403 }
      )
    }

    let voucher

    switch (source_type) {
      case 'payment_request':
        voucher = await createVoucherFromPaymentRequest(workspace_id, source_id)
        break
      case 'receipt':
        voucher = await createVoucherFromReceipt(workspace_id, source_id)
        break
      default:
        return NextResponse.json({ error: `不支援的來源類型：${source_type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, voucher })
  } catch (error) {
    logger.error('自動產生傳票失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '自動產生傳票失敗' },
      { status: 500 }
    )
  }
}

/**
 * 產生傳票編號 — 透過 DB RPC、內建 advisory lock、防 race condition
 */
async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('generate_voucher_no', {
    p_workspace_id: workspaceId,
    p_voucher_date: date,
  })
  if (error || !data) throw error ?? new Error('generate_voucher_no returned null')
  return data as string
}

/**
 * 從收款單產生傳票
 * 使用「收款方式」的借方/貸方科目
 */
async function createVoucherFromReceipt(workspaceId: string, receiptId: string) {
  const db = getSupabase()

  // 1. 查詢收款單（含收款方式的科目設定、限定 workspace）
  const { data: receipt, error: recError } = await db
    .from('receipts')
    .select(
      `
      *,
      payment_method_ref:payment_methods!payment_method_id(
        id, name,
        debit_account:chart_of_accounts!debit_account_id(id, code, name),
        credit_account:chart_of_accounts!credit_account_id(id, code, name)
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('id', receiptId)
    .single()

  if (recError || !receipt) {
    throw new Error(`找不到收款單：${receiptId}`)
  }

  // 2. 取得科目
  const methodRef = receipt.payment_method_ref as {
    debit_account: { id: string; code: string; name: string } | null
    credit_account: { id: string; code: string; name: string } | null
  } | null

  if (!methodRef?.debit_account || !methodRef?.credit_account) {
    throw new Error('收款方式未設定會計科目，無法自動產生傳票')
  }

  const debitAccount = methodRef.debit_account
  const creditAccount = methodRef.credit_account

  // 3. 產生傳票編號
  const voucherDate = receipt.receipt_date || new Date().toISOString().split('T')[0]
  const voucherNo = await generateVoucherNo(workspaceId, voucherDate)

  // 4. 建立傳票（使用 journal_vouchers 表）
  const { data: voucher, error: voucherError } = await db
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      memo: `收款單 ${receipt.receipt_number || ''} - ${receipt.notes || ''}`.trim(),
      status: 'posted',
      total_debit: receipt.receipt_amount || 0,
      total_credit: receipt.receipt_amount || 0,
      source_type: 'receipt',
      source_id: receiptId,
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 5. 建立傳票分錄
  const lines = [
    {
      voucher_id: voucher.id,
      line_no: 1,
      account_id: debitAccount.id,
      description: `收款 - ${receipt.notes || ''}`,
      debit_amount: receipt.receipt_amount || 0,
      credit_amount: 0,
    },
    {
      voucher_id: voucher.id,
      line_no: 2,
      account_id: creditAccount.id,
      description: `收款 - ${receipt.notes || ''}`,
      debit_amount: 0,
      credit_amount: receipt.receipt_amount || 0,
    },
  ]

  const { error: linesError } = await db.from('journal_lines').insert(lines)

  if (linesError) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error(`建立傳票分錄失敗：${linesError.message}`)
  }

  return voucher
}

/**
 * 從請款單產生傳票
 * 使用「請款類別」的借方/貸方科目
 */
async function createVoucherFromPaymentRequest(workspaceId: string, paymentRequestId: string) {
  const db = getSupabase()

  // 1. 查詢請款單（限定 workspace）
  const { data: request, error: reqError } = await db
    .from('payment_requests')
    .select('*, items:payment_request_items(*)')
    .eq('workspace_id', workspaceId)
    .eq('id', paymentRequestId)
    .single()

  if (reqError || !request) {
    throw new Error(`找不到請款單：${paymentRequestId}`)
  }

  // 2. 查詢所有請款類別（用於對應 category）
  const { data: categories } = await db
    .from('expense_categories')
    .select(
      `
      id, name,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  const categoryMap = new Map<
    string,
    {
      debit_account: { id: string; code: string; name: string } | null
      credit_account: { id: string; code: string; name: string } | null
    }
  >()

  if (categories) {
    for (const cat of categories) {
      // Supabase join 可能返回陣列或單一物件
      const debitRaw = cat.debit_account as unknown
      const creditRaw = cat.credit_account as unknown
      const debit = Array.isArray(debitRaw) ? debitRaw[0] : debitRaw
      const credit = Array.isArray(creditRaw) ? creditRaw[0] : creditRaw

      categoryMap.set(cat.name, {
        debit_account: debit as { id: string; code: string; name: string } | null,
        credit_account: credit as { id: string; code: string; name: string } | null,
      })
    }
  }

  // 3. 產生傳票編號
  const voucherDate = request.request_date || new Date().toISOString().split('T')[0]
  const voucherNo = await generateVoucherNo(workspaceId, voucherDate)

  // 4. 建立傳票
  const totalAmount = request.total_amount || 0
  const { data: voucher, error: voucherError } = await db
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      memo: `請款單 ${request.code || ''} - ${request.notes || ''}`.trim(),
      status: 'posted',
      total_debit: totalAmount,
      total_credit: totalAmount,
      source_type: 'payment_request',
      source_id: paymentRequestId,
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 5. 建立傳票分錄
  const lines: Array<{
    voucher_id: string
    line_no: number
    account_id: string
    description: string
    debit_amount: number
    credit_amount: number
  }> = []

  let lineNo = 1
  const creditAccountIds: Map<string, number> = new Map() // 用於合併相同貸方科目

  // 借方分錄（每個項目一筆）
  for (const item of request.items || []) {
    const category = item.category || '其他'
    const catMapping = categoryMap.get(category)

    if (!catMapping?.debit_account) {
      throw new Error(`請款類別「${category}」未設定借方科目，無法自動產生傳票`)
    }

    lines.push({
      voucher_id: voucher.id,
      line_no: lineNo++,
      account_id: catMapping.debit_account.id,
      description: `${request.supplier_name || ''} / ${item.description || category}`,
      debit_amount: item.subtotal || 0,
      credit_amount: 0,
    })

    // 累計貸方金額（可能多個項目用同一個貸方科目）
    if (catMapping.credit_account) {
      const creditId = catMapping.credit_account.id
      creditAccountIds.set(creditId, (creditAccountIds.get(creditId) || 0) + (item.subtotal || 0))
    }
  }

  // 貸方分錄（合併相同科目）
  for (const [creditAccountId, amount] of creditAccountIds) {
    lines.push({
      voucher_id: voucher.id,
      line_no: lineNo++,
      account_id: creditAccountId,
      description: `應付 ${request.supplier_name || ''}`,
      debit_amount: 0,
      credit_amount: amount,
    })
  }

  if (lines.length === 0) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error('沒有有效的分錄，無法產生傳票')
  }

  const { error: linesError } = await db.from('journal_lines').insert(lines)

  if (linesError) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error(`建立傳票分錄失敗：${linesError.message}`)
  }

  return voucher
}
