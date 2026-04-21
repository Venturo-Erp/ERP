'use client'

import { useAuthStore } from '@/stores'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Accounting 模組 admin-only guard
 * 覆蓋 /accounting 所有子路由（page / accounts / checks / period-closing / reports / vouchers）
 * Wave 2 Batch 2 · 2026-04-21
 */
export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(state => state.isAdmin)
  if (!isAdmin) return <UnauthorizedPage />
  return <>{children}</>
}
