'use client'

/**
 * 模組權限守衛
 * 檢查當前路由是否有權限，沒有就導向 /unauthorized
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { ModuleLoading } from '@/components/module-loading'

interface ModuleGuardProps {
  children: React.ReactNode
}

// 不需要檢查權限的路由
const PUBLIC_ROUTES = ['/login', '/unauthorized', '/public']

// 總是允許的路由（基本功能）
const ALWAYS_ALLOWED = ['/dashboard', '/settings']

export function ModuleGuard({ children }: ModuleGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { isRouteAvailable, loading, features } = useWorkspaceFeatures()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (loading) return

    // 公開路由不檢查
    if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
      setChecked(true)
      return
    }

    // 基本路由永遠可以進
    if (pathname === '/' || ALWAYS_ALLOWED.some(r => pathname.startsWith(r))) {
      setChecked(true)
      return
    }

    // 如果沒有設定任何 feature，預設全開（向下相容）
    // admin 角色亦走此路徑（admin 不再 bypass workspace_features）
    if (features.length === 0) {
      setChecked(true)
      return
    }

    // 檢查權限
    if (!isRouteAvailable(pathname)) {
      router.replace('/unauthorized')
      return
    }

    setChecked(true)
  }, [pathname, loading, isRouteAvailable, router, features.length])

  if (loading || !checked) {
    return <ModuleLoading fullscreen />
  }

  return <>{children}</>
}
