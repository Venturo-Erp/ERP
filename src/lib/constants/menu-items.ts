/**
 * 系統選單項目定義
 * 用於個人化選單設定
 */

export interface MenuItem {
  id: string // 唯一識別碼
  label: string // 顯示名稱
  description?: string // 說明
  icon?: string // 圖示名稱
  category: 'core' | 'business' | 'finance' | 'hr' | 'settings' // 分類
  canHide: boolean // 是否可以隱藏（某些核心功能不能隱藏）
}

export const MENU_ITEMS: MenuItem[] = [
  // 核心功能（不可隱藏）
  {
    id: 'dashboard',
    label: '儀表板',
    description: '系統首頁和概覽',
    category: 'core',
    canHide: false,
  },
  {
    id: 'monitoring',
    label: '監控中心',
    description: 'AI Agents 狀態和任務監控',
    category: 'core',
    canHide: false,
  },
  {
    id: 'workspace',
    label: '工作區',
    description: '個人工作區和協作空間',
    category: 'core',
    canHide: false,
  },
  {
    id: 'settings',
    label: '設定',
    description: '個人設定和系統設定',
    category: 'settings',
    canHide: false,
  },

  // 業務功能
  {
    id: 'tours',
    label: '旅遊團',
    description: '旅遊團管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'quotes',
    label: '報價單',
    description: '報價單管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'orders',
    label: '訂單',
    description: '訂單管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'customers',
    label: '客戶',
    description: '客戶資料管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'todos',
    label: '待辦事項',
    description: '任務和待辦事項',
    category: 'business',
    canHide: true,
  },
  {
    id: 'calendar',
    label: '行事曆',
    description: '行事曆和活動',
    category: 'business',
    canHide: true,
  },

  // 財務功能
  {
    id: 'finance',
    label: '財務',
    description: '財務管理',
    category: 'finance',
    canHide: true,
  },
  {
    id: 'accounting',
    label: '會計',
    description: '會計帳目',
    category: 'finance',
    canHide: true,
  },
  {
    id: 'payments',
    label: '收款',
    description: '收款管理',
    category: 'finance',
    canHide: true,
  },
  {
    id: 'disbursement',
    label: '支出',
    description: '支出管理',
    category: 'finance',
    canHide: true,
  },

  // 人資功能
  {
    id: 'hr',
    label: '人資',
    description: '人力資源管理',
    category: 'hr',
    canHide: true,
  },
  {
    id: 'attendance',
    label: '考勤',
    description: '考勤打卡',
    category: 'hr',
    canHide: true,
  },

  // 其他功能
  {
    id: 'suppliers',
    label: '供應商',
    description: '供應商管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'visas',
    label: '簽證',
    description: '簽證管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'esims',
    label: 'eSIM',
    description: 'eSIM 管理',
    category: 'business',
    canHide: true,
  },
  {
    id: 'attractions',
    label: '景點',
    description: '景點資料庫',
    category: 'business',
    canHide: true,
  },
  {
    id: 'database',
    label: '資料庫',
    description: '資料庫管理',
    category: 'settings',
    canHide: true,
  },
  {
    id: 'office',
    label: '文件',
    description: '文件管理（試算表、文件）',
    category: 'business',
    canHide: true,
  },
]

/**
 * 根據分類取得選單項目
 */
export function getMenuItemsByCategory(category: MenuItem['category']): MenuItem[] {
  return MENU_ITEMS.filter(item => item.category === category)
}

/**
 * 取得可隱藏的選單項目
 */
export function getHideableMenuItems(): MenuItem[] {
  return MENU_ITEMS.filter(item => item.canHide)
}

/**
 * 根據 ID 取得選單項目
 */
export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find(item => item.id === id)
}

/**
 * 選單分類標籤
 */
export const MENU_CATEGORIES = {
  core: '核心功能',
  business: '業務管理',
  finance: '財務管理',
  hr: '人力資源',
  settings: '系統設定',
} as const

/**
 * 選單 href 到 ID 的映射
 * 用於判斷選單項目是否被使用者隱藏
 */
export const MENU_HREF_TO_ID_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/workspace': 'workspace',
  '/settings': 'settings',
  '/tours': 'tours',
  '/orders': 'orders',
  '/customers': 'customers',
  '/todos': 'todos',
  '/calendar': 'calendar',
  '/finance': 'finance',
  '/finance/payments': 'payments',
  '/finance/requests': 'payments',
  '/finance/treasury': 'disbursement',
  '/accounting': 'accounting',
  '/hr': 'hr',
  '/attendance': 'attendance',
  '/database/suppliers': 'suppliers',
  '/visas': 'visas',
  '/esims': 'esims',
  '/attractions': 'attractions',
  '/database': 'database',
  '/office': 'office',
}

/**
 * 檢查選單項目是否被隱藏
 */
export function isMenuItemHidden(href: string, hiddenMenuItems: string[]): boolean {
  const menuId = MENU_HREF_TO_ID_MAP[href]
  if (!menuId) return false // 如果沒有對應的 ID，預設不隱藏
  return hiddenMenuItems.includes(menuId)
}
