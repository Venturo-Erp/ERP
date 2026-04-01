/**
 * Workspace Context 工具
 * 提供可靠的 workspace_id 取得機制
 *
 * 問題背景：
 * Store factory 的 workspaceScoped 機制依賴 getCurrentWorkspaceId()，
 * 但這個函數從 localStorage 讀取，可能返回 null，導致 RLS 失敗。
 *
 * 解決方案：
 * 1. 提供 getRequiredWorkspaceId() - 必須有值，否則拋錯
 * 2. 提供 getWorkspaceId() - 可能為 null，用於非必要場景
 * 3. 在 React 組件中使用 useWorkspaceId() hook
 */

import { useAuthStore } from '@/stores/auth-store'

/**
 * 從 auth store 取得 workspace_id（非 React 環境）
 * 直接讀取 Zustand store state
 */
export function getWorkspaceId(): string | null {
  const user = useAuthStore.getState().user
  return user?.workspace_id || null
}

/**
 * 取得必要的 workspace_id，如果沒有則拋出錯誤
 * 用於所有 RLS 需要 workspace_id 的操作
 */
export function getRequiredWorkspaceId(): string {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error('無法取得 workspace_id，請重新登入')
  }
  return workspaceId
}

/**
 * React Hook：取得當前 workspace_id
 * 用於 React 組件中
 */
export function useWorkspaceId(): string | null {
  const user = useAuthStore(state => state.user)
  return user?.workspace_id || null
}

/**
 * React Hook：取得必要的 workspace_id
 * 如果沒有值會拋出錯誤（應該在有 auth guard 的頁面使用）
 */
export function useRequiredWorkspaceId(): string {
  const workspaceId = useWorkspaceId()
  if (!workspaceId) {
    throw new Error('無法取得 workspace_id，請重新登入')
  }
  return workspaceId
}

/**
 * 為 create 操作注入 workspace_id
 * 用於確保所有 RLS 操作都有正確的 workspace_id
 */
export function withWorkspaceId<T extends Record<string, unknown>>(
  data: T
): T & { workspace_id: string } {
  const workspaceId = getRequiredWorkspaceId()
  return {
    ...data,
    workspace_id: workspaceId,
  }
}

// ============================================
// 跨 Workspace 設定（Super Admin 專用）
// ============================================

const CROSS_WORKSPACE_KEY = 'admin_cross_workspace_enabled'

/**
 * 取得跨 workspace 模式狀態
 * 預設為 false（只看自己 workspace）
 */
export function getCrossWorkspaceEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(CROSS_WORKSPACE_KEY) === 'true'
}

/**
 * 設定跨 workspace 模式
 */
export function setCrossWorkspaceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return

  if (enabled) {
    localStorage.setItem(CROSS_WORKSPACE_KEY, 'true')
  } else {
    localStorage.removeItem(CROSS_WORKSPACE_KEY)
  }
}

/**
 * 檢查是否應該跨 workspace 查詢
 * 只有 admin 且明確開啟跨 workspace 模式才返回 true
 */
export function shouldCrossWorkspace(isAdmin: boolean): boolean {
  return isAdmin && getCrossWorkspaceEnabled()
}
