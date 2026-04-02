'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'

interface TabPermission {
  module_code: string
  tab_code: string | null
  can_read: boolean
  can_write: boolean
}

/**
 * 取得當前用戶的分頁權限
 * 
 * 用法：
 * const { canRead, canWrite, loading } = useTabPermissions()
 * 
 * // 檢查是否能看收款管理
 * if (canRead('finance', 'payments')) { ... }
 * 
 * // 檢查是否能操作公司收款
 * if (canWrite('finance', 'payments-company')) { ... }
 * 
 * // 檢查是否能確認核帳
 * if (canWrite('finance', 'payments-confirm')) { ... }
 */
export function useTabPermissions() {
  const { user } = useAuthStore()
  const [permissions, setPermissions] = useState<TabPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setPermissions([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 取得用戶的角色
        const roleRes = await fetch(`/api/users/${user.id}/role`)
        if (!roleRes.ok) {
          setLoading(false)
          return
        }
        const roleData = await roleRes.json()
        
        // 管理員角色擁有所有權限
        if (roleData.is_admin) {
          setIsAdmin(true)
          setPermissions([])
          setLoading(false)
          return
        }

        // 取得角色的分頁權限
        const permRes = await fetch(`/api/roles/${roleData.role_id}/tab-permissions`)
        if (permRes.ok) {
          const data = await permRes.json()
          setPermissions(data)
        }
      } catch (err) {
        logger.error('Failed to fetch tab permissions:', err)
      }
      setLoading(false)
    }

    fetchPermissions()
  }, [user?.id])

  // 檢查是否有讀取權限
  const canRead = useCallback((moduleCode: string, tabCode?: string): boolean => {
    // 管理員擁有所有權限
    if (isAdmin) return true

    // 找對應的權限記錄
    const perm = permissions.find(p => 
      p.module_code === moduleCode && 
      (tabCode ? p.tab_code === tabCode : p.tab_code === null)
    )

    return perm?.can_read ?? false
  }, [permissions, isAdmin])

  // 檢查是否有寫入權限
  const canWrite = useCallback((moduleCode: string, tabCode?: string): boolean => {
    // 管理員擁有所有權限
    if (isAdmin) return true

    // 找對應的權限記錄
    const perm = permissions.find(p => 
      p.module_code === moduleCode && 
      (tabCode ? p.tab_code === tabCode : p.tab_code === null)
    )

    return perm?.can_write ?? false
  }, [permissions, isAdmin])

  // 檢查模組內任一分頁是否有讀取權限
  const canReadAny = useCallback((moduleCode: string): boolean => {
    if (isAdmin) return true
    return permissions.some(p => p.module_code === moduleCode && p.can_read)
  }, [permissions, isAdmin])

  // 檢查模組內任一分頁是否有寫入權限
  const canWriteAny = useCallback((moduleCode: string): boolean => {
    if (isAdmin) return true
    return permissions.some(p => p.module_code === moduleCode && p.can_write)
  }, [permissions, isAdmin])

  return {
    permissions,
    loading,
    isAdmin,
    canRead,
    canWrite,
    canReadAny,
    canWriteAny,
  }
}

/**
 * 權限守衛組件
 * 
 * 用法：
 * <PermissionGuard module="finance" tab="payments-confirm" action="write">
 *   <Button>確認核帳</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  module,
  tab,
  action = 'read',
  fallback = null,
  children,
}: {
  module: string
  tab?: string
  action?: 'read' | 'write'
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { canRead, canWrite, loading } = useTabPermissions()

  if (loading) return null

  const hasPermission = action === 'write' 
    ? canWrite(module, tab)
    : canRead(module, tab)

  if (!hasPermission) return <>{fallback}</>

  return <>{children}</>
}
