'use client'

/**
 * 模組權限守衛
 * 檢查當前路由是否有權限，沒有就導向 /unauthorized
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { Loader2 } from 'lucide-react'

interface ModuleGuardProps {
  children: React.ReactNode
}

// 不需要檢查權限的路由
const PUBLIC_ROUTES = [
  '/login',
  '/unauthorized',
  '/public',
]

// 總是允許的路由（基本功能）
const ALWAYS_ALLOWED = [
  '/dashboard',
  '/settings',
]

export function ModuleGuard({ children }: ModuleGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { isRouteAvailable, loading, features } = useWorkspaceFeatures()
  const [checked, setChecked] = useState(false)

  // 新系統：使用 isAdmin
  const { isAdmin } = useAuthStore()
  const isSuperAdmin = isAdmin

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

    // Super Admin 跳過檢查
    if (isSuperAdmin) {
      setChecked(true)
      return
    }

    // 如果沒有設定任何 feature，預設全開（向下相容）
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
  }, [pathname, loading, isRouteAvailable, router, isSuperAdmin, features.length])

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-morandi-gold" />
      </div>
    )
  }

  return <>{children}</>
}
