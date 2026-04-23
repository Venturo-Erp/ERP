// 新權限系統
export * from './features'
export * from './hooks'
export * from './module-tabs'
export * from './useTabPermissions'

export interface PermissionConfig {
  id: string
  label: string
  category: string
  routes: string[]
  description?: string
}

/**
 * 功能權限配置（給設定頁顯示用）
 * 權限決策不靠這個、走 role_tab_permissions（permissions[]）+ workspace_roles.is_admin
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
  { id: 'fleet', label: '車隊管理', category: '企業', routes: ['/fleet', '/supplier/trips'] },
]

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
 * 權限格式：module_code 或 module_code:tab_code（例 'tours' 或 'tours:overview'）
 * admin role 已透過 backfill 拿到全部 module 權限、走同一條過濾邏輯
 */
export function hasPermissionForRoute(
  userPermissions: string[] | undefined,
  route: string,
  _isAdmin?: boolean
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false

  // 無需特殊權限的路由
  const publicRoutes = ['/dashboard', '/profile']
  if (publicRoutes.some(r => route.startsWith(r))) {
    return true
  }

  const moduleCode = getModuleFromRoute(route)
  if (!moduleCode) return false

  // 檢查是否有該模組的任何權限（精確匹配 或 module:tab 前綴匹配）
  return userPermissions.some(p => p === moduleCode || p.startsWith(`${moduleCode}:`))
}

export function getPermissionCategories(): string[] {
  return Array.from(new Set(FEATURE_PERMISSIONS.map(p => p.category)))
}

export function getPermissionsByCategory(category: string): PermissionConfig[] {
  return FEATURE_PERMISSIONS.filter(p => p.category === category)
}
