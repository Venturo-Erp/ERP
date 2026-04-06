import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/ai-settings — 取得當前 workspace 的 AI 設定
 */
export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('ai_settings')
      .select('id, setting_category, setting_key, setting_value, description, updated_at')
      .eq('workspace_id', auth.data.workspaceId)
      .order('setting_category')
      .order('setting_key')

    if (error) {
      logger.error('讀取 AI 設定失敗:', error)
      return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    logger.error('AI 設定 API 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * PATCH /api/ai-settings — 更新設定值
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await req.json()
    const { category, key, value } = body

    if (!category || !key) {
      return NextResponse.json({ error: '缺少 category 或 key' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('ai_settings').upsert(
      {
        workspace_id: auth.data.workspaceId,
        setting_category: category,
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
        updated_by: auth.data.employeeId,
      },
      { onConflict: 'workspace_id,setting_category,setting_key' }
    )

    if (error) {
      logger.error('更新 AI 設定失敗:', error)
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('AI 設定 API 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
