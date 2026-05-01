'use client'

/**
 * Store 同步 Provider
 *
 * 在應用程式根層級使用，自動設定跨 Store 的同步訂閱
 *
 * @example
 * ```tsx
 * // app/providers.tsx
 * import { StoreSyncProvider } from '@/stores/sync/StoreSyncProvider'
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   return (
 *     <OtherProviders>
 *       <StoreSyncProvider>
 *         {children}
 *       </StoreSyncProvider>
 *     </OtherProviders>
 *   )
 * }
 * ```
 */

import { useStoreSyncSetup } from './use-store-sync'

interface StoreSyncProviderProps {
  children: React.ReactNode
}

function StoreSyncProvider({ children }: StoreSyncProviderProps) {
  // 設定同步訂閱
  useStoreSyncSetup()

  return <>{children}</>
}
