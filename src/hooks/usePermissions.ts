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
    const isAdmin = userPermissions.includes('*') || userPermissions.includes('admin')

    return {
      canViewReceipts:
        isAdmin || hasModulePermission(userPermissions, 'finance'),
      canCreateReceipts:
        isAdmin || hasModulePermission(userPermissions, 'finance'),
      canEditReceipts:
        isAdmin || hasModulePermission(userPermissions, 'finance'),
      canConfirmReceipts:
        isAdmin || hasModulePermission(userPermissions, 'finance'),
      canViewFinance:
        isAdmin || hasModulePermission(userPermissions, 'finance') || hasModulePermission(userPermissions, 'accounting'),
      canManageFinance:
        isAdmin || hasModulePermission(userPermissions, 'finance'),
      canEditDatabase:
        isAdmin || hasModulePermission(userPermissions, 'database'),
      isAdmin,
      isAccountant:
        isAdmin || hasModulePermission(userPermissions, 'accounting') || hasModulePermission(userPermissions, 'finance'),
    }
  }, [user])

  return permissions
}
