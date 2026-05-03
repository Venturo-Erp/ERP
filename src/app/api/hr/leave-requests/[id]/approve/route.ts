/**
 * POST /api/hr/leave-requests/[id]/approve
 * 主管核准請假
 *
 * 動作：
 *   1. 找到 leave_request、檢查狀態為 pending
 *   2. update status = approved + approver_id + approved_at
 *   3. leave_balances：used_days += total_days、pending_days -= total_days
 *
 * 守門：MVP 用「同 workspace 都能審」、Phase 2 加 hr.leave capability
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as { note?: string }

    const supabase = getSupabaseAdminClient()

    // 找請假單 + 防止審自己（MVP 簡化、UI 該擋）
    const { data: lr, error: lrErr } = await supabase
      .from('leave_requests')
      .select('id, status, employee_id, leave_type_id, total_days, workspace_id')
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (lrErr || !lr) {
      return NextResponse.json({ error: '找不到請假單' }, { status: 404 })
    }

    if (lr.status !== 'pending') {
      return NextResponse.json(
        { error: `請假單已是 ${lr.status} 狀態、無法核准` },
        { status: 400 }
      )
    }

    // update status
    const { error: updErr } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approver_id: auth.data.employeeId,
        approved_at: new Date().toISOString(),
        approver_note: body.note ?? null,
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      logger.error('update leave_requests approve 失敗', updErr)
      return NextResponse.json({ error: '核准失敗' }, { status: 500 })
    }

    // 更新 leave_balances：pending → used
    const year = new Date().getFullYear()
    const { data: bal } = await supabase
      .from('leave_balances')
      .select('id, used_days, pending_days')
      .eq('employee_id', lr.employee_id)
      .eq('leave_type_id', lr.leave_type_id)
      .eq('year', year)
      .maybeSingle()

    if (bal) {
      await supabase
        .from('leave_balances')
        .update({
          used_days: Number(bal.used_days) + Number(lr.total_days),
          pending_days: Math.max(0, Number(bal.pending_days) - Number(lr.total_days)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bal.id)
    }

    return NextResponse.json({ ok: true, id, status: 'approved' })
  } catch (err) {
    logger.error('POST approve 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
