/**
 * RequirementsList 相關型別定義
 */

import type { Tour } from '@/stores/types'

// ============================================
// Props
// ============================================

export interface RequirementsListProps {
  tourId?: string
  quoteId?: string | null
  onOpenRequestDialog?: (data: {
    category: string
    supplierName: string
    items: { serviceDate: string | null; title: string; quantity: number; note?: string }[]
    tour?: Tour
    startDate: string | null
  }) => void
  className?: string
}

// ============================================
// 需求單
// ============================================

export interface TourRequestItem {
  room_type: string
  quantity: number
  nights?: number
  note?: string
  category?: string
  title?: string
  service_date?: string | null
  unit_cost?: number | null
  quoted_cost?: number | null
  day_number?: number
  resource_id?: string | null
  itinerary_item_id?: string | null
}

export interface TourRequest {
  id: string
  code: string
  category: string
  supplier_name: string
  supplier_id?: string | null
  title: string
  service_date: string | null
  quantity: number | null
  note?: string | null
  notes?: string | null
  status?: string | null
  quoted_cost?: number | null
  hidden?: boolean | null
  resource_id?: string | null
  resource_type?: string | null
  request_type?: string | null
  items?: TourRequestItem[] | null
  created_at?: string | null
  sent_at?: string | null
  sent_via?: string | null
  sent_to?: string | null
  replied_at?: string | null
  confirmed_at?: string | null
  source_id?: string | null
  source_type?: string | null
  supplier_response?: unknown | null
}

// ============================================
// 報價單項目
// ============================================

export interface QuoteItem {
  category: string
  supplierName: string
  title: string
  serviceDate: string | null
  quantity: number
  key: string
  notes?: string
  resourceType?: string | null
  resourceId?: string | null
  latitude?: number | null
  longitude?: number | null
  googleMapsUrl?: string | null
  quotedPrice?: number | null
  itinerary_item_id?: string | null
}

// ============================================
// 分類
// ============================================

export type CategoryKey = 'transport' | 'accommodation' | 'meal' | 'activity' | 'other'

export const CATEGORIES: { key: CategoryKey; label: string; quoteCategoryId: string }[] = [
  { key: 'transport', label: '交通', quoteCategoryId: 'transport' },
  { key: 'accommodation', label: '住宿', quoteCategoryId: 'accommodation' },
  { key: 'meal', label: '餐食', quoteCategoryId: 'meals' },
  { key: 'activity', label: '活動', quoteCategoryId: 'activities' },
  { key: 'other', label: '其他', quoteCategoryId: 'others' },
]

export function safeGetCategoryKey(category: string): CategoryKey {
  const validKeys: CategoryKey[] = ['transport', 'accommodation', 'meal', 'activity', 'other']
  return validKeys.includes(category as CategoryKey) ? (category as CategoryKey) : 'other'
}

/**
 * 依團類型決定要顯示哪些需求類別
 * - flight (機票)：只顯示機票（歸在 transport）
 * - flight_hotel (機+酒)：機票 + 住宿
 * - hotel (住宿)：只顯示住宿
 * - car_service (派車)：只顯示交通
 * - tour_group (旅遊團)：全部顯示
 * - visa (簽證)：只顯示其他（簽證歸在其他）
 */
export function getCategoriesForTourType(
  tourServiceType?: string | null
): typeof CATEGORIES {
  switch (tourServiceType) {
    case 'flight':
      // 機票：只顯示交通類（機票歸這）
      return CATEGORIES.filter(c => c.key === 'transport')
    case 'flight_hotel':
      // 機+酒：交通 + 住宿
      return CATEGORIES.filter(c => c.key === 'transport' || c.key === 'accommodation')
    case 'hotel':
      // 住宿：只顯示住宿
      return CATEGORIES.filter(c => c.key === 'accommodation')
    case 'car_service':
      // 派車：只顯示交通
      return CATEGORIES.filter(c => c.key === 'transport')
    case 'visa':
    case 'esim':
      // 簽證 / 網卡：歸在其他
      return CATEGORIES.filter(c => c.key === 'other')
    case 'tour_group':
    default:
      // 旅遊團或未指定：全部
      return CATEGORIES
  }
}
