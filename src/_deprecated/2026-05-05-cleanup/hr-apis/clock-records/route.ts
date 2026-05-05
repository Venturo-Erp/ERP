/**
 * GET /api/hr/clock-records
 * 列出 workspace 打卡紀錄（admin 視角）
 *
 * Query params：
 *   - month: YYYY-MM（預設本月）
 *   - employee_id: 過濾單一員工（option）
 *   - status: 過濾異常狀態（normal / late / abnormal）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const url = new URL(req.url)
    const monthStr = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const employeeId = url.searchParams.get('employee_id')
    const status = url.searchParams.get('status')

    const [year, month] = monthStr.split('-').map(Number)
    const periodStart = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const periodEnd = new Date(year, month, 1).toISOString().slice(0, 10)

    const supabase = getSupabaseAdminClient()
    let q = supabase
      .from('clock_records')
      .select(
        'id, employee_id, clock_type, clock_at, clock_date, source, is_remote, status, late_minutes, note, employees!clock_records_employee_id_fkey (display_name, employee_number)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .gte('clock_date', periodStart)
      .lt('clock_date', periodEnd)
      .order('clock_at', { ascending: false })
      .limit(500)

    if (employeeId) q = q.eq('employee_id', employeeId)
    if (status === 'abnormal') q = q.neq('status', 'normal')
    else if (status) q = q.eq('status', status)

    const { data, error } = await q

    if (error) {
      logger.error('查 clock_records 失敗', error)
      return NextResponse.json({ error: '查打卡紀錄失敗' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET /api/hr/clock-records 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
