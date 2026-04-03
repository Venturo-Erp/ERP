// ============================================
// 景點選擇系統型別定義
// ============================================

export interface Destination {
  id: string
  city: string
  name: string
  name_en?: string
  category?: string
  description?: string
  latitude?: number
  longitude?: number
  tags?: string[]
  image_url?: string  // 舊欄位（相容性）
  images?: string[]  // 新欄位（多張圖片）
  priority: number
  google_maps_url?: string
  opening_hours?: string
  ticket_price?: string
  duration_minutes?: number  // 建議停留時間
  verification_status?: 'pending' | 'reviewing' | 'verified'
  verified_by?: string
  verified_at?: string
  verification_notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerDestinationPick {
  id: string
  line_user_id: string
  destination_id: string
  session_id?: string
  selected_at: string
  // Join 欄位
  destination?: Destination
}

// 景點類別
export const DESTINATION_CATEGORIES = {
  CULTURE: '文化古蹟',
  NATURE: '自然風光',
  FAMILY: '親子活動',
  ROMANCE: '浪漫悠閒',
  FOOD: '美食購物',
  ART: '文創藝術',
  ADVENTURE: '冒險活動',
  EXPERIENCE: '文化體驗',
} as const

export type DestinationCategory = typeof DESTINATION_CATEGORIES[keyof typeof DESTINATION_CATEGORIES]

// 景點分組（用於 LINE Bot 顯示）
export interface DestinationGroup {
  category: DestinationCategory
  emoji: string
  destinations: Destination[]
}

// 客戶選擇摘要
export interface CustomerPicksSummary {
  total: number
  by_category: Record<string, number>
  destinations: Destination[]
  suggested_days: number
}
