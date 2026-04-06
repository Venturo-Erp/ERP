'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores'
import { getFeaturesByRoute } from './features'
import { logger } from '@/lib/utils/logger'

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
// 付費功能代碼（需要付費大開關開啟才能用）
const PREMIUM_FEATURE_CODES = [
  'workspace',
  'customers',
  'itinerary',
  'design',
  'office',
  'ai_bot',
  'fleet',
  'local',
  'supplier_portal',
  'esims',
  'accounting',
  'departments',
  'tenants',
]

export function useWorkspaceFeatures() {
  const { user } = useAuthStore()
  const [features, setFeatures] = useState<WorkspaceFeature[]>([])
  const [premiumEnabled, setPremiumEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.workspace_id) {
      setFeatures([])
      setPremiumEnabled(false)
      setLoading(false)
      return
    }

    const fetchFeatures = async () => {
      setLoading(true)
      try {
        // 取得功能開關
        const res = await fetch(`/api/permissions/features?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setFeatures(data)
        }

        // 取得付費大開關
        const wsRes = await fetch(`/api/workspaces/${user.workspace_id}`)
        if (wsRes.ok) {
          const ws = await wsRes.json()
          setPremiumEnabled(ws.premium_enabled ?? false)
        }
      } catch (err) {
        logger.error('Failed to fetch workspace features:', err)
      }
      setLoading(false)
    }

    fetchFeatures()
  }, [user?.workspace_id])

  // 檢查功能是否啟用（付費功能需要付費大開關 + 功能小開關都開啟）
  const isFeatureEnabled = useCallback(
    (featureCode: string): boolean => {
      const feature = features.find(f => f.feature_code === featureCode)
      const featureOn = feature?.enabled ?? false

      // 付費功能需要付費大開關也開啟
      if (PREMIUM_FEATURE_CODES.includes(featureCode)) {
        return premiumEnabled && featureOn
      }

      return featureOn
    },
    [features, premiumEnabled]
  )

  // 檢查路由是否可用（根據功能權限）
  const isRouteAvailable = useCallback(
    (route: string): boolean => {
      const routeFeatures = getFeaturesByRoute(route)
      if (routeFeatures.length === 0) return true // 無需特殊功能的路由
      return routeFeatures.some(f => isFeatureEnabled(f.code))
    },
    [isFeatureEnabled]
  )

  // 已啟用的功能代碼列表
  const enabledFeatures = useMemo(
    () => features.filter(f => f.enabled).map(f => f.feature_code),
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
  const [permissions] = useState<RolePermission[]>([])
  const loading = false // RBAC 不需要 API 載入

  // RBAC: 權限從 user.permissions 取得，不需要查詢 API

  // 檢查路由權限
  const canRead = useCallback(
    (route: string): boolean => {
      const perm = permissions.find(p => route.startsWith(p.route))
      return perm?.can_read ?? true // 預設允許
    },
    [permissions]
  )

  const canWrite = useCallback(
    (route: string): boolean => {
      const perm = permissions.find(p => route.startsWith(p.route))
      return perm?.can_write ?? true // 預設允許
    },
    [permissions]
  )

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

  const isAdmin = useAuthStore(state => state.isAdmin)

  const canAccess = useCallback(
    (route: string): boolean => {
      if (isAdmin) return true
      if (!workspaceFeatures.isRouteAvailable(route)) return false
      if (!rolePermissions.canRead(route)) return false
      return true
    },
    [isAdmin, workspaceFeatures, rolePermissions]
  )

  const canEdit = useCallback(
    (route: string): boolean => {
      if (isAdmin) return true
      if (!workspaceFeatures.isRouteAvailable(route)) return false
      if (!rolePermissions.canWrite(route)) return false
      return true
    },
    [isAdmin, workspaceFeatures, rolePermissions]
  )

  return {
    ...workspaceFeatures,
    ...rolePermissions,
    isAdmin, // @deprecated 向下相容
    canAccess,
    canEdit,
  }
}
