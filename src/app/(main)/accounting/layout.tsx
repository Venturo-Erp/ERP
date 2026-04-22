'use client'

import { useTabPermissions } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'

/**
 * Accounting 模組權限守衛
 * 覆蓋 /accounting 所有子路由（page / accounts / checks / period-closing / reports / vouchers）
 * 改用 role_tab_permissions：只要擁有 accounting 任一 tab 權限即可進
 */
export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const { canReadAny, loading } = useTabPermissions()
  if (loading) return <ModuleLoading fullscreen />
  if (!canReadAny('accounting')) return <UnauthorizedPage />
  return <>{children}</>
}
