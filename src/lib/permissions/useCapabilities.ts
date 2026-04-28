'use client'

import { useTabPermissions } from './useTabPermissions'
import { CAPABILITIES, type Capability } from './capabilities'

/**
 * 使用統一的權限常數檢查
 *
 * 用法：
 * const { can } = useCapabilities()
 * if (!can(CAPABILITIES.HR_MANAGE_ROLES)) return <Forbidden />
 */
export function useCapabilities() {
  const { canRead, canWrite, loading } = useTabPermissions()

  const can = (capability: Capability): boolean => {
    const tab = capability.tab ?? undefined
    if (capability.action === 'write') {
      return canWrite(capability.module, tab)
    }
    return canRead(capability.module, tab)
  }

  const hasAny = (caps: Capability[]): boolean => {
    return caps.some(cap => can(cap))
  }

  const hasAll = (caps: Capability[]): boolean => {
    return caps.every(cap => can(cap))
  }

  return {
    can,
    hasAny,
    hasAll,
    loading,
    canRead,
    canWrite,
  }
}
