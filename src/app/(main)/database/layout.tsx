'use client'

import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'

/**
 * Database 模組權限守衛
 * 覆蓋 /database 全部 9 個子路由（archive-management / attractions / company-assets /
 *   constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）
 * 進門條件：擁有 database 任一 tab 的 read capability
 */
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const { canReadAnyInModule, loading } = useMyCapabilities()
  if (loading) return <ModuleLoading fullscreen />
  if (!canReadAnyInModule('database')) return <UnauthorizedPage />
  return <>{children}</>
}
