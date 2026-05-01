/**
 * useRequireAuth - 統一的登入狀態檢查 Hook
 *
 * 用途：
 * - 集中管理登入檢查邏輯
 * - 統一處理 workspace_id 缺失問題
 * - 避免各組件重複寫 if (!user) 檢查
 *
 * 使用範例：
 * ```typescript
 * const auth = useRequireAuth()
 *
 * const handleAdd = async () => {
 *   if (!auth.isAuthenticated) {
 *     auth.showLoginRequired()
 *     return
 *   }
 *
 *   // 使用 auth.user 和 auth.workspaceId
 *   await createItem({
 *     created_by: auth.user.id,
 *     workspace_id: auth.workspaceId
 *   })
 * }
 * ```
 */

import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { EmployeeFull } from '@/stores/types'
import { alert } from '@/lib/ui/alert-dialog'

interface AuthInfo {
  isAuthenticated: boolean
  user: EmployeeFull | null
  workspaceId: string | null
  showLoginRequired: (message?: string) => void
  showWorkspaceMissing: (message?: string) => void
}

function useRequireAuth(): AuthInfo {
  // ✅ 使用 React hook 方式（支援自動重新渲染）
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const workspaceId = user?.workspace_id || null

  const showLoginRequired = (message = '請先登入') => {
    logger.error('❌ 使用者未登入')
    void alert(message, 'warning')
  }

  const showWorkspaceMissing = (message = '無法取得工作空間資訊，請重新登入') => {
    logger.error('❌ 使用者缺少 workspace_id:', { user })
    void alert(message, 'error')
  }

  return {
    isAuthenticated,
    user,
    workspaceId,
    showLoginRequired,
    showWorkspaceMissing,
  }
}

/**
 * useRequireAuthSync - 同步版本（用於事件處理函數中）
 *
 * 使用時機：
 * - onClick/onSubmit 等事件處理函數
 * - 需要最新狀態，避免 closure 問題
 *
 * 使用範例：
 * ```typescript
 * const handleAdd = async () => {
 *   const auth = useRequireAuthSync()
 *
 *   if (!auth.isAuthenticated) {
 *     auth.showLoginRequired()
 *     return
 *   }
 *
 *   // ...
 * }
 * ```
 */
export function useRequireAuthSync(): AuthInfo {
  // ✅ 使用 getState() 同步取得最新狀態（避免 hydration timing 問題）
  const { user, isAuthenticated } = useAuthStore.getState()
  const workspaceId = user?.workspace_id || null

  const showLoginRequired = (message = '請先登入') => {
    logger.error('❌ 使用者未登入')
    void alert(message, 'warning')
  }

  const showWorkspaceMissing = (message = '無法取得工作空間資訊，請重新登入') => {
    logger.error('❌ 使用者缺少 workspace_id:', { user })
    void alert(message, 'error')
  }

  return {
    isAuthenticated,
    user,
    workspaceId,
    showLoginRequired,
    showWorkspaceMissing,
  }
}
