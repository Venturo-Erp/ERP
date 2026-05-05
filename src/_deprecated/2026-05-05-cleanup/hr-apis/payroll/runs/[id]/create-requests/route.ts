/**
 * POST /api/hr/payroll/runs/[id]/create-requests
 * 「一鍵請款」：薪資批次 finalized 後 → 為每位員工建一筆 payment_request（公司請款單、expense_type=SAL）
 *
 * 流程：
 *   1. 檢查 payroll_run 已 finalized
 *   2. 檢查沒重複建（每個 run 只能建一次）
 *   3. 為每筆 payslip 建 payment_request：
 *      - code: SAL-{YYYYMM}-{NNN}
 *      - request_category: 'company'
 *      - expense_type: 'SAL'
 *      - amount: payslip.net_amount
 *      - supplier_name: 員工姓名（薪資對象）
 *      - batch_id: payroll_run_id（同月薪資綁一起）
 *      - request_date: 公司發薪日（依 workspace.default_billing_day_of_week 推算）
 *      - notes: 2026-05 月薪 + payslip ID
 *      - status: 'pending'
 *   4. 更新 payroll_run.status = 'paid'
 *
 * 後續流程：請款單會走進財務系統的既有審核 / 出納 / 付款 流程
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { generateCompanyPaymentRequestCode } from '@/stores/utils/code-generator'

interface PayslipForRequest {
  id: string
  employee_id: string
  net_amount: number
  period_year: number
  period_month: number
  employees: { display_name: string | null; employee_number: string | null } | null
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    // 1. 檢查 payroll_run 狀態
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, status, period_year, period_month')
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (!run) return NextResponse.json({ error: '找不到薪資批次' }, { status: 404 })
    if (run.status !== 'finalized') {
      return NextResponse.json(
        { error: '請先確定薪資批次（finalized）後才能跑請款' },
        { status: 400 }
      )
    }

    // 2. 防重複：用 batch_id = run.id 查既有 payment_requests
    const { data: existingReqs } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('batch_id', id)
      .limit(1)

    if (existingReqs && existingReqs.length > 0) {
      return NextResponse.json(
        { error: '此薪資批次已建過請款單、不要重複建' },
        { status: 400 }
      )
    }

    // 3. 拿所有 payslips
    const { data: payslips, error: psErr } = await supabase
      .from('payslips')
      .select(
        'id, employee_id, net_amount, period_year, period_month, employees!payslips_employee_id_fkey (display_name, employee_number)'
      )
      .eq('payroll_run_id', id)
      .eq('workspace_id', auth.data.workspaceId)

    if (psErr) {
      logger.error('查 payslips 失敗', psErr)
      return NextResponse.json({ error: '查薪資單失敗' }, { status: 500 })
    }

    const slips = (payslips ?? []) as unknown as PayslipForRequest[]
    if (slips.length === 0) {
      return NextResponse.json({ error: '此批次沒有薪資單' }, { status: 400 })
    }

    // 4. 拿 workspace 的發薪日（公司 10 號 → request_date = 該月 10 號）
    const { data: ws } = await supabase
      .from('workspaces')
      .select('default_billing_day_of_week')
      .eq('id', auth.data.workspaceId)
      .single()

    // payday：用「次月 10 號」當請款日（薪資 = 次月發）
    const nextMonth = run.period_month === 12 ? 1 : run.period_month + 1
    const nextYear = run.period_month === 12 ? run.period_year + 1 : run.period_year
    const payday = new Date(nextYear, nextMonth - 1, 10).toISOString().slice(0, 10)

    // 5. 拿既有 SAL 請款單（給 code generator）
    const { data: existingSAL } = await supabase
      .from('payment_requests')
      .select('code')
      .eq('workspace_id', auth.data.workspaceId)
      .like('code', 'SAL-%')

    let codeBuffer: { code?: string }[] = (existingSAL ?? []) as { code?: string }[]

    // 6. 建 payment_requests（逐筆、避免 generator 拿到重複 code）
    const createdRequests: { id: string; code: string; employee: string; amount: number }[] = []
    for (const slip of slips) {
      const code = generateCompanyPaymentRequestCode('SAL', payday, codeBuffer)
      codeBuffer = [...codeBuffer, { code }]

      const employeeName = slip.employees?.display_name ?? '員工'
      const employeeNumber = slip.employees?.employee_number ?? ''
      const periodLabel = `${slip.period_year}-${String(slip.period_month).padStart(2, '0')}`

      const { data: inserted, error: insertErr } = await supabase
        .from('payment_requests')
        .insert({
          workspace_id: auth.data.workspaceId,
          code,
          request_number: code,
          request_type: '員工薪資',
          request_category: 'company',
          expense_type: 'SAL',
          amount: slip.net_amount,
          total_amount: slip.net_amount,
          supplier_id: null,
          supplier_name: employeeName,
          status: 'pending',
          request_date: payday,
          batch_id: id, // payroll_run_id
          is_special_billing: true,
          notes: `${periodLabel} 月薪資 - ${employeeName}（${employeeNumber}）/ payslip ${slip.id.slice(0, 8)}`,
          created_by: auth.data.employeeId,
          updated_by: auth.data.employeeId,
        })
        .select('id, code')
        .single()

      if (insertErr) {
        logger.error(`insert payment_request 失敗 (${employeeName})`, insertErr)
        continue
      }

      createdRequests.push({
        id: inserted.id,
        code: inserted.code,
        employee: employeeName,
        amount: slip.net_amount,
      })
    }

    // 7. 更新 payroll_run.status = 'paid'
    await supabase
      .from('payroll_runs')
      .update({
        status: 'paid',
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      ok: true,
      payroll_run_id: id,
      payday,
      total_count: createdRequests.length,
      total_amount: createdRequests.reduce((s, r) => s + r.amount, 0),
      requests: createdRequests,
      workspace_billing_day: ws?.default_billing_day_of_week ?? null,
    })
  } catch (err) {
    logger.error('POST create-requests 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
