/**
 * POST /api/hr/leave-requests/[id]/cancel
 * 員工自己撤銷請假（限本人 + pending 狀態）
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
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lr } = await supabase
      .from('leave_requests')
      .select('id, status, employee_id, leave_type_id, total_days')
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (!lr) return NextResponse.json({ error: '找不到請假單' }, { status: 404 })
    if (lr.employee_id !== auth.data.employeeId) {
      return NextResponse.json({ error: '只能撤銷自己的請假單' }, { status: 403 })
    }
    if (lr.status !== 'pending') {
      return NextResponse.json(
        { error: `請假單已是 ${lr.status} 狀態、無法撤銷` },
        { status: 400 }
      )
    }

    const { error: updErr } = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      logger.error('cancel 失敗', updErr)
      return NextResponse.json({ error: '撤銷失敗' }, { status: 500 })
    }

    // 解除預扣
    const year = new Date().getFullYear()
    const { data: bal } = await supabase
      .from('leave_balances')
      .select('id, pending_days')
      .eq('employee_id', lr.employee_id)
      .eq('leave_type_id', lr.leave_type_id)
      .eq('year', year)
      .maybeSingle()

    if (bal) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, Number(bal.pending_days) - Number(lr.total_days)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bal.id)
    }

    return NextResponse.json({ ok: true, id, status: 'cancelled' })
  } catch (err) {
    logger.error('POST cancel 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
