import { Tour } from '@/stores/types'

export interface NewTourData {
  name: string
  tour_type?: 'official' | 'proposal' | 'template' // 團類型
  tour_service_type?:
    | 'flight'
    | 'flight_hotel'
    | 'hotel'
    | 'car_service'
    | 'tour_group'
    | 'visa'
    | 'esim' // 團服務類型
  days_count?: number | null // 天數（提案/模板用）

  // 🔧 核心表架構：統一欄位命名
  countryId?: string // countries.id (如: vietnam, japan) - 核心表主鍵
  countryName?: string // 顯示用國家名稱 (如: 越南, 日本)
  countryCode?: string // countries.code (如: VN, JP) - 用於過濾機場

  cityCode: string // 機場代碼 (如: HAN, TYO)
  cityName?: string // 城市名稱 (如: 河內, 東京)

  customCountry?: string // 自訂國家名稱
  customLocation?: string // 自訂城市名稱
  customCityCode?: string // 自訂城市代號
  departure_date: string
  return_date: string
  price: number
  status: Tour['status']
  isSpecial: boolean
  max_participants: number
  description?: string
  enable_checkin?: boolean // 是否開啟報到功能
  controller_id?: string // 團控人員 ID（舊欄位，保留向後相容）
  role_assignments?: Record<string, string> // 動態選人欄位 { fieldId: employeeId }
  // 註：航班屬於旅遊團「行程編輯」分頁的 SSOT，開團時不再選填，
  // 已移除 outbound_flight_number / outbound_flight_text /
  // return_flight_number / return_flight_text 四個欄位
  department_id?: string // 部門 ID（有 departments 功能時）
}

export interface TourExtraFields {
  addOns: boolean
  refunds: boolean
  customFields: Array<{ id: string; name: string }>
}

export interface DeleteConfirmState {
  isOpen: boolean
  tour: Tour | null
}
