'use client'

import { useMyCapabilities } from './useMyCapabilities'
import type { Capability } from './capabilities'

/**
 * (Deprecated wrapper, 2026-05-01)
 *
 * 介面保留以免大規模改 callsite、內部 100% 走新系統。
 * 新 caller 請直接用 useMyCapabilities()。
 */
export function useCapabilities() {
  const { has, loading, canReadAnyInModule, canWriteAnyInModule } = useMyCapabilities()

  const can = (capability: Capability): boolean => has(capability)

  const hasAny = (caps: Capability[]): boolean => caps.some(c => has(c))
  const hasAll = (caps: Capability[]): boolean => caps.every(c => has(c))

  return {
    can,
    hasAny,
    hasAll,
    loading,
    // 舊 API 還回傳 canRead/canWrite、為相容舊 caller
    canRead: (moduleCode: string, tabCode?: string) =>
      has(tabCode ? `${moduleCode}.${tabCode}.read` : `${moduleCode}.read`),
    canWrite: (moduleCode: string, tabCode?: string) =>
      has(tabCode ? `${moduleCode}.${tabCode}.write` : `${moduleCode}.write`),
    canReadAny: canReadAnyInModule,
    canWriteAny: canWriteAnyInModule,
  }
}
