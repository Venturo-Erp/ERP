import { Tour } from '@/stores/types'

export interface NewTourData {
  name: string
  tour_type?: 'official' | 'proposal' | 'template' // 團類型
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
  outbound_flight_number?: string // 去程航班號碼 (如: BR190)
  outbound_flight_text?: string // 去程航班文字 (如: BR 190 07:25-11:45)
  return_flight_number?: string // 回程航班號碼 (如: BR191)
  return_flight_text?: string // 回程航班文字 (如: BR 191 13:00-16:30)
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
