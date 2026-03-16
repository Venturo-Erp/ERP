/**
 * 核心表 → QuoteItem[] 轉換器
 * 
 * 直接從 tour_itinerary_items 轉換為需求單所需的 QuoteItem 格式
 * 替代舊的 parseQuoteItems（依賴 quotes.categories JSON）
 */

import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import type { QuoteItem, CategoryKey } from './requirements-list.types'

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

function mapCategory(coreCategory: string): CategoryKey {
  switch (coreCategory) {
    case 'transport':
    case 'group-transport':
      return 'transport'
    case 'accommodation':
      return 'accommodation'
    case 'meals':
      return 'meal'
    case 'activities':
      return 'activity'
    default:
      return 'other'
  }
}

export function coreItemsToQuoteItems(
  items: TourItineraryItem[],
  calculateDate: (dayNum: number) => string | null
): QuoteItem[] {
  return items
    .filter(item => {
      // 過濾自理餐食
      if (item.category === 'meals' && item.title?.includes('自理')) return false
      if (!item.title) return false
      return true
    })
    .map(item => {
      const category = mapCategory(item.category || '')
      const serviceDate = item.day_number ? calculateDate(item.day_number) : null
      
      let title = item.title || ''
      let supplierName = item.resource_name || item.title || ''

      // 餐食：用子分類標題
      if (category === 'meal' && item.sub_category) {
        title = MEAL_LABELS[item.sub_category] || item.sub_category
        supplierName = item.title || ''
      }

      const key = `${category}-${supplierName}-${title}-${serviceDate || ''}`

      return {
        category,
        supplierName,
        title,
        serviceDate,
        quantity: item.quantity || 1,
        key,
        notes: item.quote_note || undefined,
        resourceType: item.resource_type || null,
        resourceId: item.resource_id || null,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        googleMapsUrl: item.google_maps_url || null,
        quotedPrice: item.unit_price || null,
        itinerary_item_id: item.id,
      }
    })
}
