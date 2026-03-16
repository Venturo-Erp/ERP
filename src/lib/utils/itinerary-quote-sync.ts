/**
 * 行程表 → 報價單 同步工具
 * 當行程表的餐食/住宿資料更新時，自動同步到關聯的報價單
 */

import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import { generateUUID } from '@/lib/utils/uuid'
import type { CostCategory, CostItem } from '@/features/quotes/types'
import type { TimelineItineraryData, TimelineDay } from '@/types/timeline-itinerary.types'

// 每日行程類型
interface DailyMeals {
  breakfast: string
  lunch: string
  dinner: string
}

interface DailyActivity {
  title: string
  attraction_id?: string
}

interface DailyItineraryDay {
  dayLabel: string
  date: string
  title: string
  meals: DailyMeals
  accommodation: string
  activities?: DailyActivity[]
  accommodation_id?: string
  meal_ids?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
}

// Database helpers using dynamicFrom (for tables with JSONB columns requiring custom types)
const itinerariesDb = () => dynamicFrom('itineraries')
const quotesDb = () => dynamicFrom('quotes')
const toursDb = () => dynamicFrom('tours')
const coreItemsDb = () => dynamicFrom('tour_itinerary_items')

/**
 * 將行程表的每日餐食轉換為報價單的 meals 分類格式
 * 格式：Day1 早餐：餐廳名, Day1 午餐：餐廳名, Day1 晚餐：餐廳名
 */
function convertDailyItineraryToMeals(dailyItinerary: DailyItineraryDay[]): CostItem[] {
  const items: CostItem[] = []

  for (let i = 0; i < dailyItinerary.length; i++) {
    const day = dailyItinerary[i]
    const dayNum = i + 1

    // 早餐（飯店早餐不列入，因為包含在住宿費用）
    if (day.meals?.breakfast && day.meals.breakfast !== '飯店早餐') {
      items.push({
        id: generateUUID(),
        name: `Day${dayNum} 早餐：${day.meals.breakfast}`,
        quantity: null,
        unit_price: 0,
        total: 0,
        day: dayNum,
      })
    }

    // 午餐
    if (day.meals?.lunch) {
      items.push({
        id: generateUUID(),
        name: `Day${dayNum} 午餐：${day.meals.lunch}`,
        quantity: null,
        unit_price: 0,
        total: 0,
        day: dayNum,
      })
    }

    // 晚餐
    if (day.meals?.dinner) {
      items.push({
        id: generateUUID(),
        name: `Day${dayNum} 晚餐：${day.meals.dinner}`,
        quantity: null,
        unit_price: 0,
        total: 0,
        day: dayNum,
      })
    }
  }

  return items
}

/**
 * 將行程表的住宿資訊轉換為報價單的 accommodation 分類格式
 * - 每天獨立一筆（quantity 用於房間數，不是晚數）
 * - 續住會解析成實際飯店名稱
 * - 最後一天不住宿
 */
function convertDailyItineraryToAccommodation(dailyItinerary: DailyItineraryDay[]): CostItem[] {
  const items: CostItem[] = []

  // 解析「續住 (xxx)」格式，取得實際飯店名稱
  const getActualHotelName = (accommodation: string): { name: string; isSameAsPrevious: boolean } => {
    const match = accommodation.match(/^續住\s*\((.+)\)$/)
    if (match) return { name: match[1], isSameAsPrevious: true }
    return { name: accommodation, isSameAsPrevious: false }
  }

  for (let i = 0; i < dailyItinerary.length; i++) {
    const day = dailyItinerary[i]
    const dayNum = i + 1
    const isLastDay = i === dailyItinerary.length - 1

    // 最後一天通常不住宿，跳過
    if (isLastDay) break

    if (!day.accommodation) continue

    // 解析實際飯店名稱（處理「續住」格式）
    const { name: hotelName, isSameAsPrevious } = getActualHotelName(day.accommodation)

    items.push({
      id: generateUUID(),
      name: hotelName,
      quantity: null,
      unit_price: 0,
      total: 0,
      day: dayNum,
      is_same_as_previous: isSameAsPrevious,
    })
  }

  return items
}

/**
 * 將行程表的景點資訊轉換為報價單的 activities 分類格式
 * 只取有 attraction_id 的項目（已標注景點）
 */
function convertDailyItineraryToActivities(dailyItinerary: DailyItineraryDay[]): CostItem[] {
  const items: CostItem[] = []

  for (let i = 0; i < dailyItinerary.length; i++) {
    const day = dailyItinerary[i]
    const dayNum = i + 1

    if (!day.activities) continue

    for (const activity of day.activities) {
      if (!activity.attraction_id || !activity.title) continue

      items.push({
        id: generateUUID(),
        name: `Day${dayNum}：${activity.title}`,
        quantity: null,
        unit_price: 0,
        total: 0,
        day: dayNum,
        resource_type: 'attraction',
        resource_id: activity.attraction_id,
      })
    }
  }

  return items
}

/**
 * 將時間軸行程的餐食資訊轉換為報價單的 meals 分類格式
 */
function convertTimelineToMeals(days: TimelineDay[]): CostItem[] {
  const items: CostItem[] = []

  for (const day of days) {
    const dayNum = day.dayNumber

    // 從 attractions 中找餐食
    for (const attr of day.attractions) {
      if (attr.mealType && attr.mealType !== 'none' && attr.name) {
        const mealLabel =
          attr.mealType === 'breakfast' ? '早餐' : attr.mealType === 'lunch' ? '午餐' : '晚餐'
        items.push({
          id: generateUUID(),
          name: `Day${dayNum} ${mealLabel}：${attr.name}`,
          quantity: 1,
          unit_price: 0,
          total: 0,
          day: dayNum,
        })
      }
    }
  }

  return items
}

/**
 * 將時間軸行程的住宿資訊轉換為報價單的 accommodation 分類格式
 */
function convertTimelineToAccommodation(days: TimelineDay[]): CostItem[] {
  const items: CostItem[] = []

  for (const day of days) {
    if (day.accommodation) {
      items.push({
        id: generateUUID(),
        name: day.accommodation,
        quantity: 1,
        unit_price: 0,
        total: 0,
        day: day.dayNumber,
      })
    }
  }

  return items
}

/**
 * 同步行程表資料到關聯的報價單
 * - 更新 meals 分類（餐食）
 * - 更新 accommodation 分類（住宿）- 保留現有價格資訊
 *
 * @param itineraryId 行程表 ID
 * @param dailyItinerary 每日行程資料（可選，如果不提供會從資料庫讀取）
 */
export async function syncItineraryToQuote(
  itineraryId: string,
  dailyItinerary?: DailyItineraryDay[]
): Promise<void> {
  try {
    let quoteId: string | null = null
    let dailyData: DailyItineraryDay[] = dailyItinerary || []

    // 1. 先嘗試從行程表本身取得 tour_id
    const { data: itineraryData } = await itinerariesDb()
      .select('tour_id, daily_itinerary')
      .eq('id', itineraryId)
      .single()

    const itinerary = itineraryData as {
      tour_id: string | null
      daily_itinerary: DailyItineraryDay[] | null
    } | null

    // 如果沒有傳入 dailyItinerary，從資料庫讀取
    if (!dailyItinerary && itinerary?.daily_itinerary) {
      dailyData = itinerary.daily_itinerary
    }

    if (dailyData.length === 0) {
      logger.log('行程表無每日行程資料，跳過同步')
      return
    }

    // 嘗試透過 tour_id 查找（旅遊團路徑）
    if (itinerary?.tour_id) {
      const { data: tour } = await toursDb().select('quote_id').eq('id', itinerary.tour_id).single()

      const tourData = tour as { quote_id: string | null } | null
      if (tourData?.quote_id) {
        quoteId = tourData.quote_id
        logger.log('從 tour 取得 quote_id:', quoteId)
      }
    }

    if (!quoteId) {
      // 沒有關聯的報價單，不需要同步
      logger.log('行程表無關聯報價單，跳過同步')
      return
    }

    // 2. 取得報價單現有的 categories
    const { data: quote } = await quotesDb().select('categories').eq('id', quoteId).single()

    if (!quote) {
      logger.warn('找不到報價單:', quoteId)
      return
    }

    const existingCategories = (quote.categories as CostCategory[]) || []

    // 3. 轉換餐食、住宿、活動資料
    const newMealsItems = convertDailyItineraryToMeals(dailyData)
    const newAccommodationItems = convertDailyItineraryToAccommodation(dailyData)
    const newActivitiesItems = convertDailyItineraryToActivities(dailyData)

    console.log('[SYNC DEBUG] dailyData 天數:', dailyData.length)
    console.log('[SYNC DEBUG] 第1天 meals:', JSON.stringify(dailyData[0]?.meals))
    console.log('[SYNC DEBUG] newMealsItems 數量:', newMealsItems.length, newMealsItems.map(i => i.name))
    console.log('[SYNC DEBUG] newAccommodationItems 數量:', newAccommodationItems.length)
    console.log('[SYNC DEBUG] existingCategories IDs:', existingCategories.map(c => c.id))

    // 4. 更新 categories，保留其他分類和現有價格資訊
    const updatedCategories = existingCategories.map(cat => {
      if (cat.id === 'meals') {
        // 合併現有的價格資訊到新項目，名稱變更時加備注
        const itemsWithPrices = newMealsItems.map(newItem => {
          const match = newItem.name.match(/Day(\d+)\s*(早餐|午餐|晚餐)/)
          if (match) {
            const dayNum = match[1]
            const mealType = match[2]
            const existingItem = cat.items.find(old =>
              old.name.startsWith(`Day${dayNum} ${mealType}`)
            )
            if (existingItem) {
              // 比對餐廳名稱是否變更
              const oldRestaurant = existingItem.name.replace(/^Day\d+\s*(早餐|午餐|晚餐)：/, '')
              const newRestaurant = newItem.name.replace(/^Day\d+\s*(早餐|午餐|晚餐)：/, '')
              let note = existingItem.note
              if (oldRestaurant && newRestaurant && oldRestaurant !== newRestaurant) {
                const changeNote = `原：${oldRestaurant}`
                note = note ? `${changeNote}\n${note}` : changeNote
              }
              return {
                ...newItem,
                unit_price: existingItem.unit_price,
                total: existingItem.total,
                note,
              }
            }
          }
          return newItem
        })
        return {
          ...cat,
          items: itemsWithPrices,
          total: itemsWithPrices.reduce((sum, item) => sum + item.total, 0),
        }
      }
      if (cat.id === 'accommodation') {
        // 住宿：保留現有價格資訊，名稱變更時加備注
        const itemsWithPrices = newAccommodationItems.map(newItem => {
          const existingItem = cat.items.find(old => old.day === newItem.day)
          if (existingItem) {
            // 比對飯店名稱是否變更
            let note = existingItem.note
            if (existingItem.name && newItem.name && existingItem.name !== newItem.name) {
              const changeNote = `原：${existingItem.name}`
              note = note ? `${changeNote}\n${note}` : changeNote
            }
            return {
              ...newItem,
              unit_price: existingItem.unit_price,
              total: existingItem.total,
              room_type: existingItem.room_type,
              note,
            }
          }
          return newItem
        })
        return {
          ...cat,
          items: itemsWithPrices,
          total: itemsWithPrices.reduce((sum, item) => sum + item.total, 0),
        }
      }
      if (cat.id === 'activities') {
        // 活動（景點）：用 day 匹配舊項目，保留已填價格，名稱變更時加備注
        const itemsWithPrices = newActivitiesItems.map(newItem => {
          const existingItem = cat.items.find(old => old.day === newItem.day)
          if (existingItem) {
            let note = existingItem.note
            if (existingItem.name && newItem.name && existingItem.name !== newItem.name) {
              const changeNote = `原：${existingItem.name}`
              note = note ? `${changeNote}\n${note}` : changeNote
            }
            return {
              ...newItem,
              unit_price: existingItem.unit_price,
              total: existingItem.total,
              note,
            }
          }
          return newItem
        })
        return {
          ...cat,
          items: itemsWithPrices,
          total: itemsWithPrices.reduce((sum, item) => sum + item.total, 0),
        }
      }
      return cat
    })

    // 5. 如果 categories 中沒有 meals / accommodation / activities，則新增
    if (!updatedCategories.find(c => c.id === 'meals') && newMealsItems.length > 0) {
      updatedCategories.push({
        id: 'meals',
        name: '餐飲',
        items: newMealsItems,
        total: 0,
      })
    }
    if (
      !updatedCategories.find(c => c.id === 'accommodation') &&
      newAccommodationItems.length > 0
    ) {
      updatedCategories.push({
        id: 'accommodation',
        name: '住宿',
        items: newAccommodationItems,
        total: 0,
      })
    }
    if (
      !updatedCategories.find(c => c.id === 'activities') &&
      newActivitiesItems.length > 0
    ) {
      updatedCategories.push({
        id: 'activities',
        name: '活動',
        items: newActivitiesItems,
        total: 0,
      })
    }

    // 6. 更新報價單
    const mealsCategory = updatedCategories.find(c => c.id === 'meals')
    console.log('[SYNC DEBUG] 更新前 meals items:', mealsCategory?.items?.length, mealsCategory?.items?.map(i => i.name))
    const { error } = await quotesDb()
      .update({
        categories: updatedCategories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (error) {
      logger.error('更新報價單 categories 失敗:', error)
      throw error
    } else {
      logger.log('已同步行程表資料到報價單:', quoteId)

      // 更新核心表項目的 quote_status → 'drafted'（消除黃色提示）
      if (itinerary?.tour_id) {
        await coreItemsDb()
          .update({ quote_status: 'drafted' })
          .eq('tour_id', itinerary.tour_id)
          .eq('quote_status', 'none')
      }
    }
  } catch (error) {
    logger.error('同步行程表到報價單失敗:', error)
    throw error
  }
}

/**
 * 同步時間軸行程資料到關聯的報價單
 * - 更新 meals 分類（餐食）- 從 attractions 的 mealType 提取
 * - 更新 accommodation 分類（住宿）- 從每日的 accommodation 欄位提取
 *
 * @param quoteId 報價單 ID
 * @param timelineData 時間軸行程資料
 */
export async function syncTimelineToQuote(
  quoteId: string,
  timelineData: TimelineItineraryData
): Promise<void> {
  try {
    if (!timelineData.days || timelineData.days.length === 0) {
      logger.log('時間軸行程無每日資料，跳過同步')
      return
    }

    // 1. 取得報價單現有的 categories
    const { data: quote } = await quotesDb().select('categories').eq('id', quoteId).single()

    if (!quote) {
      logger.warn('找不到報價單:', quoteId)
      return
    }

    const existingCategories = (quote.categories as CostCategory[]) || []

    // 2. 轉換餐食和住宿資料
    const newMealsItems = convertTimelineToMeals(timelineData.days)
    const newAccommodationItems = convertTimelineToAccommodation(timelineData.days)

    // 3. 更新 categories，保留其他分類和現有價格資訊
    const updatedCategories = existingCategories.map(cat => {
      if (cat.id === 'meals') {
        // 合併現有的價格資訊到新項目
        const itemsWithPrices = newMealsItems.map(newItem => {
          // 嘗試找到相同位置（Day+餐別）的舊項目以保留價格
          const match = newItem.name.match(/Day(\d+)\s*(早餐|午餐|晚餐)/)
          if (match) {
            const dayNum = match[1]
            const mealType = match[2]
            const existingItem = cat.items.find(old =>
              old.name.startsWith(`Day${dayNum} ${mealType}`)
            )
            if (existingItem) {
              return {
                ...newItem,
                unit_price: existingItem.unit_price,
                total: existingItem.total,
              }
            }
          }
          return newItem
        })
        return {
          ...cat,
          items: itemsWithPrices,
          total: itemsWithPrices.reduce((sum, item) => sum + item.total, 0),
        }
      }
      if (cat.id === 'accommodation') {
        // 住宿：保留現有價格資訊
        const itemsWithPrices = newAccommodationItems.map(newItem => {
          // 嘗試找到相同天數的舊項目以保留價格
          const existingItem = cat.items.find(old => old.day === newItem.day)
          if (existingItem) {
            return {
              ...newItem,
              unit_price: existingItem.unit_price,
              total: existingItem.total,
              room_type: existingItem.room_type,
            }
          }
          return newItem
        })
        return {
          ...cat,
          items: itemsWithPrices,
          total: itemsWithPrices.reduce((sum, item) => sum + item.total, 0),
        }
      }
      return cat
    })

    // 4. 如果 categories 中沒有 meals 或 accommodation，則新增
    if (!updatedCategories.find(c => c.id === 'meals') && newMealsItems.length > 0) {
      updatedCategories.push({
        id: 'meals',
        name: '餐飲',
        items: newMealsItems,
        total: 0,
      })
    }
    if (
      !updatedCategories.find(c => c.id === 'accommodation') &&
      newAccommodationItems.length > 0
    ) {
      updatedCategories.push({
        id: 'accommodation',
        name: '住宿',
        items: newAccommodationItems,
        total: 0,
      })
    }

    // 5. 更新報價單
    const { error } = await quotesDb()
      .update({
        categories: updatedCategories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (error) {
      logger.error('更新報價單 categories 失敗:', error)
      throw error
    } else {
      logger.log('已同步時間軸行程到報價單:', quoteId)
    }
  } catch (error) {
    logger.error('同步時間軸行程到報價單失敗:', error)
    throw error
  }
}
