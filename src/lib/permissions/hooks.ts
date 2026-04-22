'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores'
import { getFeaturesByRoute } from './features'
import { getModuleByCode } from './module-tabs'
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

// 模組級快取：登入後第一次 fetch，整個 session 共用
const featureCache = {
  workspaceId: null as string | null,
  features: [] as WorkspaceFeature[],
  premiumEnabled: false,
  loaded: false,
  loading: false,
  promise: null as Promise<void> | null,
}

/**
 * 強制清快取、下次 useWorkspaceFeatures 會重 fetch
 * 用途：寫入 workspace_features 後呼叫、讓其他頁面立即看到最新狀態
 */
export function invalidateFeatureCache() {
  featureCache.loaded = false
  featureCache.loading = false
  featureCache.promise = null
}

export function useWorkspaceFeatures() {
  const { user } = useAuthStore()
  const [features, setFeatures] = useState<WorkspaceFeature[]>(
    featureCache.workspaceId === user?.workspace_id ? featureCache.features : []
  )
  const [premiumEnabled, setPremiumEnabled] = useState(
    featureCache.workspaceId === user?.workspace_id ? featureCache.premiumEnabled : false
  )
  const [loading, setLoading] = useState(
    !(featureCache.workspaceId === user?.workspace_id && featureCache.loaded)
  )

  useEffect(() => {
    if (!user?.workspace_id) {
      setFeatures([])
      setPremiumEnabled(false)
      setLoading(false)
      return
    }

    // 快取命中：同一個 workspace 已載入過，直接用
    if (featureCache.workspaceId === user.workspace_id && featureCache.loaded) {
      setFeatures(featureCache.features)
      setPremiumEnabled(featureCache.premiumEnabled)
      setLoading(false)
      return
    }

    // workspace 換了，清除快取
    if (featureCache.workspaceId !== user.workspace_id) {
      featureCache.workspaceId = user.workspace_id
      featureCache.loaded = false
      featureCache.loading = false
      featureCache.promise = null
    }

    // 如果已經在載入中（其他 component 觸發的），等它完成
    if (featureCache.loading && featureCache.promise) {
      featureCache.promise.then(() => {
        setFeatures(featureCache.features)
        setPremiumEnabled(featureCache.premiumEnabled)
        setLoading(false)
      })
      return
    }

    // 第一次載入
    featureCache.loading = true
    setLoading(true)

    const fetchFeatures = async () => {
      try {
        const [res, wsRes] = await Promise.all([
          fetch(`/api/permissions/features?workspace_id=${user.workspace_id}`),
          fetch(`/api/workspaces/${user.workspace_id}`),
        ])

        if (res.ok) {
          const data = await res.json()
          featureCache.features = data
          setFeatures(data)
        }

        if (wsRes.ok) {
          const ws = await wsRes.json()
          featureCache.premiumEnabled = ws.premium_enabled ?? false
          setPremiumEnabled(featureCache.premiumEnabled)
        }
      } catch (err) {
        logger.error('Failed to fetch workspace features:', err)
      }
      featureCache.loaded = true
      featureCache.loading = false
      setLoading(false)
    }

    featureCache.promise = fetchFeatures()
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

  /**
   * 檢查 tab 是否啟用（workspace 級、細粒度）
   * - category='premium'：需要 workspace 付費大開關 + `{module}.{tab}` 明確 enabled=true
   * - category='basic' / undefined：必須有 row 且 enabled=true
   *
   * 2026-04-20 改為嚴格（default-deny）：
   * 之前預設開、導致「租戶沒明確設定的 tab 都出現在權限清單」
   * 現在所有 workspace 建立時會自動 seed 所有 tab row（migration 已跑）
   * 之後新 workspace 建立、要同步 seed（見 Step 3 trigger）
   */
  const isTabEnabled = useCallback(
    (moduleCode: string, tabCode: string, category?: 'basic' | 'premium'): boolean => {
      const key = `${moduleCode}.${tabCode}`
      const feature = features.find(f => f.feature_code === key)
      if (category === 'premium') {
        return premiumEnabled && feature?.enabled === true
      }
      return feature?.enabled === true
    },
    [features, premiumEnabled]
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
    isTabEnabled,
    isRouteAvailable,
    enabledFeatures,
  }
}

/**
 * 過濾頁面 tab 列表、只保留當前租戶可見的（考慮 basic / premium 分類與付費大開關）
 *
 * 用法：
 * ```tsx
 * const TOUR_TABS = [{ value: 'contract', label: '合約' }, ...] as const
 * const visibleTabs = useVisibleModuleTabs('tours', TOUR_TABS)
 * ```
 *
 * 規則：
 * - tab 在 module-tabs.ts 中沒定義 → 視為一律可見（例如自訂 tab）
 * - 定義為 `category: 'premium'` → 需要付費大開關 + 功能小開關
 * - 其他（basic）→ 預設開，只有 workspace 明確關才隱藏
 * - `isEligibility: true` 的 tab（下拉資格類）→ 不受功能門檻管制、一律可見
 */
export function useVisibleModuleTabs<T extends { value: string }>(
  moduleCode: string,
  tabs: readonly T[]
): T[] {
  const { isTabEnabled } = useWorkspaceFeatures()

  return useMemo(() => {
    const moduleDef = getModuleByCode(moduleCode)
    if (!moduleDef) return [...tabs]

    return tabs.filter(tab => {
      const moduleTab = moduleDef.tabs.find(t => t.code === tab.value)
      if (!moduleTab) return true
      if (moduleTab.isEligibility) return true
      return isTabEnabled(moduleCode, tab.value, moduleTab.category)
    })
  }, [moduleCode, tabs, isTabEnabled])
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
      // Feature 載入中時先放行、避免閃 UnauthorizedPage（拔除 isAdmin 短路的配套）
      if (workspaceFeatures.loading) return true
      if (!workspaceFeatures.isRouteAvailable(route)) return false
      if (!rolePermissions.canRead(route)) return false
      return true
    },
    [workspaceFeatures, rolePermissions]
  )

  const canEdit = useCallback(
    (route: string): boolean => {
      if (workspaceFeatures.loading) return true
      if (!workspaceFeatures.isRouteAvailable(route)) return false
      if (!rolePermissions.canWrite(route)) return false
      return true
    },
    [workspaceFeatures, rolePermissions]
  )

  return {
    ...workspaceFeatures,
    ...rolePermissions,
    isAdmin, // @deprecated 向下相容
    canAccess,
    canEdit,
  }
}
