'use client'

/**
 * 模組權限守衛
 * 兩道 gate：
 *   1. workspace_features — workspace 等級「有沒有買這個功能」
 *   2. role_capabilities（HR）— 個人職務「能不能看這個模組」
 *
 * HR 是權限 SSOT。除 PLATFORM_CAPABILITY_ROUTES（平台管理資格專屬）外、所有路由統一吃此處。
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  useWorkspaceFeatures,
  isPlatformCapabilityRoute,
  getModuleFromRoute,
} from '@/lib/permissions'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { ModuleLoading } from '@/components/module-loading'

interface ModuleGuardProps {
  children: React.ReactNode
}

const PUBLIC_ROUTES = ['/login', '/unauthorized', '/public']

// 永遠放行：根目錄、首頁、個人設定（不受職務權限管控）
const ALWAYS_ALLOWED_EXACT = new Set(['/', '/dashboard', '/settings', '/settings/personal'])

const ALWAYS_ALLOWED_PREFIXES = ['/dashboard/']

export function ModuleGuard({ children }: ModuleGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { has, canReadAnyInModule, loading: capLoading } = useMyCapabilities()
  const isAdmin = has('platform.is_admin')
  const { isRouteAvailable, loading: featuresLoading, features } = useWorkspaceFeatures()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (featuresLoading || capLoading) return

    // 公開路由
    if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
      setChecked(true)
      return
    }

    // 永遠放行
    if (
      ALWAYS_ALLOWED_EXACT.has(pathname) ||
      ALWAYS_ALLOWED_PREFIXES.some(r => pathname.startsWith(r))
    ) {
      setChecked(true)
      return
    }

    // 平台管理資格專屬：/tenants（Venturo 平台商業敏感功能）
    if (isPlatformCapabilityRoute(pathname)) {
      if (!isAdmin) {
        router.replace('/unauthorized')
        return
      }
      setChecked(true)
      return
    }

    // workspace_features：workspace 沒買功能就擋（features.length === 0 為向下相容、預設全開）
    if (features.length > 0 && !isRouteAvailable(pathname)) {
      router.replace('/unauthorized')
      return
    }

    // HR 職務權限：模組層 canReadAny（HR 沒給該模組任一 tab 權限就擋）
    // 細粒度 tab gate 由 page.tsx 自己用 canRead(module, tab) 守
    const moduleCode = getModuleFromRoute(pathname)
    if (moduleCode && !canReadAnyInModule(moduleCode)) {
      router.replace('/unauthorized')
      return
    }

    setChecked(true)
  }, [
    pathname,
    featuresLoading,
    capLoading,
    isRouteAvailable,
    router,
    features.length,
    canReadAnyInModule,
    isAdmin,
  ])

  if (featuresLoading || capLoading || !checked) {
    return <ModuleLoading />
  }

  return <>{children}</>
}
