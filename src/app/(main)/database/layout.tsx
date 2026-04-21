'use client'

import { useAuthStore } from '@/stores'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Database 模組 admin-only guard
 * 覆蓋 /database 全部 9 個子路由（archive-management / attractions / company-assets /
 *   constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）
 * Wave 2 Batch 5 · 2026-04-21
 */
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(state => state.isAdmin)
  if (!isAdmin) return <UnauthorizedPage />
  return <>{children}</>
}
