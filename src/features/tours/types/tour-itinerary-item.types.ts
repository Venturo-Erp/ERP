/**
 * TourItineraryItem — 核心表型別
 *
 * 對應 DB 表 `tour_itinerary_items`（54 欄）
 * 設計：「一 row 走到底」— 同一個行程項目的所有階段資訊都在同一 row
 */

// === Category 常量 ===
export const ITINERARY_ITEM_CATEGORIES = {
  TRANSPORT: 'transport',
  GROUP_TRANSPORT: 'group-transport',
  ACCOMMODATION: 'accommodation',
  MEALS: 'meals',
  ACTIVITIES: 'activities',
  OTHERS: 'others',
  GUIDE: 'guide',
} as const

export type ItineraryItemCategory =
  (typeof ITINERARY_ITEM_CATEGORIES)[keyof typeof ITINERARY_ITEM_CATEGORIES]

// === Sub-category 常量 ===
export const MEAL_SUB_CATEGORIES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
} as const

export type MealSubCategory = (typeof MEAL_SUB_CATEGORIES)[keyof typeof MEAL_SUB_CATEGORIES]

// === Status 常量 ===
export const ITEM_QUOTE_STATUS = {
  NONE: 'none',
  DRAFTED: 'drafted',
  CONFIRMED: 'confirmed',
} as const

export const ITEM_CONFIRMATION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
} as const

export const ITEM_LEADER_STATUS = {
  NONE: 'none',
  FILLED: 'filled',
  REVIEWED: 'reviewed',
} as const

export const ITEM_REQUEST_STATUS = {
  NONE: 'none',
  SENT: 'sent',
  REPLIED: 'replied',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const

// === 主型別 ===
export interface TourItineraryItem {
  // 主鍵 & 關聯
  id: string
  tour_id: string | null
  itinerary_id: string | null
  workspace_id: string

  // 行程欄位
  day_number: number | null
  sort_order: number
  category: ItineraryItemCategory | null
  sub_category: string | null
  title: string | null
  description: string | null
  service_date: string | null
  service_date_end: string | null
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  latitude: number | null
  longitude: number | null
  google_maps_url: string | null

  // 報價欄位
  unit_price: number | null
  quantity: number | null
  total_cost: number | null
  currency: string
  pricing_type: string | null
  adult_price: number | null
  child_price: number | null
  infant_price: number | null
  quote_note: string | null
  quote_item_id: string | null

  // 需求欄位
  supplier_id: string | null
  supplier_name: string | null
  request_id: string | null
  request_status: string
  request_sent_at: string | null
  request_reply_at: string | null
  reply_content: Record<string, unknown> | null
  reply_cost: number | null
  estimated_cost: number | null
  quoted_cost: number | null

  // 確認欄位
  confirmation_item_id: string | null
  confirmed_cost: number | null
  booking_reference: string | null
  booking_status: string | null
  confirmation_date: string | null
  confirmation_note: string | null

  // 交通（司機資訊）
  driver_name: string | null
  driver_phone: string | null
  vehicle_plate: string | null
  vehicle_type: string | null
  booking_confirmed_at: string | null

  // 領隊回填欄位
  actual_expense: number | null
  expense_note: string | null
  expense_at: string | null
  receipt_images: string[] | null

  // 狀態追蹤
  quote_status: string
  confirmation_status: string
  leader_status: string

  // 顯示控制
  show_on_web: boolean
  show_on_brochure: boolean
  show_on_quote: boolean

  // 指派欄位
  assignee_id: string | null
  assigned_at: string | null
  assigned_by: string | null

  // 負責方標示（Local 報價後鎖定）
  handled_by: 'self' | 'local' | null

  // 元資料
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// === 建立/更新用的 Partial 型別 ===
export type TourItineraryItemCreate = Omit<
  TourItineraryItem,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string
}

export type TourItineraryItemUpdate = Partial<
  Omit<TourItineraryItem, 'id' | 'created_at' | 'updated_at'>
>
