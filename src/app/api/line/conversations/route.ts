import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/line/conversations
 * 返回所有對話列表（用于左側用戶列表）
 * - 取自 line_conversations 表
 * - 按 updated_at 排序
 * - 需要 workspace_id 過濾
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 取得所有對話列表，按最新更新排序
    const { data, error } = await supabase
      .from('line_conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      logger.warn('line_conversations 查詢失敗:', error.message)
      return NextResponse.json([])
    }

    // 確保返回的是陣列，並轉換為前端需要的格式
    const conversations = Array.isArray(data)
      ? data.map(item => ({
          id: item.id,
          conversation_type: item.conversation_type || 'user',
          target_id: item.target_id || '',
          target_name: item.target_name || '未知用戶',
          last_message_at: item.last_message_at,
          last_message_preview: item.last_message_preview || '',
          unread_count: item.unread_count || 0,
          tags: item.tags || [],
          note: item.note,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))
      : []

    return NextResponse.json(conversations)
  } catch (error) {
    logger.error('API /api/line/conversations 錯誤:', error)
    return NextResponse.json([])
  }
}

/**
 * PATCH /api/line/conversations
 * 更新對話狀態（標籤、備註、封存）
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const { id, tags, note, is_archived, target_name } = body

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (tags !== undefined) updateData.tags = tags
    if (note !== undefined) updateData.note = note
    if (is_archived !== undefined) updateData.is_archived = is_archived
    if (target_name !== undefined) updateData.target_name = target_name

    const { error } = await supabase
      .from('line_conversations')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API PATCH /api/line/conversations 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
