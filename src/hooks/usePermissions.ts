import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 檢查是否有某模組的權限（支援 module:tab 格式）
 */
function hasModulePermission(permissions: string[], module: string): boolean {
  return permissions.some(p => p === module || p.startsWith(`${module}:`))
}

export const usePermissions = () => {
  const { user } = useAuthStore()
  const storeIsAdmin = useAuthStore(state => state.isAdmin)

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canViewReceipts: false,
        canCreateReceipts: false,
        canEditReceipts: false,
        canConfirmReceipts: false,
        canViewFinance: false,
        canManageFinance: false,
        canEditDatabase: false,
        isAdmin: false,
        isAccountant: false,
      }
    }

    const userPermissions = user.permissions || []

    return {
      canViewReceipts: hasModulePermission(userPermissions, 'finance'),
      canCreateReceipts: hasModulePermission(userPermissions, 'finance'),
      canEditReceipts: hasModulePermission(userPermissions, 'finance'),
      canConfirmReceipts: hasModulePermission(userPermissions, 'finance'),
      canViewFinance:
        hasModulePermission(userPermissions, 'finance') ||
        hasModulePermission(userPermissions, 'accounting'),
      canManageFinance: hasModulePermission(userPermissions, 'finance'),
      canEditDatabase: hasModulePermission(userPermissions, 'database'),
      isAdmin: storeIsAdmin,
      isAccountant:
        hasModulePermission(userPermissions, 'accounting') ||
        hasModulePermission(userPermissions, 'finance'),
    }
  }, [user, storeIsAdmin])

  return permissions
}
