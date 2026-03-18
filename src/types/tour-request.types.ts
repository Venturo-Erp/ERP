/**
 * TourRequestItem — tour_requests.items JSONB 陣列的每個元素型別
 * 所有欄位都是 optional，因為不同 category 用不同欄位
 */
export interface TourRequestItem {
  category?: string
  title?: string
  description?: string
  service_date?: string | null
  service_date_end?: string | null
  quantity?: number | null
  pax?: number | null
  unit_cost?: number | null
  estimated_cost?: number | null
  final_cost?: number | null
  quoted_cost?: number | null
  reply_note?: string | null
  booking_confirmed?: boolean
  booking_ref?: string | null
  day_number?: number | null
  vehicle_desc?: string | null
  meal_time?: string | null
  hotel_note?: string | null
  meal_note?: string | null
  transport_note?: string | null
  rooms?: { room_type: string; quantity: number; nights?: number }[]
  supplier_name?: string | null
  supplier_id?: string | null
  google_maps_url?: string | null
  [key: string]: unknown // 允許額外欄位
}

/**
 * TourRequest 擴展型別 — 補充 generated types 缺少的欄位
 * 用法：const req = data as TourRequestRow
 */
export interface TourRequestRow {
  id: string
  workspace_id: string
  tour_id?: string | null
  request_type?: string | null
  category?: string | null
  title?: string | null
  description?: string | null
  supplier_name?: string | null
  supplier_id?: string | null
  status?: string | null
  response_status?: string | null
  items?: TourRequestItem[] | null
  note?: string | null
  quantity?: number | null
  estimated_cost?: number | null
  final_cost?: number | null
  quoted_cost?: number | null
  service_date?: string | null
  service_date_end?: string | null
  reply_note?: string | null
  booking_confirmed?: boolean | null
  booking_ref?: string | null
  code?: string | null
  close_note?: string | null
  closed_at?: string | null
  closed_by?: string | null
  confirmed_at?: string | null
  confirmed_by?: string | null
  created_at?: string | null
  created_by?: string | null
  updated_at?: string | null
  replied_at?: string | null
  sent_at?: string | null
  package_price?: number | null
  [key: string]: unknown
}
