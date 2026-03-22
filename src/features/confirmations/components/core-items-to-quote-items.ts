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

/**
 * 清除「續住 (...)」前綴，取得原始酒店名
 */
function stripContinueStay(title: string): string {
  let cleaned = title
  while (cleaned.match(/^續住\s*[（(](.+?)[）)]$/)) {
    cleaned = cleaned.replace(/^續住\s*[（(](.+?)[）)]$/, '$1')
  }
  return cleaned
}

export function coreItemsToQuoteItems(
  items: TourItineraryItem[],
  calculateDate: (dayNum: number) => string | null
): QuoteItem[] {
  const filtered = items.filter(item => {
    // 過濾在報價單隱藏的項目
    if (item.show_on_quote === false) return false
    // 過濾自理餐食
    if (item.category === 'meals' && item.title?.includes('自理')) return false
    if (!item.title) return false
    return true
  })

  // 住宿合併：連續同酒店（含續住）合併為一筆，顯示日期範圍
  const accommodationItems = filtered
    .filter(i => i.category === 'accommodation')
    .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))

  const nonAccommodationItems = filtered.filter(i => i.category !== 'accommodation')

  // 合併連續同酒店住宿
  const mergedAccommodation: Array<
    TourItineraryItem & { _nights: number; _startDay: number; _endDay: number }
  > = []
  for (const item of accommodationItems) {
    const hotelName = stripContinueStay(item.title || '')
    const dayNum = item.day_number || 0
    const last = mergedAccommodation[mergedAccommodation.length - 1]

    if (last && stripContinueStay(last.title || '') === hotelName && dayNum === last._endDay + 1) {
      // 合併：延長天數
      last._nights++
      last._endDay = dayNum
      // 優先保留有 resource_id 的那筆
      if (!last.resource_id && item.resource_id) {
        last.resource_id = item.resource_id
        last.resource_name = item.resource_name
      }
      // 累加價格
      if (item.unit_price) {
        last.unit_price = (last.unit_price || 0) + item.unit_price
      }
    } else {
      // 新的一筆
      mergedAccommodation.push({
        ...item,
        title: hotelName,
        _nights: 1,
        _startDay: dayNum,
        _endDay: dayNum,
      })
    }
  }

  // 轉換合併後的住宿
  const accommodationQuoteItems: QuoteItem[] = mergedAccommodation.map(item => {
    const startDate = item._startDay ? calculateDate(item._startDay) : null
    // 退房日 = 最後入住日 + 1（旅遊業慣例：入住~退房）
    const checkoutDate = calculateDate(item._endDay + 1)
    const serviceDate = item._nights > 1 ? `${startDate}~${checkoutDate}` : startDate
    const title = (item.title || '').trim()
    const supplierName = (item.resource_name || title).trim()
    const key = `accommodation-${supplierName}-${title}-${serviceDate || ''}`

    return {
      category: 'accommodation' as CategoryKey,
      supplierName,
      title,
      serviceDate,
      quantity: item._nights,
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

  // 轉換非住宿項目
  const otherQuoteItems: QuoteItem[] = nonAccommodationItems.map(item => {
    const category = mapCategory(item.category || '')
    const serviceDate = item.day_number ? calculateDate(item.day_number) : null

    let title = (item.title || '').trim()
    let supplierName = (item.resource_name || item.title || '').trim()

    // 餐食：用子分類標題
    if (category === 'meal' && item.sub_category) {
      title = MEAL_LABELS[item.sub_category] || item.sub_category
      supplierName = (item.title || '').trim()
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

  return [...accommodationQuoteItems, ...otherQuoteItems]
}
