/**
 * POST /api/hr/missed-clock-requests/[id]/approve
 * 核准 → 自動寫一筆 clock_records（source = 'manual'、status = 'manual_added'、關聯回 missed_clock_requests.id）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })
    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: mc } = await supabase
      .from('missed_clock_requests')
      .select('id, employee_id, date, clock_type, requested_time, status')
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (!mc) return NextResponse.json({ error: '找不到申請' }, { status: 404 })
    if (mc.status !== 'pending')
      return NextResponse.json({ error: `已是 ${mc.status} 狀態` }, { status: 400 })

    // update status
    const { error: updErr } = await supabase
      .from('missed_clock_requests')
      .update({
        status: 'approved',
        approved_by: auth.data.employeeId,
        approved_at: new Date().toISOString(),
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      logger.error('update missed_clock 失敗', updErr)
      return NextResponse.json({ error: '核准失敗' }, { status: 500 })
    }

    // 寫一筆 clock_records（manual_added、關聯回原申請）
    const clockAt = new Date(`${mc.date}T${mc.requested_time}+08:00`).toISOString()
    await supabase.from('clock_records').insert({
      workspace_id: auth.data.workspaceId,
      employee_id: mc.employee_id,
      clock_type: mc.clock_type,
      clock_at: clockAt,
      clock_date: mc.date,
      source: 'manual',
      status: 'manual_added',
      missed_clock_request_id: mc.id,
      note: '補打卡核准',
      created_by: auth.data.employeeId,
      updated_by: auth.data.employeeId,
    })

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    logger.error('approve missed_clock 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
