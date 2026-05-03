/**
 * POST /api/hr/payroll/runs/[id]/finalize
 * 確定薪資批次（draft → finalized、之後 immutable）
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

    const { data: run } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (!run) return NextResponse.json({ error: '找不到批次' }, { status: 404 })
    if (run.status === 'finalized' || run.status === 'paid') {
      return NextResponse.json({ error: `批次已是 ${run.status} 狀態` }, { status: 400 })
    }

    const { error: updErr } = await supabase
      .from('payroll_runs')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
        finalized_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      logger.error('finalize 失敗', updErr)
      return NextResponse.json({ error: '確定失敗' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id, status: 'finalized' })
  } catch (err) {
    logger.error('POST finalize 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
