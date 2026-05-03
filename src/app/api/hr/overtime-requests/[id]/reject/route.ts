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
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as { reason?: string }
    if (!body.reason?.trim()) return NextResponse.json({ error: '駁回事由必填' }, { status: 400 })
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'rejected',
        approved_by: auth.data.employeeId,
        approved_at: new Date().toISOString(),
        reject_reason: body.reason.trim(),
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'pending')
    if (error) {
      logger.error('reject overtime 失敗', error)
      return NextResponse.json({ error: '駁回失敗' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    logger.error('reject overtime 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
