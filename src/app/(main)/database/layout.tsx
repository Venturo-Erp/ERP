'use client'

import { useTabPermissions } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'

/**
 * Database 模組權限守衛
 * 覆蓋 /database 全部 9 個子路由（archive-management / attractions / company-assets /
 *   constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）
 * 改用 role_tab_permissions：只要擁有 database 任一 tab 權限即可進
 */
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const { canReadAny, loading } = useTabPermissions()
  if (loading) return <ModuleLoading fullscreen />
  if (!canReadAny('database')) return <UnauthorizedPage />
  return <>{children}</>
}
