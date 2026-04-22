// 新權限系統
export * from './features'
export * from './hooks'
export * from './module-tabs'
export * from './useTabPermissions'

// ====================
// 兼容舊系統的導出
// ====================

export interface PermissionConfig {
  id: string
  label: string
  category: string
  routes: string[]
  description?: string
}

/**
 * 系統權限配置（兼容舊版）
 */
export const SYSTEM_PERMISSIONS: PermissionConfig[] = [
  {
    id: 'admin',
    label: '超級管理員',
    category: '全部',
    routes: ['*'],
    description: '擁有系統最高權限，包含所有功能',
  },
  {
    id: 'admin',
    label: '系統管理員',
    category: '全部',
    routes: ['*'],
    description: '擁有系統所有權限（含系統管理功能）',
  },
]

/**
 * 功能權限配置（兼容舊版）
 */
export const FEATURE_PERMISSIONS: PermissionConfig[] = [
  { id: 'calendar', label: '行事曆', category: '全部', routes: ['/calendar'] },
  { id: 'workspace', label: '工作空間', category: '全部', routes: ['/workspace'] },
  { id: 'todos', label: '待辦事項', category: '全部', routes: ['/todos'] },
  { id: 'tours', label: '旅遊團', category: '核心', routes: ['/tours'] },
  { id: 'orders', label: '訂單', category: '核心', routes: ['/orders'] },
  { id: 'finance', label: '財務', category: '核心', routes: ['/finance', '/accounting'] },
  { id: 'database', label: '資料管理', category: '核心', routes: ['/database'] },
  { id: 'hr', label: '人資', category: '管理', routes: ['/hr'] },
  { id: 'settings', label: '設定', category: '管理', routes: ['/settings'] },
  { id: 'customers', label: '顧客管理', category: '付費', routes: ['/customers'] },
  { id: 'design', label: '設計', category: '付費', routes: ['/design'] },
  { id: 'fleet', label: '車隊管理', category: '企業', routes: ['/fleet', '/supplier/trips'] },
]

const ALL_PERMISSIONS = [...SYSTEM_PERMISSIONS, ...FEATURE_PERMISSIONS]

/**
 * 路由到模組的對應表
 * 用於將 URL 路由轉換成 module_code
 */
const ROUTE_TO_MODULE: Record<string, string> = {
  '/tours': 'tours',
  '/orders': 'orders',
  '/finance': 'finance',
  '/accounting': 'accounting',
  '/hr': 'hr',
  '/database': 'database',
  '/data-management': 'database',
  '/settings': 'settings',
  '/calendar': 'calendar',
  '/workspace': 'workspace',
  '/todos': 'todos',
  '/dashboard': 'dashboard',
  '/itinerary': 'itinerary',
  '/visas': 'visas',
  '/design': 'design',
  '/office': 'office',
  '/customers': 'database', // 顧客在資料管理
}

/**
 * 從路由取得模組代碼
 */
function getModuleFromRoute(route: string): string | null {
  // 移除開頭的 /
  const cleanRoute = route.startsWith('/') ? route : `/${route}`

  // 找最長匹配的路由
  for (const [routePrefix, moduleCode] of Object.entries(ROUTE_TO_MODULE)) {
    if (cleanRoute === routePrefix || cleanRoute.startsWith(`${routePrefix}/`)) {
      return moduleCode
    }
  }
  return null
}

/**
 * 根據路由檢查是否有權限
 *
 * 支援兩種權限格式：
 * 1. 舊格式：permission_id（如 'tours', 'finance'）
 * 2. 新格式：module_code 或 module_code:tab_code（如 'tours:overview', 'finance:payments'）
 */
export function hasPermissionForRoute(
  userPermissions: string[] | undefined,
  route: string,
  isAdmin?: boolean
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false

  // 管理員有所有權限（由 isAdmin flag 決定）
  if (isAdmin) {
    return true
  }

  // 無需特殊權限的路由
  const publicRoutes = ['/dashboard', '/profile']
  if (publicRoutes.some(r => route.startsWith(r))) {
    return true
  }

  // 從路由取得模組代碼
  const moduleCode = getModuleFromRoute(route)
  if (!moduleCode) {
    // 未知路由，檢查舊格式權限
    for (const perm of ALL_PERMISSIONS) {
      for (const permRoute of perm.routes) {
        if (permRoute === '*' || route.startsWith(permRoute)) {
          if (userPermissions.includes(perm.id)) {
            return true
          }
        }
      }
    }
    return false
  }

  // 新格式：檢查是否有該模組的任何權限
  // 例如有 'tours' 或 'tours:overview' 或 'tours:orders' 都算有 tours 模組權限
  for (const perm of userPermissions) {
    // 完全匹配模組（無分頁的模組）
    if (perm === moduleCode) {
      return true
    }
    // 匹配 module:tab 格式
    if (perm.startsWith(`${moduleCode}:`)) {
      return true
    }
  }

  // 兼容舊格式：檢查舊的權限 ID
  for (const perm of ALL_PERMISSIONS) {
    for (const permRoute of perm.routes) {
      if (permRoute === '*' || route.startsWith(permRoute)) {
        if (userPermissions.includes(perm.id)) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * 取得權限分類（兼容舊版）
 */
export function getPermissionCategories(): string[] {
  const categories = new Set(ALL_PERMISSIONS.map(p => p.category))
  return Array.from(categories)
}

/**
 * 根據分類取得權限（兼容舊版）
 */
export function getPermissionsByCategory(category: string): PermissionConfig[] {
  return ALL_PERMISSIONS.filter(p => p.category === category)
}
