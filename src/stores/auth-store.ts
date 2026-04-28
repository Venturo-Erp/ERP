import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EmployeeFull } from './types'
import { logger } from '@/lib/utils/logger'
import type { UserRole } from '@/lib/rbac-config'
import type { Database } from '@/lib/supabase/types'
import { ensureAuthSync, resetAuthSyncState } from '@/lib/auth/auth-sync'

type EmployeeRow = Database['public']['Tables']['employees']['Row']

interface WorkspaceInfo {
  code?: string
  name?: string
  type?: EmployeeFull['workspace_type']
}

/**
 * 從 EmployeeRow + workspace 資訊 構建全站用 EmployeeFull
 * 權限決策統一從 role_tab_permissions 拿資格清單
 */
function buildUserFromEmployee(
  employeeData: EmployeeRow,
  workspaceInfo: WorkspaceInfo,
  options?: { mustChangePassword?: boolean; rolePermissions?: string[] }
): EmployeeFull {
  const userRoles = (employeeData.roles || []) as UserRole[]
  const mergedPermissions = options?.rolePermissions || []

  return {
    id: employeeData.id,
    employee_number: employeeData.employee_number,
    english_name: employeeData.english_name ?? '',
    display_name: employeeData.display_name ?? '',
    chinese_name: employeeData.chinese_name ?? employeeData.display_name ?? '',
    personal_info: (employeeData.personal_info ?? {}) as unknown as EmployeeFull['personal_info'],
    job_info: (employeeData.job_info ?? {}) as unknown as EmployeeFull['job_info'],
    salary_info: (employeeData.salary_info ?? {}) as unknown as EmployeeFull['salary_info'],
    permissions: mergedPermissions,
    roles: userRoles as EmployeeFull['roles'],
    attendance: (employeeData.attendance ?? {
      leave_records: [],
      overtime_records: [],
    }) as unknown as EmployeeFull['attendance'],
    contracts: (employeeData.contracts ?? []) as unknown as EmployeeFull['contracts'],
    status: employeeData.status as EmployeeFull['status'],
    workspace_id: employeeData.workspace_id ?? undefined,
    workspace_code: workspaceInfo.code,
    workspace_name: workspaceInfo.name,
    workspace_type: workspaceInfo.type,
    avatar: employeeData.avatar_url ?? undefined,
    must_change_password: options?.mustChangePassword,
    created_at: employeeData.created_at ?? new Date().toISOString(),
    updated_at: employeeData.updated_at ?? new Date().toISOString(),
  }
}

interface AuthState {
  user: EmployeeFull | null
  isAuthenticated: boolean
  isAdmin: boolean // Added isAdmin flag
  sidebarCollapsed: boolean
  _hasHydrated: boolean

  // Methods
  setUser: (user: EmployeeFull | null, isAdmin?: boolean) => void
  logout: () => void
  validateLogin: (
    username: string,
    password: string,
    code?: string
  ) => Promise<{ success: boolean; message?: string; needsSetup?: boolean; mustChangePassword?: boolean }>
  refreshUserData: () => Promise<void>
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false, // Initial state
      sidebarCollapsed: true,
      _hasHydrated: false,

      setUser: (user, adminFlag?: boolean) => {
        const isAuthenticated = !!user
        const isAdmin = adminFlag ?? get().isAdmin ?? false
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

        // 呼叫 server API 清除 httpOnly cookie
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
          logger.log('✅ Server-side auth cookie cleared')
        } catch (error) {
          logger.warn('⚠️ Server logout failed:', error)
        }

        // 重置 Auth 同步狀態
        resetAuthSyncState()

        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        })
      },

      validateLogin: async (username, password, code) => {
        try {
          if (!code) {
            return { success: false, message: '請輸入辦公室或廠商代號' }
          }

          logger.log(`🔐 登入中: ${username}@${code}`)

          const { supabase } = await import('@/lib/supabase/client')

          // 1. 呼叫 validate-login 驗證密碼、取回 employee + workspace + permissions + auth email
          const validateResponse = await fetch('/api/auth/validate-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, code }),
          })
          const validateResult = await validateResponse.json()

          if (!validateResult.success) {
            const errMsg = validateResult.error || validateResult.message
            logger.warn(`⚠️ 登入驗證失敗: ${errMsg}`)
            return { success: false, message: errMsg || '帳號或密碼錯誤' }
          }

          const { employee, workspace, authEmail, permissions, isAdmin, mustChangePassword } =
            validateResult.data as {
              employee: EmployeeRow
              workspace: { id: string; code: string; name: string | null; type: string | null }
              authEmail: string
              permissions: string[]
              isAdmin: boolean
              mustChangePassword: boolean
            }

          // 2. 用 auth email 在 client 建立 Supabase session
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })

          if (authError || !authData) {
            logger.warn(`⚠️ Supabase Auth 登入失敗: ${authError?.message}`)
            return { success: false, message: '帳號或密碼錯誤' }
          }

          // 3. 確保 Auth 同步（處理 RLS 所需的 supabase_user_id）
          await ensureAuthSync({
            employeeId: employee.id,
            workspaceId: employee.workspace_id ?? undefined,
          })

          // 4. 構建 EmployeeFull
          const user = buildUserFromEmployee(
            employee,
            {
              code: workspace.code,
              name: workspace.name ?? undefined,
              type: (workspace.type as EmployeeFull['workspace_type']) ?? undefined,
            },
            { rolePermissions: permissions }
          )

          get().setUser(user, isAdmin)
          logger.log(`✅ 登入成功: ${employee.display_name} (admin: ${isAdmin})`)
          return { success: true, mustChangePassword: mustChangePassword === true }
        } catch (error) {
          logger.error('💥 Login validation error:', error)
          return { success: false, message: '系統錯誤，請稍後再試' }
        }
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
            .select(
              'id, employee_number, display_name, english_name, email, avatar_url, status, workspace_id, job_info, created_at, updated_at'
            )
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

          // 保留現有 workspace 資訊（workspace 本身極少變、登入時已寫入）
          // 保留現有權限（從登入時的 JWT 取得、refreshUserData 不重算）
          const updatedUser = buildUserFromEmployee(
            employeeData,
            {
              code: currentUser.workspace_code,
              name: currentUser.workspace_name,
              type: currentUser.workspace_type,
            },
            { rolePermissions: currentUser.permissions }
          )
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
