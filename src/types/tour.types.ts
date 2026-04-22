/**
 * 旅遊團相關型別定義
 * 統一來源：所有行程、航班、行程表型別皆定義於此
 */

import { BaseEntity } from './base.types'
import type { TierPricing } from './quote-store.types'

// ============================================
// 航班相關型別
// ============================================

// 單一航班段資訊（用於轉機或多段航班）
export interface FlightSegment {
  airline: string // 航空公司
  flightNumber: string // 班次
  departureAirport: string // 出發機場代碼
  arrivalAirport: string // 抵達機場代碼
  departureDate?: string | null // 出發日期
  departureTime?: string | null // 出發時間
  arrivalTime?: string | null // 抵達時間
  status?: string // 訂位狀態（如：HK）
  class?: string // 艙等
}

// 航班資訊（含多段航班支援）
export interface FlightInfo {
  airline: string // 航空公司（主要航班）
  flightNumber: string // 班次（主要航班）
  departureAirport: string // 出發機場代碼（如：TPE）
  departureTime: string // 出發時間（如：06:50）
  departureDate?: string // 出發日期（如：10/21）
  arrivalAirport: string // 抵達機場代碼（如：FUK）
  arrivalTime: string // 抵達時間（如：09:55）
  duration?: string // 飛行時間（如：2小時5分）
  // 多段航班支援（轉機或分批出發）
  pnr?: string // PNR 訂位代號
  segments?: FlightSegment[] // 所有航班段（含轉機）
}

// ============================================
// 團員相關型別
// ============================================

export interface Member {
  id: string
  order_id: string
  // 基本資料
  chinese_name: string | null // 中文姓名
  passport_name: string | null // 護照拼音
  name?: string // 向下相容
  name_en?: string // 向下相容（拼音）
  birth_date: string | null // YYYY-MM-DD

  passport_number: string | null
  passport_expiry: string | null // YYYY-MM-DD
  id_number: string | null // 身分證字號
  gender: 'M' | 'F' | '' | null // 性別
  age: number | null // 年齡
  member_type: string // 成員類型
  identity: string | null // 身份（主要聯絡人等）

  // 餐食與健康
  special_meal: string | null // 特殊餐食需求

  // 訂位與航班
  pnr: string | null // 訂位代號
  reservation_code?: string // 向下相容

  // 住宿資訊
  hotel_1_name: string | null
  hotel_1_checkin: string | null
  hotel_1_checkout: string | null
  hotel_2_name: string | null
  hotel_2_checkin: string | null
  hotel_2_checkout: string | null
  assigned_room?: string // 向下相容

  // 報到資訊
  checked_in: boolean | null // 是否已報到
  checked_in_at: string | null // 報到時間

  // 財務資訊
  cost_price: number | null // 成本價
  selling_price: number | null // 售價
  flight_cost: number | null // 機票成本
  transport_cost: number | null // 交通成本
  misc_cost: number | null // 雜費
  total_payable: number | null // 應付總額
  profit: number | null // 利潤
  deposit_amount: number | null // 訂金
  deposit_receipt_no: string | null // 訂金收據號
  balance_amount: number | null // 尾款
  balance_receipt_no: string | null // 尾款收據號

  // 關聯
  customer_id: string | null

  // 機票相關
  ticket_number: string | null // 機票號碼
  ticketing_deadline: string | null // 開票截止日
  flight_self_arranged: boolean | null // 自理機票

  // 護照列印
  passport_name_print: string | null // 護照姓名列印格式（行李吊牌用）

  // 排序
  sort_order: number | null // 排序順序

  // 其他
  is_child_no_bed?: boolean // 小孩不佔床
  add_ons?: string[] // 加購項目IDs
  refunds?: string[] // 退費項目IDs
  custom_fields?: Record<string, unknown> // 自定義欄位數據 {fieldId: value}
  passport_image_url?: string | null // 護照照片 URL
  created_at: string | null
  updated_at: string | null // BaseEntity 相容（DB order_members 表無此欄位，由 trigger 或前端填入）
}

export interface TourAddOn {
  id: string
  tour_id: string
  name: string
  price: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================
// 行程表相關型別
// ============================================

export interface ItineraryFeature {
  icon: string // icon 名稱 (如: "IconBuilding")
  title: string
  description: string
}

export interface FocusCard {
  title: string
  src: string // 圖片 URL
}

export interface LeaderInfo {
  name: string // 中文名稱
  englishName?: string | null // 英文暱稱
  domesticPhone: string
  overseasPhone: string
  // 進階欄位（Art/Collage 風格使用）
  lineId?: string | null
  photo?: string | null
  title?: string | null
  description?: string | null
}

export interface MeetingInfo {
  time: string // ISO 8601 格式
  location: string
  // 進階欄位（Art/Collage 風格使用）
  date?: string | null
  flightNo?: string | null
  airline?: string | null
}

export interface HotelInfo {
  name: string
  description: string
  image?: string // 舊版單張圖片（向後相容）
  images?: string[] // 新版多張圖片（最多4張）
  location?: string // 飯店位置（Art/Collage 風格用）
}

export interface DailyActivity {
  icon: string // emoji 或 icon
  title: string
  description: string
  image?: string
}

export interface DailyMeals {
  breakfast: string
  lunch: string
  dinner: string
}

// 每日圖片（支援位置調整）
export interface DailyImage {
  url: string
  position?: string // object-position 值，如 "center", "center top", "center 30%"
}

export interface DailyItineraryDay {
  dayLabel: string // 如: "Day 1"
  date: string // 如: "10/21 (二)"
  title: string
  highlight?: string
  description?: string
  // 以下欄位不存資料庫，展示時從核心表 JOIN 取得（syncToCore 時才用完整資料）
  activities?: DailyActivity[]
  recommendations?: string[]
  meals?: DailyMeals
  accommodation?: string
  accommodationUrl?: string // 飯店官網或訂房連結
  accommodationRating?: number // 飯店星級（1-5）
  isSameAccommodation?: boolean // 是否續住（與前一天相同住宿）
  images?: (string | DailyImage)[] // 支援舊格式 string 和新格式 DailyImage
}

// 費用包含/不含項目
export interface PricingItem {
  text: string // 項目文字
  included: boolean // 是否包含
}

// 詳細團費資訊
export interface PricingDetails {
  show_pricing_details?: boolean // 是否顯示詳細團費
  insurance_amount?: '250' | '300' | '500' | string // 旅遊責任險金額（萬元），可選擇或自訂
  included_items: PricingItem[] // 費用包含項目
  excluded_items: PricingItem[] // 費用不含項目
  notes: string[] // 注意事項
}

// 行程表版本記錄（存在同一筆資料的 JSON 陣列裡）
export interface ItineraryVersionRecord {
  id: string // UUID
  version: number // 版本號
  note: string // 版本備註（如：原始版、客戶修改版）
  // 可變動的內容
  daily_itinerary: DailyItineraryDay[]
  features?: ItineraryFeature[]
  focus_cards?: FocusCard[]
  leader?: LeaderInfo
  meeting_info?: MeetingInfo
  hotels?: HotelInfo[]
  // 時間戳記
  created_at: string
}

/**
 * Itinerary - 行程表型別定義
 */
export interface Itinerary {
  // 基礎欄位
  id: string
  code?: string // 行程編號（如：I20240001）
  tour_id?: string // 關聯的團 ID（選填，因為可能只是草稿）
  quote_id?: string // 關聯的報價單 ID（選填）

  // 模板支援
  template_id?: string | null // 模板 ID（模板時有值，實際團時為 null）
  template_code?: string | null // 模板代號（例如：TPL-JPN-001）
  template_name?: string | null // 模板名稱（例如：日本東京經典 5 日遊）

  // 多租戶支援
  workspace_id?: string // Workspace ID（多租戶隔離）

  // 封面資訊
  name?: string // 行程名稱（向後相容別名，等同 title）
  destination?: string // 目的地（向後相容）
  tagline: string
  title: string
  subtitle: string
  description: string
  departure_date: string
  tour_code: string
  cover_image: string
  country: string
  city: string
  status: TourStatus
  cover_style?: 'original' | 'gemini' | 'nature' | 'luxury' | 'art' | 'dreamscape' | 'collage' // 封面風格
  flight_style?:
    | 'original'
    | 'chinese'
    | 'japanese'
    | 'luxury'
    | 'art'
    | 'none'
    | 'dreamscape'
    | 'collage' // 航班卡片風格
  itinerary_style?: 'original' | 'luxury' | 'art' | 'dreamscape' // 每日行程風格
  price?: string | null // 價格（如：39,800）
  price_note?: string | null // 價格備註（如：起、/人）

  // 航班資訊（支援多航段轉機）
  outbound_flight?: FlightInfo | FlightInfo[]
  return_flight?: FlightInfo | FlightInfo[]
  flight_info?: {
    outbound?: {
      flightNumber: string
      airline: string
      departureAirport: string
      arrivalAirport: string
      departureTime: string
      arrivalTime: string
    } | null
    return?: {
      flightNumber: string
      airline: string
      departureAirport: string
      arrivalAirport: string
      departureTime: string
      arrivalTime: string
    } | null
  } | null

  // 行程特色
  features: ItineraryFeature[]
  show_features?: boolean

  // 精選景點
  focus_cards: FocusCard[]

  // 領隊資訊
  leader?: LeaderInfo
  show_leader_meeting?: boolean

  // 集合資訊
  meeting_info?: MeetingInfo

  // 飯店資訊
  hotels?: HotelInfo[]
  show_hotels?: boolean

  // 行程副標題
  itinerary_subtitle?: string

  // 逐日行程
  daily_itinerary: DailyItineraryDay[]

  // 版本記錄（像 Excel 分頁）
  version_records?: ItineraryVersionRecord[]

  // 狀態相關欄位
  is_template?: boolean // 是否為公司範例行程
  closed_at?: string | null // 結案時間

  // 詳細團費
  pricing_details?: PricingDetails
  show_pricing_details?: boolean

  // 價格方案（多種人數價格）
  // 行程表用 price_tiers，團用 tier_pricings
  price_tiers?: PriceTier[] | null
  show_price_tiers?: boolean

  // 常見問題
  faqs?: FAQ[] | null
  show_faqs?: boolean

  // 提醒事項
  notices?: string[] | null
  show_notices?: boolean

  // 取消政策
  cancellation_policy?: string[] | null
  show_cancellation_policy?: boolean

  // 審計追蹤欄位
  created_at: string
  updated_at: string
  created_by?: string // 建立者的 employee ID
  updated_by?: string // 最後修改者的 employee ID
  archived_at?: string | null
  archived?: boolean // 是否已封存
  archive_reason?: string | null // 封存原因：no_deal、cancelled、test_error

  // 離線同步支援
  _deleted?: boolean
  _needs_sync?: boolean
  _synced_at?: string
}

// 價格方案（如 4人包團、6人包團、8人包團）
export interface PriceTier {
  // 基本欄位（報價單用）
  label: string // 如「4人包團」、「6人包團」
  sublabel?: string // 如「每人」
  price: string // 如「34,500」
  priceNote?: string // 如「起」
  addon?: string // 如「加購1日包車 / 每人+NT$900」
  // 展示層欄位（Tour Section 用）
  name?: string // 方案名稱（展示用，同 label）
  description?: string // 方案說明
  pricePerPerson?: number | string // 每人價格（數值或格式化字串）
  features?: string[] // 方案包含項目
}

// 常見問題
export interface FAQ {
  question: string // 問題
  answer: string // 答案
}

// ============================================
// 旅遊團介面
// ============================================

/**
 * Tour - 旅遊團資料
 * 注意：所有可選欄位使用 | null 以符合 Supabase PostgreSQL 規範
 */
export interface Tour extends BaseEntity {
  code: string // 團號（統一使用 code）
  name: string // 團名
  tour_type?: TourType | null // 團類型：official/proposal/template
  days_count?: number | null // 天數（提案/模板用）
  /**
   * @deprecated 已退役欄位（原為「目的地」字串，現由 country_id + airport_code 衍生）。
   * 顯示用途請改用 useTourDisplay / getTourDestinationDisplay helper。
   * 新程式碼禁止讀寫此欄位。DB 欄位本身將在所有寫入點停止後另行 migration drop。
   */
  location?: string | null
  country_id?: string | null // 國家 ID
  airport_code?: string | null // 機場代號
  departure_date: string | null // 出發日期 (ISO 8601)（提案/模板可為 null）
  return_date: string | null // 返回日期 (ISO 8601)（提案/模板可為 null）
  status?: string | null // 狀態（英文）
  price?: number | null // 基本價格
  selling_price_per_person?: number | null // 每人售價（從報價單帶入）
  max_participants?: number | null // 最大參與人數（相容舊欄位：max_people）
  current_participants?: number | null // 當前參與人數
  contract_status: string // 合約狀態
  total_revenue: number // 總收入
  total_cost: number // 總成本
  profit: number // 利潤
  description?: string | null // 團體說明/描述
  archived?: boolean | null // 是否已封存
  is_active?: boolean | null // 是否啟用
  features?: unknown // 行程特色（用於展示頁面，對應 Supabase Json）
  quote_id?: string | null // 關聯的報價單 ID（唯一）
  itinerary_id?: string | null // 關聯的行程表 ID（唯一）
  quote_cost_structure?: unknown // 報價成本結構快照（對應 Supabase Json）
  // 合約相關欄位
  contract_template?: string | null // 合約範本
  contract_content?: string | null // 合約內容
  contract_notes?: string | null // 合約備註
  contract_completed?: boolean | null // 合約是否完成
  contract_created_at?: string | null // 合約建立時間
  contract_archived_date?: string | null // 合約封存日期
  envelope_records?: string | null // 信封記錄

  // 結團相關欄位
  closing_status?: string | null // 結團狀態：open(進行中), closing(結團中), closed(已結團)
  closing_date?: string | null // 結團日期
  closed_by?: string | null // 結團操作人員 ID

  // 團服務類型與團控
  tour_service_type?: TourServiceType | null // 團服務類型
  controller_id?: string | null // 團控人員 ID（負責開團的人）
  department_id?: string | null // 部門 ID

  // 報到功能欄位
  enable_checkin?: boolean | null // 是否開啟報到功能
  checkin_qrcode?: string | null // 團體報到 QR Code 內容

  // 定價欄位（從報價單搬過來，一個團 = 一個報價單）
  selling_prices?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  participant_counts?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  tier_pricings?: TierPricing[] | null
  accommodation_days?: number | null

  /**
   * @deprecated 航班 SSOT 已移到 itineraries.outbound_flight / return_flight。
   * 請從 itineraries 讀取，新程式碼禁止讀寫此欄位。
   * DB 欄位本身將在所有讀取點停止後另行 migration drop。
   */
  outbound_flight?: FlightInfo | FlightInfo[] | null
  /** @deprecated 同 outbound_flight，請從 itineraries 讀取 */
  return_flight?: FlightInfo | FlightInfo[] | null

  // 版本鎖定欄位已移除 - 公司規範：一團一份，不需版本鎖定

  // 同步欄位
  _deleted?: boolean | null // 軟刪除標記
  _needs_sync?: boolean | null // 需要同步
  _synced_at?: string | null // 最後同步時間
}

// ============================================
// 旅遊團狀態
// ============================================

/**
 * TourStatus - 旅遊團狀態（中文）
 *
 * 生命週期流程:
 * 開團 → 待出發 → 已出發 → 待結團 → 已結團
 *                                      ↓
 *                                    取消
 *
 * - 開團：可編輯行程
 * - 待出發：已確認出團，行程鎖定
 * - 已出發：團已出發
 * - 待結團：等待結算
 * - 已結團：團結束，結算獎金
 * - 取消：已取消
 */
export type TourStatus =
  | '開團' // 可編輯行程
  | '待出發' // 已確認出團，行程鎖定
  | '已出發' // 團已出發
  | '待結團' // 等待結算
  | '已結團' // 團結束，結算獎金
  | '取消' // 已取消

/**
 * ContractStatus - 合約狀態（英文）
 */
export type ContractStatus =
  | 'pending' // 未簽署
  | 'partial' // 部分簽署
  | 'signed' // 已簽署

/**
 * ContractTemplate - 合約範本類型
 */
export type ContractTemplate =
  | 'domestic' // 國內旅遊定型化契約（1120908修訂版）
  | 'international' // 國外旅遊定型化契約（1120908修訂版）
  | 'individual_international' // 國外個別旅遊定型化契約（1120908修訂版）

/**
 * TourCategory - 旅遊團分類
 */
/**
 * TourType - 旅遊團類型
 * - official: 正式開團（有日期、有團號）
 * - proposal: 提案（沒有日期，開團時補日期產生團號）
 * - template: 模板（沒有日期，開團時複製一份新團）
 */
export type TourType = 'official' | 'proposal' | 'template'

/**
 * TourServiceType - 團服務類型
 */
export type TourServiceType =
  | 'flight'
  | 'flight_hotel'
  | 'hotel'
  | 'car_service'
  | 'tour_group'
  | 'visa'
  | 'esim'

export type TourCategory =
  | 'domestic' // 國內
  | 'international' // 國外
  | 'group' // 團體
  | 'custom' // 客製化
  | 'cruise' // 郵輪
  | 'study' // 遊學

// ============================================
// 旅遊團建立與更新
// ============================================

/**
 * CreateTourData - 建立旅遊團所需資料
 */
export interface CreateTourData {
  code?: string // 可選，由 createStore 自動生成
  name: string
  tour_type?: TourType
  days_count?: number | null
  location: string
  departure_date: string | null
  return_date: string | null
  status: TourStatus
  price: number
  selling_price_per_person?: number
  max_participants: number
  contract_status: ContractStatus
  total_revenue: number
  total_cost: number
  profit: number
  quote_id?: string
  quote_cost_structure?: unknown
}

/**
 * UpdateTourData - 更新旅遊團資料
 */
export interface UpdateTourData {
  code?: string
  name?: string
  tour_type?: TourType
  days_count?: number | null
  location?: string
  departure_date?: string | null
  return_date?: string | null
  status?: TourStatus
  price?: number
  selling_price_per_person?: number
  max_participants?: number
  contract_status?: ContractStatus
  total_revenue?: number
  total_cost?: number
  profit?: number
  quote_id?: string
  quote_cost_structure?: unknown
  // 定價欄位
  selling_prices?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  participant_counts?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  tier_pricings?: TierPricing[] | null
  accommodation_days?: number | null
}

// ============================================
// 旅遊團查詢與篩選
// ============================================

/**
 * TourFilter - 旅遊團篩選條件
 */
export interface TourFilter {
  status?: TourStatus | TourStatus[]
  category?: TourCategory | TourCategory[]
  destination?: string
  start_date_from?: string
  start_date_to?: string
  is_active?: boolean
  search_term?: string // 搜尋團號或團名
}

/**
 * TourListItem - 旅遊團列表項目（精簡版）
 */
export interface TourListItem {
  id: string
  code: string
  name: string
  tour_type?: TourType | null
  days_count?: number | null
  location: string
  departure_date: string | null
  return_date: string | null
  status: TourStatus
  max_participants: number
  price: number
}

// ============================================
// 旅遊團統計
// ============================================

/**
 * TourStats - 旅遊團統計資料
 */
export interface TourStats {
  total_tours: number
  active_tours: number
  completed_tours: number
  cancelled_tours: number
  total_revenue: number
  average_price: number
}
