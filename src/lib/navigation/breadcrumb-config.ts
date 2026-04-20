/**
 * Breadcrumb 路由配置
 *
 * 定義所有路由到 breadcrumb 的映射關係
 * 支援階層式導航自動生成
 */

export interface BreadcrumbConfig {
  /** 顯示標籤 */
  label: string
  /** 父路由（用於生成階層式 breadcrumb） */
  parent?: string
  /** 是否隱藏此層（用於中間層路由） */
  hidden?: boolean
}

/**
 * 路由到 Breadcrumb 的映射配置
 *
 * 規則：
 * 1. 每個路由都需要定義 label
 * 2. 使用 parent 指向上層路由來建立階層關係
 * 3. 動態路由使用 [param] 格式，實際使用時會被替換
 */
export const BREADCRUMB_CONFIG: Record<string, BreadcrumbConfig> = {
  // ========== 首頁 ==========
  '/': { label: '首頁', hidden: true },

  // ========== 業務管理 ==========
  '/tours': { label: '團管理', parent: '/' },
  '/orders': { label: '訂單管理', parent: '/' },
  '/contracts': { label: '合約管理', parent: '/' },
  '/confirmations': { label: '確認單', parent: '/' },
  '/confirmations/[id]': { label: '確認單詳情', parent: '/confirmations' },
  '/tour-requests': { label: '需求確認單', parent: '/' },

  // 註：/quotes 和 /itinerary 已整合進 /tours/[code] 的 tabs、不再是獨立路由（2026-04-20）

  // ========== 客戶管理 ==========
  '/customers': { label: '客戶管理', parent: '/' },
  '/customers/companies': { label: '公司客戶', parent: '/customers' },

  // ========== 財務管理 ==========
  '/finance': { label: '財務管理', parent: '/' },
  '/finance/requests': { label: '請款單', parent: '/finance' },
  '/finance/payments': { label: '收款管理', parent: '/finance' },
  '/finance/reports': { label: '財務報表', parent: '/finance' },
  '/finance/treasury': { label: '出納管理', parent: '/finance' },
  '/finance/treasury/disbursement': { label: '出帳單', parent: '/finance/treasury' },
  '/finance/travel-invoice': { label: '代轉發票', parent: '/finance' },
  '/finance/travel-invoice/[id]': { label: '發票詳情', parent: '/finance/travel-invoice' },
  '/finance/travel-invoice/create': { label: '開立發票', parent: '/finance/travel-invoice' },

  // ========== 會計系統 ==========
  '/accounting': { label: '會計', parent: '/' },

  // ========== 資料庫管理 ==========
  '/database': { label: '資料庫', parent: '/' },
  '/database/attractions': { label: '景點資料庫', parent: '/database' },
  '/database/suppliers': { label: '供應商', parent: '/database' },
  '/database/tour-leaders': { label: '領隊資料庫', parent: '/database' },
  '/database/transportation-rates': { label: '交通費率', parent: '/database' },
  '/database/company-assets': { label: '公司資產', parent: '/database' },
  '/database/archive-management': { label: '檔案管理', parent: '/database' },

  // ========== 其他功能 ==========
  '/calendar': { label: '行事曆', parent: '/' },
  '/visas': { label: '簽證管理', parent: '/' },
  '/esims': { label: 'eSIM 管理', parent: '/' },
  '/todos': { label: '待辦事項', parent: '/' },
  // timebox removed
  // manifestation removed
  '/hr': { label: '人資管理', parent: '/' },
  '/workspace': { label: '工作區', parent: '/' },

  // ========== 設定 ==========
  '/settings': { label: '設定', parent: '/' },
  '/settings/workspaces': { label: '工作區設定', parent: '/settings' },
  '/settings/permissions': { label: '權限設定', parent: '/settings' },
  '/settings/menu': { label: '選單設定', parent: '/settings' },
  '/settings/modules': { label: '模組設定', parent: '/settings' },

  // ========== 工具 ==========
  '/tools': { label: '工具', parent: '/', hidden: true },
  '/tools/flight-itinerary': { label: '航班行程', parent: '/' },
  '/tools/hotel-voucher': { label: '飯店憑證', parent: '/' },
  '/tools/reset-db': { label: '重置資料庫', parent: '/' },

  // ========== 報表 ==========
  '/reports': { label: '報表', parent: '/', hidden: true },
  '/reports/tour-closing': { label: '結團報表', parent: '/' },

  // ========== 健身模組 ==========
  // fitness removed

  // ========== 行動版 ==========
  '/m': { label: '行動版', parent: '/' },
  '/m/workbench': { label: '工作台', parent: '/m' },
  '/m/profile': { label: '個人資料', parent: '/m' },
  '/m/search': { label: '搜尋', parent: '/m' },
  '/m/todos': { label: '待辦事項', parent: '/m' },
  '/m/tours/[id]': { label: '團詳情', parent: '/m' },
  '/m/members/[id]': { label: '成員詳情', parent: '/m' },
}

/**
 * 取得路由的 breadcrumb 配置
 *
 * @param pathname - 當前路由路徑
 * @returns BreadcrumbConfig 或 undefined
 */
export function getBreadcrumbConfig(pathname: string): BreadcrumbConfig | undefined {
  // 先嘗試直接匹配
  if (BREADCRUMB_CONFIG[pathname]) {
    return BREADCRUMB_CONFIG[pathname]
  }

  // 嘗試匹配動態路由
  // 將實際路徑轉換為模式（例如 /quotes/abc123 -> /quotes/[id]）
  const segments = pathname.split('/').filter(Boolean)
  const patterns = generatePatterns(segments)

  for (const pattern of patterns) {
    if (BREADCRUMB_CONFIG[pattern]) {
      return BREADCRUMB_CONFIG[pattern]
    }
  }

  return undefined
}

/**
 * 生成可能的路由模式
 * 例如：/quotes/abc123 可能匹配 /quotes/[id]
 */
function generatePatterns(segments: string[]): string[] {
  const patterns: string[] = []
  const path = '/' + segments.join('/')
  patterns.push(path)

  // 嘗試將最後一個 segment 替換為 [id]
  if (segments.length > 0) {
    const withIdPattern = '/' + [...segments.slice(0, -1), '[id]'].join('/')
    patterns.push(withIdPattern)
  }

  // 嘗試將最後一個 segment 替換為 [param] 格式
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1]
    // 如果最後一個 segment 看起來像是動態 ID（UUID、數字等）
    if (isLikelyDynamicSegment(lastSegment)) {
      patterns.push('/' + [...segments.slice(0, -1), '[id]'].join('/'))
    }
  }

  return patterns
}

/**
 * 判斷 segment 是否可能是動態參數
 */
function isLikelyDynamicSegment(segment: string): boolean {
  // UUID 格式
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true
  }
  // 純數字
  if (/^\d+$/.test(segment)) {
    return true
  }
  // 混合英數字且長度 > 8（可能是短 ID）
  if (/^[a-zA-Z0-9]{8,}$/.test(segment)) {
    return true
  }
  return false
}

/**
 * 將動態路由模式轉換為實際路徑
 *
 * @param pattern - 路由模式（例如 /quotes/[id]）
 * @param params - 參數對象（例如 { id: 'abc123' }）
 * @returns 實際路徑
 */
export function resolvePath(pattern: string, params: Record<string, string>): string {
  let path = pattern
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`[${key}]`, value)
  }
  return path
}
