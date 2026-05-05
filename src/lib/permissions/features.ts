/**
 * 功能模組定義
 *
 * 用於租戶功能權限管理
 * 對應側邊欄路由
 */

export interface FeatureDefinition {
  code: string
  name: string
  description: string
  category: 'basic' | 'premium' | 'enterprise'
  routes: string[] // 這個功能包含哪些路由
}

// 所有功能模組（對應側邊欄）
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
    name: '旅遊團管理',
    description: '團務管理、行程規劃、團員管理',
    category: 'basic',
    routes: ['/tours', '/tours/[code]'],
  },
  {
    code: 'orders',
    name: '訂單管理',
    description: '客戶訂單、團員報名',
    category: 'basic',
    routes: ['/orders'],
  },
  {
    code: 'finance',
    name: '財務系統',
    description: '收款、請款、出納、財務報表',
    category: 'basic',
    routes: [
      '/finance',
      '/finance/payments',
      '/finance/requests',
      '/finance/treasury',
      '/finance/treasury/disbursement',
      '/finance/reports',
      '/finance/settings',
    ],
  },
  {
    code: 'accounting',
    name: '會計系統',
    description: '傳票、帳務、損益表',
    category: 'premium',
    routes: [
      '/accounting',
      '/accounting/vouchers',
      '/accounting/accounts',
      '/accounting/reports',
      '/accounting/checks',
      '/accounting/period-closing',
    ],
  },
  {
    code: 'database',
    name: '資料管理',
    description: '景點、供應商、封存管理',
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
    description: '員工、出勤、請假、薪資',
    category: 'basic',
    // 2026-04-20 補齊所有 /hr/* 子路由、原本只列 4 條、其他（roles/overtime/settings 等）
    // 因為 routeFeatures.length === 0 被當「無需權限」、即使關了 hr 還是看得到
    routes: [
      '/hr',
      '/hr/roles',
      '/hr/attendance',
      '/hr/leave',
      '/hr/overtime',
      '/hr/missed-clock',
      '/hr/payroll',
      '/hr/deductions',
      '/hr/reports',
      '/hr/settings',
      '/hr/training',
      '/hr/clock-in',
      '/hr/announcements',
      '/hr/my-attendance',
      '/hr/my-leave',
      '/hr/my-payslip',
    ],
  },
  {
    code: 'settings',
    name: '系統設定',
    description: '公司設定、角色權限、選單配置',
    category: 'basic',
    routes: ['/settings', '/settings/company', '/settings/roles'],
  },

  {
    code: 'calendar',
    name: '行事曆',
    description: '出團日曆、排程管理',
    category: 'basic',
    routes: ['/calendar'],
  },
  {
    code: 'todos',
    name: '待辦事項',
    description: '任務管理、提醒',
    category: 'basic',
    routes: ['/todos'],
  },
  {
    code: 'visas',
    name: '簽證管理',
    description: '簽證申請、進度追蹤',
    category: 'basic',
    routes: ['/visas'],
  },
  // ===== 進階功能（付費） =====
  {
    code: 'workspace',
    name: '頻道',
    description: '團隊頻道、協作空間',
    category: 'premium',
    routes: ['/channel'],
  },
  {
    code: 'customers',
    name: '顧客管理',
    description: '客戶資料、公司客戶、客戶群組',
    category: 'premium',
    routes: ['/customers', '/customers/companies', '/customer-groups'],
  },
  // 報價單功能已整合到旅遊團管理中，不再獨立
  // {
  //   code: 'quotes',
  //   name: '報價單',
  //   description: '快速報價、報價管理',
  //   category: 'premium',
  //   routes: ['/quotes', '/quotes/[id]', '/quotes/quick/[id]'],
  // },
  // ===== 企業功能 =====
  {
    code: 'tour_controller',
    name: '團控功能',
    description: '指派團控人員，團控為必填欄位',
    category: 'premium',
    routes: ['/tours'],
  },
  {
    code: 'tour_attributes',
    name: '旅行屬性功能',
    description: '選擇團類型：機票、機加酒、訂房、派車、旅遊團、簽證',
    category: 'premium',
    routes: ['/tours'],
  },
  {
    code: 'tenants',
    name: '租戶管理',
    description: '建立與管理其他公司租戶',
    category: 'enterprise',
    routes: ['/tenants'],
  },
  {
    code: 'cis',
    name: '漫途 CIS 工作流',
    description: '客戶識別系統規劃（漫途整合行銷專屬）— 客戶 + 拜訪紀錄 + 衍生項目價目',
    category: 'enterprise',
    routes: ['/cis', '/cis/pricing'],
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
      return (
        route.startsWith(normalizedFeatureRoute.replace('/[param]', '')) ||
        normalizedRoute === normalizedFeatureRoute
      )
    })
  )
}

// 根據路由取得所有相關的功能（複數）
export function getFeaturesByRoute(route: string): FeatureDefinition[] {
  const normalizedRoute = route.replace(/\/\[.*?\]/g, '/[param]')

  return FEATURES.filter(f =>
    f.routes.some(r => {
      const normalizedFeatureRoute = r.replace(/\/\[.*?\]/g, '/[param]')
      return (
        route.startsWith(normalizedFeatureRoute.replace('/[param]', '')) ||
        normalizedRoute === normalizedFeatureRoute
      )
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
