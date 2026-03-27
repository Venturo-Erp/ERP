import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from './types'
import { generateToken, type AuthPayload } from '@/lib/auth'
import { logger } from '@/lib/utils/logger'
import { getRoleConfig, type UserRole } from '@/lib/rbac-config'
import type { Database } from '@/lib/supabase/types'
import { ensureAuthSync, resetAuthSyncState } from '@/lib/auth/auth-sync'

/**
 * Supabase Employee Row 類型
 * 直接從 Database 類型推斷，確保與資料庫結構一致
 */
type EmployeeRow = Database['public']['Tables']['employees']['Row']

/**
 * 根據員工的角色，合併角色預設權限和資料庫中的額外權限
 * 這確保了當 rbac-config.ts 更新時，員工會自動獲得新的權限
 */
function mergePermissionsWithRoles(dbPermissions: string[], roles: UserRole[]): string[] {
  const allPermissions = new Set<string>(dbPermissions)

  // 合併所有角色的預設權限
  roles.forEach(role => {
    const roleConfig = getRoleConfig(role)
    if (roleConfig) {
      if (roleConfig.permissions.includes('*')) {
        allPermissions.add('*')
      } else {
        roleConfig.permissions.forEach(p => allPermissions.add(p))
      }
    }
  })

  return Array.from(allPermissions)
}

/**
 * 查詢 workspace 資訊
 * @param workspaceId - Workspace ID
 * @returns Workspace 資訊 (code, name, type)
 */
async function fetchWorkspaceInfo(
  workspaceId: string | null | undefined
): Promise<{ code?: string; name?: string; type?: User['workspace_type'] }> {
  if (!workspaceId) return {}

  try {
    const { supabase } = await import('@/lib/supabase/client')
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('code, name, type')
      .eq('id', workspaceId)
      .single()

    if (workspace) {
      return {
        code: workspace.code || workspace.name?.substring(0, 2).toUpperCase(),
        name: workspace.name || undefined,
        type: (workspace.type as User['workspace_type']) || undefined,
      }
    }
  } catch (wsError) {
    logger.warn('⚠️ Failed to fetch workspace info:', wsError)
  }
  return {}
}

/**
 * 從 EmployeeRow 構建 User 物件
 * @param employeeData - 員工資料
 * @param workspaceInfo - Workspace 資訊
 * @param options - 額外選項
 */
function buildUserFromEmployee(
  employeeData: EmployeeRow,
  workspaceInfo: { code?: string; name?: string; type?: User['workspace_type'] },
  options?: { mustChangePassword?: boolean }
): User {
  const userRoles = (employeeData.roles || []) as UserRole[]
  const mergedPermissions = mergePermissionsWithRoles(employeeData.permissions || [], userRoles)

  return {
    id: employeeData.id,
    employee_number: employeeData.employee_number,
    english_name: employeeData.english_name ?? '',
    display_name: employeeData.display_name ?? '',
    chinese_name: employeeData.chinese_name ?? employeeData.display_name ?? '',
    personal_info: (employeeData.personal_info ?? {}) as User['personal_info'],
    job_info: (employeeData.job_info ?? {}) as User['job_info'],
    salary_info: (employeeData.salary_info ?? {}) as User['salary_info'],
    permissions: mergedPermissions,
    roles: userRoles as User['roles'],
    attendance: (employeeData.attendance ?? {
      leave_records: [],
      overtime_records: [],
    }) as User['attendance'],
    contracts: (employeeData.contracts ?? []) as User['contracts'],
    status: employeeData.status as User['status'],
    workspace_id: employeeData.workspace_id ?? undefined,
    workspace_code: workspaceInfo.code,
    workspace_name: workspaceInfo.name,
    workspace_type: workspaceInfo.type,
    avatar: employeeData.avatar_url ?? employeeData.avatar ?? undefined,
    must_change_password: options?.mustChangePassword,
    created_at: employeeData.created_at ?? new Date().toISOString(),
    updated_at: employeeData.updated_at ?? new Date().toISOString(),
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean // Added isAdmin flag
  sidebarCollapsed: boolean
  _hasHydrated: boolean

  // Methods
  setUser: (user: User | null) => void
  logout: () => void
  validateLogin: (
    username: string,
    password: string,
    workspaceId?: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string; needsSetup?: boolean }>
  refreshUserData: () => Promise<void>
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  checkPermission: (permission: string) => boolean
  setHasHydrated: (hasHydrated: boolean) => void
}

function setSecureCookie(token: string, _rememberMe: boolean = false): void {
  const maxAge = 30 * 24 * 60 * 60 // 30 days — 登入後不應該頻繁要求重新登入
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'Secure; ' : ''

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    document.cookie = `auth-token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
  } else if (typeof window !== 'undefined') {
    document.cookie = `auth-token=${token}; path=/; max-age=${maxAge}; SameSite=Strict; ${secure}`
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false, // Initial state
      sidebarCollapsed: true,
      _hasHydrated: false,

      setUser: user => {
        const isAuthenticated = !!user
        const isAdmin =
          isAuthenticated && (user.permissions.includes('admin') || user.permissions.includes('*'))
        set({ user, isAuthenticated, isAdmin })
      },

      logout: async () => {
        try {
          const { supabase } = await import('@/lib/supabase/client')
          await supabase.auth.signOut()
          logger.log('✅ Supabase Auth session logged out')
        } catch (error) {
          logger.warn('⚠️ Supabase Auth logout failed:', error)
        }

        // 重置 Auth 同步狀態
        resetAuthSyncState()

        if (typeof window !== 'undefined') {
          if (window.location.hostname === 'localhost') {
            document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax'
          } else {
            document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Strict; Secure'
          }
        }

        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        })
      },

      validateLogin: async (
        username: string,
        password: string,
        code?: string,
        rememberMe: boolean = true
      ) => {
        try {
          if (!code) {
            return { success: false, message: '請輸入辦公室或廠商代號' }
          }

          logger.log(`🔐 登入中: ${username}@${code}`)

          const { supabase } = await import('@/lib/supabase/client')

          // 1. 呼叫 validate-login 驗證密碼並取得真實 auth email
          const validateResponse = await fetch('/api/auth/validate-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, code }),
          })

          const validateResult = await validateResponse.json()

          if (!validateResult.success) {
            logger.warn(`⚠️ 登入驗證失敗: ${validateResult.message}`)
            return {
              success: false,
              message: validateResult.message || '帳號或密碼錯誤',
            }
          }

          // 2. 用真實 auth email 建立客戶端 Supabase session
          const authEmail = (validateResult.data?.authEmail ?? validateResult.authEmail) as string
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })

          if (authError || !authData) {
            logger.warn(`⚠️ Supabase Auth 登入失敗: ${authError?.message}`)
            return {
              success: false,
              message: '帳號或密碼錯誤',
            }
          }

          const employeeData = (validateResult.data?.employee ??
            validateResult.employee) as EmployeeRow

          // 3. 確保 Auth 同步（處理 RLS 所需的 supabase_user_id）
          await ensureAuthSync({
            employeeId: employeeData.id,
            workspaceId: employeeData.workspace_id ?? undefined,
          })

          // 4. 查詢 workspace 資訊並構建 User 物件
          const workspaceInfo = await fetchWorkspaceInfo(employeeData.workspace_id)

          const user = buildUserFromEmployee(employeeData, workspaceInfo)

          // 5. 使用 API 回傳的 JWT（server-side 簽名）
          const jwt = (validateResult.data?.jwt ?? validateResult.jwt) as string
          if (jwt) {
            setSecureCookie(jwt, rememberMe)
          } else {
            // fallback: 舊格式（向下相容，待移除）
            const userRoles = (employeeData.roles || []) as UserRole[]
            const mergedPermissions = mergePermissionsWithRoles(
              employeeData.permissions || [],
              userRoles
            )
            const authPayload: AuthPayload = {
              id: employeeData.id,
              employee_number: employeeData.employee_number,
              permissions: mergedPermissions,
              role:
                mergedPermissions.includes('admin') || mergedPermissions.includes('*')
                  ? 'admin'
                  : 'employee',
            }
            const token = generateToken(authPayload, rememberMe)
            setSecureCookie(token, rememberMe)
          }

          get().setUser(user)

          logger.log(`✅ 登入成功: ${employeeData.display_name}`)

          return { success: true }
        } catch (error) {
          logger.error('💥 Login validation error:', error)
          return { success: false, message: '系統錯誤，請稍後再試' }
        }
      },

      checkPermission: (permission: string) => {
        const user = get().user
        if (!user) return false
        // Updated to use the new isAdmin flag for simplicity
        return get().isAdmin || user.permissions.includes(permission)
      },

      refreshUserData: async () => {
        const currentUser = get().user
        if (!currentUser?.id) return

        try {
          const { supabase } = await import('@/lib/supabase/client')

          // 使用 maybeSingle() 而不是 single()，避免 RLS 返回 0 筆時拋錯
          // 這可能發生在 supabase_user_id 還沒同步時
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle()

          if (error || !data) {
            // RLS 查詢失敗或無資料，靜默使用 localStorage 快取
            return
          }

          const employeeData = data as EmployeeRow

          // 如果帳號已停用，自動登出
          if (employeeData.status === 'terminated') {
            get().logout()
            return
          }

          // 查詢 workspace 資訊，失敗則保留原有值
          const fetchedWorkspaceInfo = await fetchWorkspaceInfo(employeeData.workspace_id)
          const workspaceInfo = {
            code: fetchedWorkspaceInfo.code || currentUser.workspace_code,
            name: fetchedWorkspaceInfo.name || currentUser.workspace_name,
            type: fetchedWorkspaceInfo.type || currentUser.workspace_type,
          }

          const updatedUser = buildUserFromEmployee(employeeData, workspaceInfo)
          get().setUser(updatedUser)
        } catch (error) {
          logger.error('💥 Error refreshing user data:', error)
        }
      },

      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      setHasHydrated: hasHydrated => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-storage',
      skipHydration: true,
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin, // Persist isAdmin
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state._hasHydrated = true
          // Session 恢復時，確保 Auth 同步
          if (state.isAuthenticated && state.user) {
            ensureAuthSync().catch(err => {
              logger.warn('⚠️ Auth sync on rehydrate failed:', err)
            })
          }
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  // Zustand persist 的 rehydrate 方法類型定義缺失，使用 type assertion
  type StoreWithPersist = typeof useAuthStore & {
    persist: { rehydrate: () => void }
  }
  ;(useAuthStore as StoreWithPersist).persist.rehydrate()
}
