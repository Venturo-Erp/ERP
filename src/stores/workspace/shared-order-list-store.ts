/**
 * Shared Order List Store (使用 createStore)
 * 管理 shared_order_lists 表格資料
 * 自動繼承快取優先、Realtime 同步等功能
 */

import { createStore } from '../core/create-store'
import type { SharedOrderList } from './types'
import type { BaseEntity } from '@/types'

/**
 * Shared Order List 擴展型別（符合 BaseEntity）
 */
type SharedOrderListEntity = SharedOrderList & Pick<BaseEntity, 'updated_at'>

/**
 * Shared Order List Store
 * 表格: shared_order_lists
 * 快取策略: 時間範圍快取 (最近 3 個月)
 *
 * 原因：
 * - 共享訂單清單會隨時間累積
 * - 通常只需要查看最近的共享
 * - 歷史共享可以按需載入
 */
export const useSharedOrderListStore = createStore<SharedOrderListEntity>({
  tableName: 'shared_order_lists',
  // ⚠️ 2026-01-17: 移除 workspaceScoped，因為 shared_order_lists 表沒有 workspace_id 欄位
})

/**
 * Hook 型別（方便使用）
 */
type SharedOrderListStoreType = ReturnType<typeof useSharedOrderListStore>
