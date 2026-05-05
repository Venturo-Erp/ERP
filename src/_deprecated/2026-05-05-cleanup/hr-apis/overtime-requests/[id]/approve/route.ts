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
    const { error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'approved',
        approved_by: auth.data.employeeId,
        approved_at: new Date().toISOString(),
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'pending')
    if (error) {
      logger.error('approve overtime 失敗', error)
      return NextResponse.json({ error: '核准失敗' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    logger.error('approve overtime 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
