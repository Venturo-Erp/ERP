/**
 * 報價單項目解析
 * 從報價單分類中提取需求項目
 */

import type { CostCategory } from '@/features/quotes/types'
import type { QuoteItem, CategoryKey } from './requirements-list.types'
import { CATEGORIES } from './requirements-list.types'

/**
 * 從報價單分類解析出需求項目列表
 */
export function parseQuoteItems(
  quoteCategories: CostCategory[],
  calculateDate: (dayNum: number) => string | null
): QuoteItem[] {
  const items: QuoteItem[] = []

  for (const cat of CATEGORIES) {
    // 交通：從報價單的 transport 和 group-transport 讀取
    if (cat.key === 'transport') {
      parseTransportItems(quoteCategories, items)
      continue
    }

    const quoteCategory = quoteCategories.find(c => c.id === cat.quoteCategoryId)
    if (!quoteCategory?.items) continue

    for (const item of quoteCategory.items) {
      if (!item.name) continue
      if (item.is_self_arranged || item.name.includes('自理')) continue

      let supplierName = ''
      let title = item.name
      let serviceDate: string | null = null

      if (cat.key === 'accommodation') {
        supplierName = item.name
        title = item.name
        if (item.day) serviceDate = calculateDate(item.day)
      } else if (cat.key === 'meal') {
        const match = item.name.match(/Day\s*(\d+)\s*(早餐|午餐|晚餐)\s*(?:[：:]|\s*-\s*)\s*(.+)/)
        if (match) {
          const dayNum = parseInt(match[1])
          supplierName = match[3].trim()
          title = match[2]
          serviceDate = calculateDate(dayNum)
        }
      } else if (cat.key === 'activity') {
        supplierName = item.name
        title = item.name
        if (item.day) serviceDate = calculateDate(item.day)
      } else if (cat.key === 'other') {
        supplierName = item.name
        title = item.name
      }

      const key = `${cat.key}-${supplierName}-${title}-${serviceDate || ''}`
      items.push({
        category: cat.key,
        supplierName,
        title,
        serviceDate,
        quantity: item.quantity || 1,
        key,
        resourceType: item.resource_type,
        resourceId: item.resource_id,
        latitude: item.resource_latitude,
        longitude: item.resource_longitude,
        googleMapsUrl: item.resource_google_maps_url,
        quotedPrice: item.unit_price,
        itinerary_item_id: item.itinerary_item_id || null,
      })
    }
  }

  return items
}

function parseTransportItems(quoteCategories: CostCategory[], items: QuoteItem[]): void {
  // transport category（機票等）—— 成人/兒童/嬰兒聚合成一筆「機票」
  const transportCategory = quoteCategories.find(c => c.id === 'transport')
  if (transportCategory?.items) {
    const ticketPaxTypes = ['成人', '兒童', '嬰兒', '小孩']
    const ticketItems = transportCategory.items.filter(
      i => i.name && ticketPaxTypes.includes(i.name) && (i.unit_price || 0) > 0
    )

    // 有任何一個機票價格就建立一筆「機票」需求
    if (ticketItems.length > 0) {
      const totalQty = ticketItems.reduce((sum, i) => sum + (i.quantity || 1), 0)
      items.push({
        category: 'transport',
        supplierName: '機票',
        title: '機票',
        serviceDate: null,
        quantity: totalQty,
        key: `transport-機票`,
        resourceType: ticketItems[0].resource_type,
        resourceId: ticketItems[0].resource_id,
        quotedPrice: ticketItems.reduce(
          (sum, i) => sum + (i.unit_price || 0) * (i.quantity || 1),
          0
        ),
        itinerary_item_id: ticketItems[0].itinerary_item_id || null,
      })
    }

    // 其他非機票的 transport 項目照常
    for (const item of transportCategory.items) {
      if (!item.name) continue
      if (ticketPaxTypes.includes(item.name)) continue

      const key = `transport-${item.name}-${item.name}-`
      items.push({
        category: 'transport',
        supplierName: item.name,
        title: item.name,
        serviceDate: null,
        quantity: item.quantity || 1,
        key,
        resourceType: item.resource_type,
        resourceId: item.resource_id,
        quotedPrice: item.unit_price,
        itinerary_item_id: item.itinerary_item_id || null,
      })
    }
  }

  // group-transport category（遊覽車等）
  const groupTransportCategory = quoteCategories.find(c => c.id === 'group-transport')
  if (groupTransportCategory?.items) {
    for (const item of groupTransportCategory.items) {
      if (!item.name) continue
      if (item.name === '領隊分攤') continue

      const key = `transport-${item.name}-${item.name}-`
      items.push({
        category: 'transport',
        supplierName: item.name,
        title: item.name,
        serviceDate: null,
        quantity: item.quantity || 1,
        key,
        resourceType: item.resource_type,
        resourceId: item.resource_id,
        quotedPrice: item.unit_price,
        itinerary_item_id: item.itinerary_item_id || null,
      })
    }
  }
}

/**
 * 按分類整理項目並排序
 */
export function groupItemsByCategory(quoteItems: QuoteItem[]): Record<CategoryKey, QuoteItem[]> {
  const result: Record<CategoryKey, QuoteItem[]> = {
    transport: [],
    accommodation: [],
    meal: [],
    activity: [],
    other: [],
  }

  for (const item of quoteItems) {
    const validKeys: CategoryKey[] = ['transport', 'accommodation', 'meal', 'activity', 'other']
    const cat = validKeys.includes(item.category as CategoryKey)
      ? (item.category as CategoryKey)
      : 'other'
    result[cat].push(item)
  }

  // 按日期排序
  for (const cat of Object.keys(result) as CategoryKey[]) {
    result[cat].sort((a, b) => {
      const dateA = a.serviceDate || ''
      const dateB = b.serviceDate || ''
      return dateA.localeCompare(dateB)
    })
  }

  return result
}
