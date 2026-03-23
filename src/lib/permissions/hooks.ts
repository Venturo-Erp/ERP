'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores'
import { getFeaturesByRoute } from './features'

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

interface RolePermission {
  route: string
  can_read: boolean
  can_write: boolean
}

/**
 * 取得當前租戶的功能權限
 */
export function useWorkspaceFeatures() {
  const { user } = useAuthStore()
  const [features, setFeatures] = useState<WorkspaceFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.workspace_id) {
      setFeatures([])
      setLoading(false)
      return
    }

    const fetchFeatures = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/permissions/features?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setFeatures(data)
        }
      } catch (err) {
        console.error('Failed to fetch workspace features:', err)
      }
      setLoading(false)
    }

    fetchFeatures()
  }, [user?.workspace_id])

  // 檢查功能是否啟用
  const isFeatureEnabled = useCallback((featureCode: string): boolean => {
    const feature = features.find(f => f.feature_code === featureCode)
    return feature?.enabled ?? false
  }, [features])

  // 檢查路由是否可用（根據功能權限）
  const isRouteAvailable = useCallback((route: string): boolean => {
    const routeFeatures = getFeaturesByRoute(route)
    if (routeFeatures.length === 0) return true // 無需特殊功能的路由
    return routeFeatures.some(f => isFeatureEnabled(f.code))
  }, [isFeatureEnabled])

  // 已啟用的功能代碼列表
  const enabledFeatures = useMemo(() => 
    features.filter(f => f.enabled).map(f => f.feature_code),
    [features]
  )

  return {
    features,
    loading,
    isFeatureEnabled,
    isRouteAvailable,
    enabledFeatures,
  }
}

/**
 * 取得當前使用者的角色權限
 */
export function useRolePermissions() {
  const { user } = useAuthStore()
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.role_id) {
      setPermissions([])
      setLoading(false)
      return
    }

    const fetchPermissions = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/permissions/role-permissions?role_id=${user.role_id}`)
        if (res.ok) {
          const data = await res.json()
          setPermissions(data)
        }
      } catch (err) {
        console.error('Failed to fetch role permissions:', err)
      }
      setLoading(false)
    }

    fetchPermissions()
  }, [user?.role_id])

  // 檢查路由權限
  const canRead = useCallback((route: string): boolean => {
    const perm = permissions.find(p => route.startsWith(p.route))
    return perm?.can_read ?? true // 預設允許
  }, [permissions])

  const canWrite = useCallback((route: string): boolean => {
    const perm = permissions.find(p => route.startsWith(p.route))
    return perm?.can_write ?? true // 預設允許
  }, [permissions])

  return {
    permissions,
    loading,
    canRead,
    canWrite,
  }
}

/**
 * 整合權限檢查
 */
export function usePermissions() {
  const { user } = useAuthStore()
  const workspaceFeatures = useWorkspaceFeatures()
  const rolePermissions = useRolePermissions()

  const isSuperAdmin = 
    user?.permissions?.includes('super_admin') ||
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('*')

  const canAccess = useCallback((route: string): boolean => {
    if (isSuperAdmin) return true
    if (!workspaceFeatures.isRouteAvailable(route)) return false
    if (!rolePermissions.canRead(route)) return false
    return true
  }, [isSuperAdmin, workspaceFeatures, rolePermissions])

  const canEdit = useCallback((route: string): boolean => {
    if (isSuperAdmin) return true
    if (!workspaceFeatures.isRouteAvailable(route)) return false
    if (!rolePermissions.canWrite(route)) return false
    return true
  }, [isSuperAdmin, workspaceFeatures, rolePermissions])

  return {
    ...workspaceFeatures,
    ...rolePermissions,
    isSuperAdmin,
    canAccess,
    canEdit,
  }
}
