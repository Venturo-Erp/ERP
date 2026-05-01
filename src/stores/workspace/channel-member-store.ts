/**
 * Channel Member Store (使用 createStore)
 * 管理 channel_members 表格資料
 * 自動繼承快取優先、Realtime 同步等功能
 *
 * 注意：
 * - 實際使用時通常透過 API endpoint 查詢（包含 profile 資訊）
 * - 這個 Store 主要用於快取和離線支援
 */

import { createStore } from '../core/create-store'
import type { BaseEntity } from '@/types'

/**
 * Channel Member 基礎型別（對應 Supabase 表格）
 */
interface ChannelMemberBase {
  id: string
  workspace_id: string
  channel_id: string
  employee_id: string
  role: string
  status: string
  invited_at?: string | null
  joined_at?: string | null
  last_seen_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Channel Member Store
 * 表格: channel_members
 * 快取策略: 全量快取 (數量不多，經常使用)
 * 注意：channel_members 不使用 code 欄位
 */
export const useChannelMemberStore = createStore<ChannelMemberBase & BaseEntity>(
  'channel_members',
  undefined,
  true
)

/**
 * Hook 型別（方便使用）
 */
type ChannelMemberStoreType = ReturnType<typeof useChannelMemberStore>
