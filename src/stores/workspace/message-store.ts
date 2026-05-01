/**
 * Message Store (使用 createStore)
 * 管理 messages 表格資料
 * 自動繼承快取優先、Realtime 同步等功能
 */

import { createStore } from '../core/create-store'
import type { Message } from './types'
import type { BaseEntity } from '@/types'

/**
 * Message 擴展型別（符合 BaseEntity）
 */
type MessageEntity = Omit<Message, 'edited_at'> &
  Pick<BaseEntity, 'updated_at'> & {
    edited_at?: string
  }

/**
 * Message Store
 * 表格: messages
 * 快取策略: 時間範圍快取 (最近 1000 則訊息)
 *
 * 原因：
 * - 聊天訊息會不斷增長
 * - 通常只需要查看最近的訊息
 * - 歷史訊息可以按需載入
 */
export const useMessageStore = createStore<MessageEntity>({
  tableName: 'messages',
  workspaceScoped: true, // 🔒 2026-01-12: 啟用 Workspace 隔離
})

/**
 * Hook 型別（方便使用）
 */
type MessageStoreType = ReturnType<typeof useMessageStore>
