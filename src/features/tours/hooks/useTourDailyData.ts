/**
 * useTourDailyData - 從核心表 JOIN 組合每日行程資料
 *
 * 用途：
 * - 行程表展示頁面
 * - 手冊打印
 * - 網頁展示
 *
 * 資料來源：
 * - daily_itinerary（展示設定：title, description, images）
 * - tour_itinerary_items（實際資料：meals, accommodation, activities）
 */

import { useMemo } from 'react'
import type { DailyItinerary } from '@/components/editor/tour-form/types'
import type { TourItineraryItem } from '../types/tour-itinerary-item.types'
import { useTourItineraryItemsByTour } from './useTourItineraryItems'

interface EnrichedDailyItinerary extends DailyItinerary {
  _coreItems?: TourItineraryItem[] // 原始核心表資料（debug 用）
}

/**
 * 從核心表組合每日行程資料
 *
 * @param tourId - 旅遊團 ID
 * @param dailyItinerary - 行程表展示設定（來自 itineraries.daily_itinerary）
 * @param options - 選項
 * @returns 組合後的完整每日行程
 */
export function useTourDailyData(
  tourId: string | null,
  dailyItinerary: DailyItinerary[] | null,
  options?: {
    includeHidden?: boolean // 是否包含隱藏項目（預設 false）
    hiddenItemIds?: string[] // 隱藏項目 ID 清單（來自 itineraries.hidden_items_for_web）
    context?: 'web' | 'brochure' // 展示場景（預設 web）
  }
) {
  // 讀取核心表資料
  const { items: coreItems, loading, refresh } = useTourItineraryItemsByTour(tourId)

  // 組合每日資料
  const enrichedDays = useMemo<EnrichedDailyItinerary[]>(() => {
    if (!dailyItinerary || !coreItems) return []

    const hiddenIds = options?.hiddenItemIds || []

    return dailyItinerary.map((day, dayIndex) => {
      const dayNumber = dayIndex + 1

      // 取得這一天的核心表項目
      const dayItems = coreItems.filter(item => item.day_number === dayNumber)

      // 過濾隱藏項目
      const visibleItems = options?.includeHidden
        ? dayItems
        : dayItems.filter(item => !hiddenIds.includes(item.id))

      // 提取餐食
      const mealItems = visibleItems.filter(item => item.category === 'meals')
      const breakfast = mealItems.find(m => m.sub_category === 'breakfast')?.title || ''
      const lunch = mealItems.find(m => m.sub_category === 'lunch')?.title || ''
      const dinner = mealItems.find(m => m.sub_category === 'dinner')?.title || ''

      // 提取住宿
      const accommodationItem = visibleItems.find(item => item.category === 'accommodation')
      const accommodation = accommodationItem?.title || ''

      // 提取活動
      const activityItems = visibleItems.filter(item => item.category === 'activities')
      const activities = activityItems.map(item => ({
        icon: '📍',
        title: item.title || '',
        description: item.description || '',
        attraction_id: item.resource_id || undefined,
      }))

      // 組合完整資料
      return {
        ...day,
        meals: { breakfast, lunch, dinner },
        accommodation,
        activities,
        recommendations: day.recommendations || [],
        _coreItems: dayItems, // 保留原始資料（debug 用）
      }
    })
  }, [dailyItinerary, coreItems, options?.includeHidden, options?.hiddenItemIds])

  return {
    days: enrichedDays,
    coreItems,
    loading,
    refresh,
  }
}

/**
 * 輔助函數：從核心表項目提取餐食
 */
export function extractMealsFromCoreItems(items: TourItineraryItem[]) {
  const mealItems = items.filter(item => item.category === 'meals')
  return {
    breakfast: mealItems.find(m => m.sub_category === 'breakfast')?.title || '',
    lunch: mealItems.find(m => m.sub_category === 'lunch')?.title || '',
    dinner: mealItems.find(m => m.sub_category === 'dinner')?.title || '',
  }
}

/**
 * 輔助函數：從核心表項目提取住宿
 */
export function extractAccommodationFromCoreItems(items: TourItineraryItem[]) {
  const accommodationItem = items.find(item => item.category === 'accommodation')
  return accommodationItem?.title || ''
}

/**
 * 輔助函數：從核心表項目提取活動
 */
export function extractActivitiesFromCoreItems(items: TourItineraryItem[]) {
  const activityItems = items.filter(item => item.category === 'activities')
  return activityItems.map(item => ({
    icon: '📍',
    title: item.title || '',
    description: item.description || '',
    attraction_id: item.resource_id || undefined,
  }))
}
