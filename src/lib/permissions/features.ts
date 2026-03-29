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
  routes: string[]  // 這個功能包含哪些路由
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
    category: 'basic',
    routes: [
      '/accounting',
      '/accounting/vouchers',
      '/accounting/accounts',
      '/accounting/reports',
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
    routes: ['/hr', '/hr/attendance', '/hr/leave', '/hr/payroll'],
  },
  {
    code: 'settings',
    name: '系統設定',
    description: '公司設定、角色權限、選單配置',
    category: 'basic',
    routes: ['/settings', '/settings/company', '/settings/roles', '/settings/menu'],
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
  {
    code: 'itinerary',
    name: '行程管理',
    description: '行程編輯器、行程範本',
    category: 'premium',
    routes: ['/itinerary', '/itinerary/new', '/itinerary/block-editor'],
  },
  // 報價單功能已整合到旅遊團管理中，不再獨立
  // {
  //   code: 'quotes',
  //   name: '報價單',
  //   description: '快速報價、報價管理',
  //   category: 'premium',
  //   routes: ['/quotes', '/quotes/[id]', '/quotes/quick/[id]'],
  // },
  {
    code: 'design',
    name: '設計工具',
    description: '手冊設計、行銷素材',
    category: 'premium',
    routes: ['/design', '/brochures', '/marketing'],
  },
  {
    code: 'office',
    name: '文件管理',
    description: '文件編輯、檔案管理',
    category: 'premium',
    routes: ['/office', '/office/editor', '/files'],
  },

  // ===== 進階功能（付費）- 機器人管理 =====
  {
    code: 'bot_line',
    name: 'LINE Bot 管理',
    description: 'LINE 連線管理、群組綁定、自動通知',
    category: 'premium',
    routes: ['/settings/bot-line'],
  },
  {
    code: 'bot_telegram',
    name: 'Telegram Bot 管理',
    description: 'Telegram 機器人、頻道管理',
    category: 'premium',
    routes: ['/settings/bot-telegram'],
  },

  // ===== 企業功能 =====
  {
    code: 'fleet',
    name: '車隊管理',
    description: '車輛、司機、車趟管理',
    category: 'enterprise',
    routes: ['/database/fleet', '/supplier/trips'],
  },
  {
    code: 'local',
    name: 'Local 案件',
    description: '地接案件、委託管理',
    category: 'enterprise',
    routes: ['/local', '/local/cases', '/local/requests'],
  },
  {
    code: 'supplier_portal',
    name: '供應商入口',
    description: '供應商專用介面',
    category: 'enterprise',
    routes: ['/supplier', '/supplier/requests', '/supplier/finance', '/supplier/dispatch'],
  },
  {
    code: 'esims',
    name: 'eSIM 管理',
    description: '網卡管理、派發',
    category: 'enterprise',
    routes: ['/esims'],
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

// 根據路由取得所有相關的功能（複數）
export function getFeaturesByRoute(route: string): FeatureDefinition[] {
  const normalizedRoute = route.replace(/\/\[.*?\]/g, '/[param]')
  
  return FEATURES.filter(f => 
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
