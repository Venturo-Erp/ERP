/**
 * 功能模組定義
 * 
 * 用於租戶功能權限管理
 */

export interface FeatureDefinition {
  code: string
  name: string
  description: string
  category: 'basic' | 'premium' | 'enterprise'
  routes: string[]  // 這個功能包含哪些路由
}

// 所有功能模組
export const FEATURES: FeatureDefinition[] = [
  // ===== 基本功能（免費） =====
  {
    code: 'dashboard',
    name: '首頁',
    description: '系統首頁與儀表板',
    category: 'basic',
    routes: ['/dashboard'],
  },
  {
    code: 'tours',
    name: '旅遊團',
    description: '團務管理、行程規劃',
    category: 'basic',
    routes: ['/tours', '/tours/[code]'],
  },
  {
    code: 'orders',
    name: '訂單',
    description: '客戶訂單管理',
    category: 'basic',
    routes: ['/orders'],
  },
  {
    code: 'quotes',
    name: '報價單',
    description: '報價單管理',
    category: 'basic',
    routes: ['/quotes', '/quotes/[id]', '/quotes/quick/[id]'],
  },
  {
    code: 'finance',
    name: '財務系統',
    description: '收款、請款、會計',
    category: 'basic',
    routes: [
      '/finance',
      '/finance/payments',
      '/finance/requests',
      '/finance/treasury',
      '/finance/reports',
      '/accounting',
    ],
  },
  {
    code: 'database',
    name: '資料管理',
    description: '景點、供應商、資源庫',
    category: 'basic',
    routes: [
      '/database',
      '/database/attractions',
      '/database/suppliers',
      '/database/archive-management',
    ],
  },
  {
    code: 'hr',
    name: '人資管理',
    description: '員工、出勤、薪資',
    category: 'basic',
    routes: ['/hr', '/hr/attendance', '/hr/leave', '/hr/payroll'],
  },
  {
    code: 'settings',
    name: '設定',
    description: '公司設定、系統設定',
    category: 'basic',
    routes: ['/settings', '/settings/company', '/settings/line', '/settings/permissions'],
  },

  // ===== 進階功能（付費） =====
  {
    code: 'calendar',
    name: '行事曆',
    description: '出團日曆、排程管理',
    category: 'premium',
    routes: ['/calendar'],
  },
  {
    code: 'workspace',
    name: '工作空間',
    description: '團隊頻道、協作空間',
    category: 'premium',
    routes: ['/workspace'],
  },
  {
    code: 'todos',
    name: '待辦事項',
    description: '任務管理',
    category: 'premium',
    routes: ['/todos'],
  },
  {
    code: 'customers',
    name: '顧客管理',
    description: '客戶資料、客戶群組',
    category: 'premium',
    routes: ['/customers', '/customers/companies', '/customer-groups'],
  },
  {
    code: 'itinerary',
    name: '行程管理',
    description: '行程編輯器、行程範本',
    category: 'premium',
    routes: ['/itinerary', '/itinerary/new', '/itinerary/block-editor'],
  },
  {
    code: 'design',
    name: '設計',
    description: '手冊設計、行銷素材',
    category: 'premium',
    routes: ['/design', '/brochures', '/marketing'],
  },
  {
    code: 'office',
    name: '文件',
    description: '文件管理',
    category: 'premium',
    routes: ['/office', '/office/editor'],
  },

  // ===== 企業功能 =====
  {
    code: 'fleet',
    name: '車隊管理',
    description: '車輛、司機管理',
    category: 'enterprise',
    routes: ['/database/fleet', '/supplier/trips'],
  },
]

// 根據功能代碼取得定義
export function getFeatureByCode(code: string): FeatureDefinition | undefined {
  return FEATURES.find(f => f.code === code)
}

// 根據路由取得對應的功能
export function getFeatureByRoute(route: string): FeatureDefinition | undefined {
  // 處理動態路由 /tours/[code] -> /tours/xxx
  const normalizedRoute = route.replace(/\/\[.*?\]/g, '/[param]')
  
  return FEATURES.find(f => 
    f.routes.some(r => {
      const normalizedFeatureRoute = r.replace(/\/\[.*?\]/g, '/[param]')
      return route.startsWith(normalizedFeatureRoute.replace('/[param]', '')) ||
             normalizedRoute === normalizedFeatureRoute
    })
  )
}

// 取得所有基本功能
export function getBasicFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => f.category === 'basic')
}

// 取得所有付費功能
export function getPremiumFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => f.category === 'premium')
}

// 取得所有企業功能
export function getEnterpriseFeatures(): FeatureDefinition[] {
  return FEATURES.filter(f => f.category === 'enterprise')
}
