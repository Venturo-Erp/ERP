/**
 * Messages 資料存取層 (Data Access Layer)
 *
 * 客戶端資料存取函式，用於 Chat 相關的即時訊息查詢。
 * 將查詢邏輯從 Hooks 中抽離，實現關注點分離。
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Message } from '@/stores/workspace/types'

// ============================================
// 型別定義
// ============================================

export interface GetChannelMessagesParams {
  channelId: string
  limit?: number
}

export interface MessageWithAuthor extends Message {
  author?: {
    id: string
    display_name: string
  }
}

// ============================================
// 查詢函式（客戶端）
// ============================================

/**
 * 取得頻道最新訊息（帶作者資訊）
 *
 * 預設取得最新 50 筆，並以升序返回（舊訊息在前）
 */
export async function getChannelMessages({
  channelId,
  limit = 50,
}: GetChannelMessagesParams): Promise<MessageWithAuthor[]> {
  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('messages')
    .select(
      `
      *,
      author:employees ( id, display_name )
    `
    )
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Error fetching messages:', error)
    return []
  }

  // 反轉為升序（舊訊息在上，新訊息在下）
  return ((data as unknown as MessageWithAuthor[]) || []).reverse()
}

/**
 * 取得頻道訊息（簡易版，不含作者資訊）
 */
export async function getChannelMessagesSimple({
  channelId,
  limit = 50,
}: GetChannelMessagesParams): Promise<Message[]> {
  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('messages')
    .select('id, channel_id, content, author, attachments, metadata, parent_message_id, reply_count, is_pinned, reactions, workspace_id, created_at, created_by, updated_at')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Error fetching messages:', error)
    return []
  }

  // 反轉為升序
  return ((data as unknown as Message[]) || []).reverse()
}

/**
 * 取得作者資訊
 */
export async function getMessageAuthor(
  authorId: string
): Promise<{ id: string; display_name: string } | null> {
  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('employees')
    .select('id, display_name')
    .eq('id', authorId)
    .single()

  if (error) {
    logger.error('Error fetching author:', error)
    return null
  }

  return {
    id: data.id,
    display_name: data.display_name || 'Unknown User',
  }
}
