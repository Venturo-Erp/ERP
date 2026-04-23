/**
 * Workspace 篩選工具
 * 用於 admin 切換查看特定 workspace 的資料
 */

import type { UserRole } from './rbac-config'
import { logger } from '@/lib/utils/logger'

/**
 * 取得當前選擇的 workspace ID（如果有的話）
 * @returns workspace ID 或 null（表示查看全部）
 */
export function getCurrentWorkspaceFilter(): string | null {
  if (typeof window === 'undefined') return null

  const workspaceId = localStorage.getItem('current_workspace_filter')
  return workspaceId || null
}

/**
 * 設定 workspace 篩選
 * @param workspaceId - workspace ID 或 null（查看全部）
 */
export function setCurrentWorkspaceFilter(workspaceId: string | null): void {
  if (typeof window === 'undefined') return

  if (workspaceId) {
    localStorage.setItem('current_workspace_filter', workspaceId)
  } else {
    localStorage.removeItem('current_workspace_filter')
  }
}

/**
 * 檢查資料表是否有 workspace_id 欄位
 *
 * ⚠️ 注意：workspace_permissions 表格不存在，已移除
 */
const WORKSPACE_ENABLED_TABLES = [
  'body_measurements',
  'bulletins',
  // 'calendar_events',  // ⚠️ 暫時停用：會導致行事曆資料消失
  'channel_groups',
  'channel_members',
  'channels',
  'confirmations',
  'customers',
  'disbursement_orders',
  'employees',
  'esims',
  // fitness_goals removed
  'itineraries',
  'linkpay_logs',
  'messages',
  'orders',
  'payment_requests',
  'payments',
  'personal_canvases',
  'personal_records',
  'progress_photos',
  'quotes',
  'receipts',
  'rich_documents',
  // 'todos',  // ⚠️ 暫時停用：會導致待辦事項消失
  'tours',
  'workout_sessions',
]

/**
 * 檢查表格是否支援 workspace 篩選
 */
export function isWorkspaceFilterEnabled(tableName: string): boolean {
  return WORKSPACE_ENABLED_TABLES.includes(tableName)
}

/**
 * 取得 Supabase 查詢的 workspace 篩選條件
 *
 * @param tableName - 表格名稱
 * @returns workspace_id 或 null（不篩選）
 */
export async function getWorkspaceFilterForQuery(tableName: string): Promise<string | null> {
  // 檢查表格是否支援 workspace 篩選
  if (!isWorkspaceFilterEnabled(tableName)) {
    return null
  }

  // 🔐 安全性修復：一般使用者自動使用自己的 workspace_id
  // 只有具有跨 workspace 權限的角色可以透過 localStorage 手動切換 workspace
  try {
    // 動態引入避免循環依賴
    const { useAuthStore } = await import('@/stores/auth-store')
    const user = useAuthStore.getState().user

    if (!user) {
      return null // 未登入，不篩選
    }

    // 跨 workspace 功能已停用
    // 所有用戶（包括系統主管）都只能看到自己 workspace 的資料

    // ✅ 一般使用者：強制使用自己的 workspace_id（不可切換）
    return user.workspace_id || null
  } catch (error) {
    logger.warn('⚠️ getWorkspaceFilterForQuery 取得 user 失敗:', error)
    return null
  }
}
