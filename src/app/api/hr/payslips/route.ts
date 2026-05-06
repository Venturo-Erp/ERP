/**
 * GET /api/hr/payslips
 * 員工拿自己的 payslip 列表（最近 12 期）
 *   - 預設：自己（auth.employeeId）
 *   - admin 可帶 ?employee_id=xxx 查別人
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })

    const url = new URL(req.url)
    const targetId = url.searchParams.get('employee_id') ?? auth.data.employeeId

    // 2026-05-06：查別人薪資必須有 hr.payroll.read capability
    // 之前漏洞：任意員工可帶 ?employee_id=xxx 查同事薪資
    if (targetId !== auth.data.employeeId) {
      const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
      const allowed = await hasCapabilityByCode(auth.data.employeeId, 'hr.payroll.read')
      if (!allowed) {
        return NextResponse.json({ error: '無權限查詢他人薪資' }, { status: 403 })
      }
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('payslips')
      .select(
        '*, payroll_runs!payslips_payroll_run_id_fkey (status, finalized_at)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .eq('employee_id', targetId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12)

    if (error) {
      logger.error('查 payslips 失敗', error)
      return NextResponse.json({ error: '查薪資單失敗' }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET payslips 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
