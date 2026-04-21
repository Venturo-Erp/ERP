/**
 * 基礎型別定義
 * 所有實體的基礎介面和通用型別
 */

// ============================================
// 基礎實體介面
// ============================================

/**
 * BaseEntity - 所有實體的基礎介面
 * 包含共用的 ID 和時間戳記欄位
 */
export interface BaseEntity {
  id: string
  workspace_id?: string | null // 工作空間 ID（業務表格必填，系統表格選填，Supabase 可能回傳 null）
  created_at: string | null // ISO 8601 格式（Supabase 可能回傳 null）
  updated_at: string | null // ISO 8601 格式（Supabase 可能回傳 null）
  created_by?: string | null
  updated_by?: string | null
}

/**
 * SyncableEntity - 可同步實體的基礎介面
 * 繼承 BaseEntity 並加入同步相關欄位
 *
 * FastIn 架構欄位說明：
 * - _needs_sync: 是否需要同步到 Supabase（true = 待同步）
 * - _synced_at: 最後同步時間（null = 尚未同步）
 * - _deleted: 軟刪除標記（用於延遲刪除同步）
 *
 * 注意：使用 null 而非 undefined 以符合 Supabase PostgreSQL 規範
 */
export interface SyncableEntity extends BaseEntity {
  _needs_sync: boolean | null // 是否待同步（Supabase 可能回傳 null）
  _synced_at: string | null // 最後同步時間 (ISO 8601)
  _deleted?: boolean | null // 軟刪除標記
}

// ============================================
// 分頁相關型別
// ============================================

/**
 * PageRequest - 分頁請求參數
 */
export interface PageRequest {
  page: number // 頁碼（從 1 開始）
  page_size: number // 每頁筆數
  sort?: Sort[] // 排序條件
  filter?: Filter[] // 篩選條件
}

/**
 * PageResponse - 分頁回應資料
 */
export interface PageResponse<T> {
  data: T[] // 資料列表
  total: number // 總筆數
  page: number // 當前頁碼
  page_size: number // 每頁筆數
  total_pages: number // 總頁數
}

// ============================================
// 篩選與排序
// ============================================

/**
 * Filter - 篩選條件
 */
export interface Filter {
  field: string // 欄位名稱
  operator: FilterOperator // 運算子
  value: string | number | boolean | string[]
}

/**
 * FilterOperator - 篩選運算子
 */
export type FilterOperator =
  | 'eq' // 等於
  | 'ne' // 不等於
  | 'gt' // 大於
  | 'gte' // 大於等於
  | 'lt' // 小於
  | 'lte' // 小於等於
  | 'like' // 模糊搜尋
  | 'in' // 包含於
  | 'notIn' // 不包含於

/**
 * Sort - 排序條件
 */
export interface Sort {
  field: string
  order: 'asc' | 'desc'
}

// ============================================
// API 回應格式
// ============================================

/**
 * ApiResponse - 統一 API 回應格式
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

/**
 * ApiError - API 錯誤格式
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ============================================
// 載入狀態
// ============================================

/**
 * LoadingState - 載入狀態
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

/**
 * AsyncState - 非同步狀態管理
 */
export interface AsyncState<T> {
  data: T | null
  loading: LoadingState
  error: string | null
}

// ============================================
// 領域基礎型別（原 stores/types/base.types.ts）
// ============================================

// 付款方式
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check'

// 簽證狀態
export type VisaStatus = 'pending' | 'submitted' | 'collected' | 'rejected' | 'returned'

// 待辦事項類型
export type TodoTaskType =
  | 'accommodation' // 訂房
  | 'restaurant' // 訂餐廳
  | 'transport' // 訂交通
  | 'ticket' // 訂票（門票/機票）
  | 'activity' // 訂活動
  | 'general' // 一般任務

// 待辦事項
export interface Todo {
  id: string
  title: string
  priority: 1 | 2 | 3 | 4 | 5 // 星級緊急度
  deadline?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completed?: boolean // 對齊資料庫欄位

  // 任務類型與關聯（新增）
  task_type?: TodoTaskType // 任務類型（決定右半部顯示什麼表單）
  tour_request_id?: string // 連結需求單
  tour_id?: string // 連結團

  // 看板欄位（Trello 風格）
  column_id?: string | null // 所屬看板欄位 ID

  // 人員關係（共享機制）
  creator: string // 建立者（@deprecated 改用 created_by）
  created_by?: string | null // 建立者 employee id
  assignee?: string // 被指派者（可選）
  visibility: string[] // 可見人員ID列表 = [creator, assignee]
  is_public?: boolean // 是否公開給全公司（只有建立者+共享者可編輯，其他人只能查看）

  // 行事曆關聯
  calendar_event_id?: string // 主待辦事項關聯的行事曆事件 ID

  // 關聯資料
  related_items: {
    type: 'group' | 'quote' | 'order' | 'invoice' | 'receipt'
    id: string
    title: string
  }[]

  // 子任務
  sub_tasks: {
    id: string
    title: string
    done: boolean
    completed_at?: string
    calendar_event_id?: string // 關聯的行事曆事件 ID
  }[]

  // 簡單備註（非留言板）
  notes: {
    id?: string // 留言 ID
    timestamp: string
    content: string
    author_id: string // 留言者 ID
    author_name: string // 留言者名稱
    read_by?: string[] // 已讀的使用者 ID 列表
  }[]

  // 快速功能設定
  enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]

  // 通知標記
  needs_creator_notification?: boolean // 被指派人有更新，需要通知建立者

  created_at: string
  updated_at: string
}

// Payment 基礎介面
export interface Payment {
  id: string
  type: 'receipt' | 'request' | 'disbursement'
  order_id?: string
  tour_id?: string
  amount: number
  description: string
  status: 'pending' | 'confirmed' | 'completed'
  created_at: string
  updated_at: string
}

// 企業客戶
export interface Company {
  id: string
  workspace_id: string

  // 基本資訊
  company_name: string
  tax_id: string | null // 統一編號
  phone: string | null
  email: string | null
  website: string | null

  // 發票資訊
  invoice_title: string | null // 發票抬頭
  invoice_address: string | null
  invoice_email: string | null

  // 付款資訊
  payment_terms: number // 付款期限（天）
  payment_method: 'transfer' | 'cash' | 'check' | 'credit_card'
  credit_limit: number // 信用額度

  // 銀行資訊
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null

  // 地址資訊
  registered_address: string | null // 登記地址
  mailing_address: string | null // 通訊地址

  // VIP 等級
  vip_level: number // 0: 普通, 1-5: VIP等級

  // 備註
  notes: string | null

  // 系統欄位
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CompanyContact {
  id: string
  company_id: string

  // 聯絡人資訊
  name: string
  title: string | null // 職稱
  department: string | null // 部門
  phone: string | null
  mobile: string | null
  email: string | null

  // 主要聯絡人標記
  is_primary: boolean

  // 備註
  notes: string | null

  // 系統欄位
  created_at: string
  updated_at: string
}

// 機場圖片季節類型
export type AirportImageSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'all'

// 機場圖片（封面圖片庫）
export interface AirportImage {
  id: string
  airport_code: string // 機場代碼如 CNX, BKK, HND
  image_url: string
  label: string | null // 標籤名稱（如「春季櫻花」「夏季祭典」）
  season: AirportImageSeason | null // 季節分類
  is_default: boolean // 是否為預設圖片
  display_order: number // 排序順序
  uploaded_by: string | null // 上傳者
  workspace_id: string | null
  created_at: string
  updated_at: string
}
