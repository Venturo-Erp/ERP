'use client'

/**
 * 權限檢查 Hooks
 * 
 * 用於檢查使用者是否有權限存取特定功能或路由
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'
import { getFeatureByRoute, FEATURES, type FeatureDefinition } from './features'

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
 * 取得租戶已啟用的功能
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
      const { data, error } = await supabase
        .from('workspace_features')
        .select('feature_code, enabled')
        .eq('workspace_id', user.workspace_id)

      if (!error && data) {
        setFeatures(data)
      }
      setLoading(false)
    }

    fetchFeatures()
  }, [user?.workspace_id])

  // 檢查功能是否啟用
  const isFeatureEnabled = (featureCode: string): boolean => {
    const feature = features.find(f => f.feature_code === featureCode)
    return feature?.enabled ?? false
  }

  // 取得啟用的功能列表
  const enabledFeatures = useMemo(() => {
    return features.filter(f => f.enabled).map(f => f.feature_code)
  }, [features])

  return {
    features,
    loading,
    isFeatureEnabled,
    enabledFeatures,
  }
}

/**
 * 取得使用者角色權限
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
      const { data, error } = await supabase
        .from('role_route_permissions')
        .select('route, can_read, can_write')
        .eq('role_id', user.role_id)

      if (!error && data) {
        setPermissions(data)
      }
      setLoading(false)
    }

    fetchPermissions()
  }, [user?.role_id])

  // 檢查路由權限
  const checkPermission = (route: string): { canRead: boolean; canWrite: boolean } => {
    const permission = permissions.find(p => route.startsWith(p.route))
    return {
      canRead: permission?.can_read ?? false,
      canWrite: permission?.can_write ?? false,
    }
  }

  return {
    permissions,
    loading,
    checkPermission,
  }
}

/**
 * 綜合權限檢查
 * 結合租戶功能權限 + 角色路由權限
 */
export function usePermissions() {
  const { user } = useAuthStore()
  const { isFeatureEnabled, enabledFeatures, loading: featuresLoading } = useWorkspaceFeatures()
  const { checkPermission, loading: permissionsLoading } = useRolePermissions()

  // Super Admin 跳過所有檢查
  const isSuperAdmin = useMemo(() => {
    const permissions = user?.permissions || []
    const roles = user?.roles || []
    return (
      permissions.includes('super_admin') ||
      permissions.includes('admin') ||
      permissions.includes('*') ||
      roles.includes('super_admin')
    )
  }, [user?.permissions, user?.roles])

  // 檢查是否可以存取路由
  const canAccessRoute = (route: string): boolean => {
    // Super Admin 可以存取所有
    if (isSuperAdmin) return true

    // 1. 檢查租戶是否啟用此功能
    const feature = getFeatureByRoute(route)
    if (feature && !isFeatureEnabled(feature.code)) {
      return false
    }

    // 2. 如果沒有角色權限設定，預設允許（只要租戶有啟用）
    const { canRead } = checkPermission(route)
    // 如果有設定權限，檢查是否可讀取
    // 如果沒有設定權限，預設允許
    return canRead || true // TODO: 之後改為嚴格模式
  }

  // 檢查是否可以寫入
  const canWriteRoute = (route: string): boolean => {
    if (isSuperAdmin) return true

    const feature = getFeatureByRoute(route)
    if (feature && !isFeatureEnabled(feature.code)) {
      return false
    }

    const { canWrite } = checkPermission(route)
    return canWrite || true // TODO: 之後改為嚴格模式
  }

  // 過濾選單項目（根據權限）
  const filterMenuItems = <T extends { href: string; children?: T[] }>(items: T[]): T[] => {
    return items
      .filter(item => canAccessRoute(item.href))
      .map(item => {
        if (item.children) {
          return { ...item, children: filterMenuItems(item.children) }
        }
        return item
      })
      .filter(item => !item.children || item.children.length > 0)
  }

  return {
    isSuperAdmin,
    enabledFeatures,
    canAccessRoute,
    canWriteRoute,
    filterMenuItems,
    loading: featuresLoading || permissionsLoading,
  }
}
