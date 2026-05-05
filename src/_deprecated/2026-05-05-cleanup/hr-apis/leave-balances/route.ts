/**
 * /api/hr/leave-balances
 * GET → 拿員工本年度假額餘額
 *   - 預設：自己（employee_id 從 auth）
 *   - admin / 主管可帶 ?employee_id=xxx 查別人
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

interface BalanceRow {
  id: string
  leave_type_id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  leave_types: {
    code: string
    name: string
    pay_type: string
    quota_type: string
    attendance_bonus_flag: string
    legal_basis: string | null
    requires_attachment: boolean
    attachment_threshold_days: number | null
    supports_hourly: boolean
    sort_order: number
  } | null
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const url = new URL(req.url)
    const targetEmployeeId = url.searchParams.get('employee_id') ?? auth.data.employeeId
    const year = parseInt(
      url.searchParams.get('year') ?? new Date().getFullYear().toString(),
      10
    )

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('leave_balances')
      .select(
        'id, leave_type_id, year, total_days, used_days, pending_days, leave_types (code, name, pay_type, quota_type, attendance_bonus_flag, legal_basis, requires_attachment, attachment_threshold_days, supports_hourly, sort_order)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .eq('employee_id', targetEmployeeId)
      .eq('year', year)
      .order('leave_types(sort_order)', { ascending: true })

    if (error) {
      logger.error('查 leave_balances 失敗', error)
      return NextResponse.json({ error: '查假額失敗' }, { status: 500 })
    }

    const enriched = (data as unknown as BalanceRow[] | null ?? []).map(b => ({
      id: b.id,
      leave_type_id: b.leave_type_id,
      year: b.year,
      total_days: Number(b.total_days),
      used_days: Number(b.used_days),
      pending_days: Number(b.pending_days),
      remaining_days: Number(b.total_days) - Number(b.used_days) - Number(b.pending_days),
      leave_type: b.leave_types,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    logger.error('GET /api/hr/leave-balances 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
