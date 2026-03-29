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
    id: 'super_admin',
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
  { id: 'quotes', label: '報價單', category: '核心', routes: ['/quotes'] },
  { id: 'finance', label: '財務', category: '核心', routes: ['/finance', '/accounting'] },
  { id: 'database', label: '資料管理', category: '核心', routes: ['/database'] },
  { id: 'hr', label: '人資', category: '管理', routes: ['/hr'] },
  { id: 'settings', label: '設定', category: '管理', routes: ['/settings'] },
  { id: 'customers', label: '顧客管理', category: '付費', routes: ['/customers'] },
  { id: 'itinerary', label: '行程管理', category: '付費', routes: ['/itinerary'] },
  { id: 'design', label: '設計', category: '付費', routes: ['/design'] },
  { id: 'fleet', label: '車隊管理', category: '企業', routes: ['/fleet', '/supplier/trips'] },
]

const ALL_PERMISSIONS = [...SYSTEM_PERMISSIONS, ...FEATURE_PERMISSIONS]

/**
 * 根據路由檢查是否有權限（兼容舊版）
 */
export function hasPermissionForRoute(
  userPermissions: string[] | undefined,
  route: string
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false
  
  // Super admin 或 admin 有所有權限
  if (userPermissions.includes('super_admin') || userPermissions.includes('admin') || userPermissions.includes('*')) {
    return true
  }

  // 找出需要哪個權限
  for (const perm of ALL_PERMISSIONS) {
    for (const permRoute of perm.routes) {
      if (permRoute === '*' || route.startsWith(permRoute)) {
        if (userPermissions.includes(perm.id)) {
          return true
        }
      }
    }
  }

  // 無需特殊權限的路由
  const publicRoutes = ['/dashboard', '/profile']
  if (publicRoutes.some(r => route.startsWith(r))) {
    return true
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
