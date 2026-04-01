import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'

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
        isAdmin: false,
        isAccountant: false,
      }
    }

    const userPermissions = user.permissions || []
    const isAdmin = userPermissions.includes('admin') || userPermissions.includes('*')

    return {
      canViewReceipts:
        isAdmin || userPermissions.includes('payments') || userPermissions.includes('finance'),
      canCreateReceipts:
        isAdmin || userPermissions.includes('payments') || userPermissions.includes('finance'),
      canEditReceipts:
        isAdmin || userPermissions.includes('payments') || userPermissions.includes('finance'),
      canConfirmReceipts:
        isAdmin || userPermissions.includes('payments') || userPermissions.includes('finance'),
      canViewFinance:
        isAdmin ||
        userPermissions.includes('finance') ||
        userPermissions.includes('accounting'),
      canManageFinance: isAdmin || userPermissions.includes('finance'),
      // 資料庫編輯權限（景點、餐廳、飯店）
      canEditDatabase:
        isAdmin || userPermissions.includes('database') || userPermissions.includes('admin'),
      isAdmin,
      isAccountant:
        isAdmin ||
        userPermissions.includes('accounting') ||
        userPermissions.includes('finance'),
    }
  }, [user])

  return permissions
}
