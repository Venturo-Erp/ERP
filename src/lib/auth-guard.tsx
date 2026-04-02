'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermissionForRoute } from '@/lib/permissions'
import { logger } from '@/lib/utils/logger'
import { LIB_LABELS } from './constants/labels'

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermission?: string
}

/**
 * 檢查 auth-token cookie 是否存在
 * 用於同步 middleware 的 token 清除操作
 */
function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith('auth-token='))
}

/**
 * 從 localStorage 直接讀取 auth-storage
 * 用於處理 Chrome 複製分頁時 Zustand 還沒 hydrate 的情況
 */
function getAuthFromLocalStorage(): { isAuthenticated: boolean; userId?: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return null
    const data = JSON.parse(stored)
    return {
      isAuthenticated: data?.state?.isAuthenticated ?? false,
      userId: data?.state?.user?.id,
    }
  } catch {
    return null
  }
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, _hasHydrated, isAuthenticated, logout, setUser } = useAuthStore()
  const redirectingRef = useRef(false) // 防止重複跳轉
  const [isRecovering, setIsRecovering] = useState(false)
  const recoveryAttemptedRef = useRef(false)

  // Chrome 複製分頁時，Zustand 可能沒有正確 hydrate
  // 這個 effect 會嘗試從 localStorage 恢復 user 資料
  useEffect(() => {
    if (recoveryAttemptedRef.current) return
    if (user?.id) return // 已經有 user，不需要恢復
    if (!hasAuthCookie()) return // 沒有 cookie，不可能恢復

    const localAuth = getAuthFromLocalStorage()
    if (!localAuth?.isAuthenticated || !localAuth?.userId) return

    // 嘗試從 localStorage 恢復完整的 user 資料
    recoveryAttemptedRef.current = true
    setIsRecovering(true)

    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) {
        const data = JSON.parse(stored)
        const storedUser = data?.state?.user
        if (storedUser?.id) {
          logger.log('🔄 從 localStorage 恢復 user 資料（Chrome 複製分頁）')
          setUser(storedUser)
        }
      }
    } catch (err) {
      logger.warn('⚠️ 恢復 user 資料失敗:', err)
    } finally {
      setIsRecovering(false)
    }
  }, [user?.id, setUser])

  // Token 過期同步：檢查 cookie 是否被 middleware 清除
  const syncTokenState = useCallback(() => {
    // 如果前端有登入狀態但 cookie 不存在，代表 token 已過期被 middleware 清除
    if (isAuthenticated && user?.id && !hasAuthCookie()) {
      logger.warn('🔐 Token 已過期（cookie 被清除），同步登出前端狀態')
      logout()
      return true // 返回 true 表示已處理
    }
    return false
  }, [isAuthenticated, user?.id, logout])

  useEffect(() => {
    const checkAuth = async () => {
      // 如果在登入頁面或 unauthorized 頁面，跳過檢查
      if (pathname === '/login' || pathname === '/unauthorized') {
        redirectingRef.current = false
        return
      }

      // 檢查 token 是否被 middleware 清除（優先檢查）
      if (syncTokenState()) {
        redirectingRef.current = true
        router.push('/login')
        return
      }

      // 如果已認證（剛登入或從 localStorage hydrate），檢查 auth-token cookie
      // 注意：不檢查 Supabase session，因為 Chrome 複製分頁時 cookie 會同步但
      // Supabase client 可能還沒初始化。如果 Supabase 操作失敗，會在具體操作時處理。
      if (isAuthenticated && user?.id) {
        // 只檢查 JWT cookie 是否存在（middleware 會驗證有效性）
        if (!hasAuthCookie()) {
          logger.warn('🔐 Auth cookie 不存在，登出')
          redirectingRef.current = true
          logout()
          router.push('/login?reason=session_expired')
          return
        }
        redirectingRef.current = false
        return
      }

      // 等待 Zustand 完成 hydration（只有未認證時才需要等待）
      if (!_hasHydrated) {
        return
      }

      // 防止重複跳轉
      if (redirectingRef.current) {
        return
      }

      logger.debug('AuthGuard 檢查', {
        hasUser: !!user,
        pathname,
        _hasHydrated,
        isAuthenticated,
      })

      // 1. 檢查 auth-store 的 user
      if (!user || !user.id) {
        // 沒有登入，跳轉到登入頁
        logger.warn('沒有 user，跳轉登入頁')
        redirectingRef.current = true
        router.push('/login')
        return
      }

      // 取得當前用戶的權限
      const permissions = user?.permissions || []

      // 2. 檢查指定權限
      if (requiredPermission) {
        const isAdmin = useAuthStore.getState().isAdmin
        const hasPermission =
          isAdmin ||
          permissions.some(p => p === requiredPermission || p.startsWith(`${requiredPermission}:`))

        if (!hasPermission) {
          logger.warn(`用戶無權限訪問 ${pathname}（需要 ${requiredPermission}）`)
          redirectingRef.current = true
          router.push('/unauthorized')
          return
        }
      }

      // 3. 檢查路由權限
      const storeIsAdmin = useAuthStore.getState().isAdmin
      const hasRoutePermission = hasPermissionForRoute(permissions, pathname, storeIsAdmin)
      if (!hasRoutePermission && pathname !== '/dashboard') {
        logger.warn(`用戶無權限訪問路由 ${pathname}`)
        redirectingRef.current = true
        router.push('/unauthorized')
        return
      }
    }

    checkAuth().catch(err => logger.error('[checkAuth]', err))
  }, [user, _hasHydrated, isAuthenticated, requiredPermission, pathname, router, syncTokenState])

  // 登入頁面不顯示載入畫面，直接渲染
  if (pathname === '/login') {
    return <>{children}</>
  }

  // 如果已認證，直接渲染（優先檢查，避免閃爍）
  if (isAuthenticated && user?.id) {
    return <>{children}</>
  }

  // 如果有 user（持久化的狀態），直接渲染
  if (user && user.id) {
    return <>{children}</>
  }

  // 如果正在恢復 user 資料，顯示載入畫面
  if (isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold/20 mx-auto mb-4"></div>
          <p className="text-morandi-secondary">{LIB_LABELS.LOADING_6912}</p>
        </div>
      </div>
    )
  }

  // 如果都沒有，顯示載入畫面（很快就會跳轉到登入頁）
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold/20 mx-auto mb-4"></div>
        <p className="text-morandi-secondary">{LIB_LABELS.LOADING_6912}</p>
      </div>
    </div>
  )
}

/**
 * 權限檢查 Hook
 */
export function usePermissionCheck(requiredRoute?: string) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const checkRoute = requiredRoute || pathname
  const storeIsAdmin = useAuthStore(state => state.isAdmin)
  const hasPermission = user ? hasPermissionForRoute(user.permissions || [], checkRoute, storeIsAdmin) : false

  return {
    hasPermission,
    userPermissions: user?.permissions || [],
    isAdmin: useAuthStore.getState().isAdmin,
  }
}
