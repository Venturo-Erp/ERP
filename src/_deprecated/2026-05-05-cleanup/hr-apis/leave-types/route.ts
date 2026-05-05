/**
 * /api/hr/leave-types
 * GET → 拿當前 workspace 的假別列表（給請假表單下拉用）
 */

import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('查 leave_types 失敗', error)
      return NextResponse.json({ error: '查假別失敗' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET /api/hr/leave-types 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
