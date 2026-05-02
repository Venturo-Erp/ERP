import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

// Zod schema
const lineSchema = z.object({
  account_id: z.string().uuid(),
  description: z.string().nullable().optional(),
  debit_amount: z.number().min(0),
  credit_amount: z.number().min(0),
})

const createVoucherSchema = z.object({
  voucher_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().nullable().optional(),
  source_type: z.enum(['receipt', 'payment_request']).nullable().optional(),
  source_id: z.string().uuid().nullable().optional(),
  lines: z.array(lineSchema).min(2),
})

// 生成傳票編號 — 透過 DB RPC、內建 advisory lock、防 race condition
async function generateVoucherNo(
  supabase: SupabaseClient,
  workspaceId: string,
  date: string
): Promise<string> {
  const { data, error } = await supabase.rpc('generate_voucher_no', {
    p_workspace_id: workspaceId,
    p_voucher_date: date,
  })
  if (error || !data) throw error ?? new Error('generate_voucher_no returned null')
  return data as string
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

    // 取得 workspace_id（從 user metadata 或 RPC）
    let workspaceId = session.user.user_metadata?.workspace_id

    if (!workspaceId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()

      if (userError || !userData?.workspace_id) {
        return NextResponse.json({ error: 'User workspace not found' }, { status: 400 })
      }
      workspaceId = userData.workspace_id
    }

    // 解析 body
    const body = await request.json()
    const validated = createVoucherSchema.parse(body)

    // 驗證借貸平衡
    const totalDebit = validated.lines.reduce((sum, line) => sum + line.debit_amount, 0)
    const totalCredit = validated.lines.reduce((sum, line) => sum + line.credit_amount, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: '借貸不平衡！借方總額必須等於貸方總額' }, { status: 400 })
    }

    if (totalDebit === 0 || totalCredit === 0) {
      return NextResponse.json({ error: '借方或貸方金額不能為零' }, { status: 400 })
    }

    // 解析當前員工 id（audit 欄位一律用 employee.id 而非 auth uid）
    const { data: empRow } = await supabase
      .from('employees')
      .select('id')
      .or(`user_id.eq.${session.user.id},id.eq.${session.user.id}`)
      .limit(1)
      .maybeSingle()
    const employeeId = empRow?.id ?? null

    // 生成傳票編號
    const voucherNo = await generateVoucherNo(supabase, workspaceId, validated.voucher_date)

    // 插入傳票
    const { data: voucher, error: voucherError } = await supabase
      .from('journal_vouchers')
      .insert({
        workspace_id: workspaceId,
        voucher_no: voucherNo,
        voucher_date: validated.voucher_date,
        memo: validated.memo,
        status: 'posted',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: employeeId,
        source_type: validated.source_type || null,
        source_id: validated.source_id || null,
      })
      .select()
      .single()

    if (voucherError) throw voucherError

    // 插入分錄
    const linesData = validated.lines.map((line, index) => ({
      voucher_id: voucher.id,
      line_no: index + 1,
      account_id: line.account_id,
      description: line.description,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(linesData)

    if (linesError) {
      // 回滾：刪除傳票
      await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
      throw linesError
    }

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      voucher_id: voucher.id,
    })
  } catch (error) {
    logger.error('Create voucher error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
