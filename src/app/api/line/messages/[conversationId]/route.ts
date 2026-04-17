import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * GET /api/line/messages/[conversationId]
 * 返回該對話的所有消息
 * - 取自 line_messages 表
 * - 按 created_at 升序排列（時間順序）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { conversationId } = await params
    const workspaceId = auth.data.workspaceId

    if (!conversationId) {
      return NextResponse.json({ error: '缺少對話 ID' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 先確認對話存在且屬於該工作區
    const { data: conversationData, error: conversationError } = await supabase
      .from('line_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .limit(1)

    if (conversationError || !conversationData || conversationData.length === 0) {
      console.warn('對話不存在或無權限訪問:', conversationError?.message)
      return NextResponse.json({ error: '對話不存在' }, { status: 404 })
    }

    // 取得該對話的所有消息，按時間順序排列
    const { data, error } = await supabase
      .from('line_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) {
      console.warn('line_messages 查詢失敗:', error.message)
      return NextResponse.json([])
    }

    // 確保返回的是陣列，並轉換為前端需要的格式
    const messages = Array.isArray(data)
      ? data.map(item => ({
          id: item.id,
          conversation_id: item.conversation_id,
          message_id: item.message_id,
          message_type: item.message_type || 'text',
          sender_type: item.sender_type || 'user',
          sender_id: item.sender_id,
          content: item.content || '',
          media_url: item.media_url,
          is_read: item.is_read || false,
          is_ai_reply: item.is_ai_reply || false,
          ai_model: item.ai_model,
          created_at: item.created_at,
        }))
      : []

    return NextResponse.json(messages)
  } catch (error) {
    console.error('API /api/line/messages/[conversationId] 錯誤:', error)
    return NextResponse.json([])
  }
}

/**
 * PATCH /api/line/messages/[conversationId]
 * 標記訊息為已讀
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { conversationId } = await params
    const workspaceId = auth.data.workspaceId

    if (!conversationId) {
      return NextResponse.json({ error: '缺少對話 ID' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 標記該對話所有 user 發送的訊息為已讀
    const { error } = await supabase
      .from('line_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'user')
      .eq('workspace_id', workspaceId)

    if (error) {
      console.warn('標記已讀失敗:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 同時重置對話的未讀數
    const { error: updateConvError } = await supabase
      .from('line_conversations')
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)

    if (updateConvError) {
      console.warn('重置未讀數失敗:', updateConvError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API PATCH /api/line/messages/[conversationId] 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
