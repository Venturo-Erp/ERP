/**
 * Workspace Helper Functions
 *
 * 提供與 workspace 相關的輔助函數
 */

import { useAuthStore } from '@/stores/auth-store'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { useWorkspaceStoreData } from '@/stores/workspace/workspace-store'
import type { Workspace } from '@/stores/workspace/types'
import { logger } from '@/lib/utils/logger'
import {
  canCrossWorkspace,
  canManageWorkspace as canManageWorkspaceByRole,
  type UserRole,
} from './rbac-config'

// 定義 Workspace 擴展型別（包含 code 欄位）
interface WorkspaceWithCode extends Workspace {
  code?: string
}

/**
 * 取得當前使用者的 workspace_id
 *
 * @returns workspace_id (UUID) 或 null（可跨 workspace 的角色）
 */
export function getCurrentWorkspaceId(): string | null {
  const { user } = useAuthStore.getState()

  if (!user) {
    return null
  }

  // 新系統：管理員可跨 workspace
  const { isAdmin } = useAuthStore.getState()
  if (isAdmin) {
    return null
  }

  // 從 employees 資料取得 workspace_id
  return user.workspace_id || null
}

// 快取 workspaces 資料（避免重複查詢）
let workspacesCache: WorkspaceWithCode[] | null = null
let workspacesCacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

/**
 * 取得當前使用者的 workspace code (TP, TC)
 *
 * 優先順序：
 * 1. user.workspace_code（登入時已取得，最可靠）
 * 2. 從 workspaces store 查詢（備用）
 * 3. 返回 null（拋錯由呼叫端處理）
 *
 * @returns workspace code 或 null
 */
export function getCurrentWorkspaceCode(): string | null {
  const { user } = useAuthStore.getState()

  if (!user) {
    logger.warn('[getCurrentWorkspaceCode] No user found')
    return null
  }

  // ✅ 優先使用登入時取得的 workspace_code（最可靠）
  if (user.workspace_code) {
    return user.workspace_code
  }

  // 新系統：管理員可跨 workspace，需要從前端選擇的 workspace 取得 code
  const { isAdmin } = useAuthStore.getState()
  if (isAdmin) {
    // Super Admin 需要從 workspaces store 取得
    const workspaceStore = useWorkspaceStoreData.getState()
    let workspaces = (workspaceStore.items || []) as WorkspaceWithCode[]

    // 如果 store 沒有資料，嘗試用快取
    if (
      workspaces.length === 0 &&
      workspacesCache &&
      Date.now() - workspacesCacheTime < CACHE_TTL
    ) {
      workspaces = workspacesCache
    }

    // 如果仍然沒有資料，返回 null（由呼叫端負責確保 workspaces 已載入）
    // 注意：這是同步函數，無法等待 fetchAll 完成
    // 呼叫端應該在 useEffect 中先呼叫 workspaceStore.fetchAll()
    if (workspaces.length === 0) {
      logger.warn(
        '[getCurrentWorkspaceCode] Super Admin: workspaces not loaded yet, please ensure fetchAll() is called first'
      )
      return null
    }

    // 更新快取
    workspacesCache = workspaces
    workspacesCacheTime = Date.now()

    // 如果有選擇的 workspace，從 store 取得
    const selectedWorkspaceId = user.selected_workspace_id
    if (selectedWorkspaceId) {
      const workspace = workspaces.find((w: WorkspaceWithCode) => w.id === selectedWorkspaceId)
      if (workspace) {
        return workspace.code || workspace.name.substring(0, 2).toUpperCase()
      }
    }

    // 沒有選擇 workspace 時，使用第一個 workspace
    if (workspaces.length > 0) {
      const defaultWorkspace = workspaces[0]
      return defaultWorkspace.code || defaultWorkspace.name.substring(0, 2).toUpperCase()
    }

    return null
  }

  // 一般使用者：user.workspace_code 應該已經有值
  // 如果沒有，可能是舊的登入 session，需要重新登入
  logger.warn('[getCurrentWorkspaceCode] User has no workspace_code, please re-login')
  return null
}

/**
 * 取得當前使用者的 workspace 完整資訊
 *
 * @returns workspace 物件或 null
 */
export function getCurrentWorkspace() {
  const { user } = useAuthStore.getState()
  const workspaceStore = useWorkspaceStoreData.getState()
  const workspaces = (workspaceStore.items || []) as WorkspaceWithCode[]

  if (!user) {
    return null
  }

  // 檢查 workspaces 是否已載入
  if (workspaces.length === 0) {
    logger.warn(
      '[getCurrentWorkspace] Workspaces not loaded yet, please ensure fetchAll() is called first'
    )
    return null
  }

  // 新系統：管理員可跨 workspace，從選擇的 workspace 取得
  const { isAdmin } = useAuthStore.getState()
  if (isAdmin) {
    const selectedWorkspaceId = user.selected_workspace_id
    if (selectedWorkspaceId) {
      return workspaces.find((w: WorkspaceWithCode) => w.id === selectedWorkspaceId) || null
    }
    return null
  }

  // 一般使用者從自己的 workspace_id 取得
  const workspaceId = user.workspace_id
  if (!workspaceId) {
    return null
  }

  return workspaces.find((w: WorkspaceWithCode) => w.id === workspaceId) || null
}

/**
 * 檢查當前使用者是否為管理員
 * 新系統：直接使用 store.isAdmin
 *
 * @returns boolean
 */
export function isSuperAdmin(): boolean {
  const { isAdmin } = useAuthStore.getState()
  return isAdmin
}

/**
 * 檢查當前使用者是否為 admin（包含 super_admin）
 * 新系統：直接使用 store.isAdmin
 *
 * @returns boolean
 */
export function isAdminUser(): boolean {
  const { isAdmin } = useAuthStore.getState()
  return isAdmin
}

/**
 * 檢查當前使用者是否可以管理指定的 workspace
 *
 * @param targetWorkspaceId - 目標 workspace ID
 * @returns boolean
 */
export function canManageWorkspace(targetWorkspaceId: string): boolean {
  const { user } = useAuthStore.getState()

  if (!user) {
    return false
  }

  // 新系統：使用 isAdmin 判斷
  const { isAdmin } = useAuthStore.getState()

  // 管理員可以管理 workspace
  if (!isAdmin) {
    return false
  }

  // 檢查是否能管理目標 workspace
  // isAdmin = true 代表有管理權限，可以管理自己的 workspace
  return user.workspace_id === targetWorkspaceId || isAdmin
}

/**
 * 取得當前 workspace 的公司名稱
 *
 * @returns 公司名稱或空字串
 */
export function getWorkspaceCompanyName(): string {
  const { user } = useAuthStore.getState()
  return user?.workspace_name || ''
}

/**
 * 取得當前 workspace 的年度標語 (e.g., "角落旅行社 2026" 或 "大地旅遊 2026")
 *
 * @returns 標語字串
 */
export function getWorkspaceTagline(): string {
  const name = getWorkspaceCompanyName()
  const year = new Date().getFullYear()
  return name ? `${name} ${year}` : String(year)
}

/**
 * 取得所有可用的 workspaces（根據權限）
 *
 * @returns workspace 陣列
 */
export function getAvailableWorkspaces() {
  const { user } = useAuthStore.getState()
  const workspaceStore = useWorkspaceStoreData.getState()
  const workspaces = (workspaceStore.items || []) as WorkspaceWithCode[]

  if (!user) {
    return []
  }

  // 新系統：使用 isAdmin 判斷
  const { isAdmin } = useAuthStore.getState()

  // 管理員可以看到所有 workspaces
  if (isAdmin) {
    return workspaces
  }

  // 一般使用者只能看到自己的 workspace
  const workspaceId = user.workspace_id
  if (!workspaceId) {
    return []
  }

  return workspaces.filter((w: WorkspaceWithCode) => w.id === workspaceId)
}
