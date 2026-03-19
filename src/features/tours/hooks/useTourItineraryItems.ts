'use client'

/**
 * useTourItineraryItems — 核心表操作 hook
 *
 * 提供：
 * - 根據 tour_id 取得所有核心項目
 * - 根據 itinerary_id 取得所有核心項目
 * - 同步行程編輯器的 daily_itinerary 到核心表
 */

import { useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { invalidateTourItineraryItems } from '@/data'
import type { DailyItinerary, Activity, Meals } from '@/components/editor/tour-form/types'
import type { TourItineraryItem, MealSubCategory } from '../types/tour-itinerary-item.types'
import type { Database } from '@/lib/supabase/types'

type TourItineraryItemInsert = Database['public']['Tables']['tour_itinerary_items']['Insert']
import { ITINERARY_ITEM_CATEGORIES, MEAL_SUB_CATEGORIES } from '../types/tour-itinerary-item.types'
import useSWR from 'swr'

// === Labels ===
const SYNC_LABELS = {
  SYNC_START: 'Syncing itinerary items to core table',
  SYNC_COMPLETE: 'Core table sync complete',
  SYNC_ERROR: 'Core table sync failed',
  FETCH_ERROR: 'Failed to fetch core table items',
} as const

// === 根據 tour_id 取得核心項目 ===
export function useTourItineraryItemsByTour(tour_id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tour_id ? `tour_itinerary_items:tour:${tour_id}` : null,
    async () => {
      if (!tour_id) return []
      const { data, error } = await supabase
        .from('tour_itinerary_items')
        .select('*')
        .eq('tour_id', tour_id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .limit(500)
      if (error) throw error
      return data as TourItineraryItem[]
    }
  )

  return {
    items: data ?? [],
    error,
    loading: isLoading,
    refresh: mutate,
  }
}

// === 根據 itinerary_id 取得核心項目 ===
export function useTourItineraryItemsByItinerary(itinerary_id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    itinerary_id ? `tour_itinerary_items:itinerary:${itinerary_id}` : null,
    async () => {
      if (!itinerary_id) return []
      const { data, error } = await supabase
        .from('tour_itinerary_items')
        .select('*')
        .eq('itinerary_id', itinerary_id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .limit(500)
      if (error) throw error
      return data as TourItineraryItem[]
    }
  )

  return {
    items: data ?? [],
    error,
    loading: isLoading,
    refresh: mutate,
  }
}

// === Activity → 核心表 row 轉換 ===
function activityToItem(
  activity: Activity,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string
): TourItineraryItemInsert {
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.ACTIVITIES,
    title: activity.title || null,
    description: activity.description || null,
    service_date: service_date || null,
    resource_type: activity.attraction_id ? 'attraction' : null,
    resource_id: activity.attraction_id || null,
  }
}

// === Meal → 核心表 row 轉換 ===
function mealToItem(
  meal_name: string,
  sub_category: MealSubCategory,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string,
  resource_id?: string
): TourItineraryItemInsert | null {
  if (!meal_name || meal_name.trim() === '') return null
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.MEALS,
    sub_category,
    title: meal_name,
    service_date: service_date || null,
    resource_type: resource_id ? 'restaurant' : null,
    resource_id: resource_id || null,
  }
}

// === Accommodation → 核心表 row 轉換 ===
function accommodationToItem(
  accommodation: string,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string,
  resource_id?: string
): TourItineraryItemInsert | null {
  if (!accommodation || accommodation.trim() === '') return null
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.ACCOMMODATION,
    title: accommodation,
    service_date: service_date || null,
    resource_type: resource_id ? 'hotel' : null,
    resource_id: resource_id || null,
  }
}

// === 同步 hook ===
export function useSyncItineraryToCore() {
  const { user } = useAuthStore()

  /**
   * 將 daily_itinerary 同步到核心表
   *
   * 策略：delete-then-insert（因為行程項目沒有穩定 ID）
   * 未來可改為 upsert（當 activity 有 itinerary_item_id 時）
   */
  const syncToCore = useCallback(
    async (params: {
      itinerary_id: string
      tour_id: string | null
      daily_itinerary: DailyItinerary[]
    }) => {
      const { itinerary_id, tour_id, daily_itinerary } = params
      const workspace_id = user?.workspace_id
      if (!workspace_id) {
        logger.warn(SYNC_LABELS.SYNC_ERROR, 'No workspace_id')
        return { success: false, message: 'No workspace_id' }
      }

      logger.log(SYNC_LABELS.SYNC_START, { itinerary_id, tour_id, days: daily_itinerary.length })

      try {
        // 1. 在刪除前，檢查哪些項目有需求單（需要產生取消單）
        const { data: items_with_requests, error: fetch_error } = await supabase
          .from('tour_itinerary_items')
          .select('id,title,category,request_id,supplier_name,service_date')
          .eq('itinerary_id', itinerary_id)
          .not('request_id', 'is', null)

        if (fetch_error) throw fetch_error

        // 記錄需要取消的需求單資訊（按 request_id 分組）
        const cancellationsByRequestId = new Map<string, {
          request_id: string
          supplier_name: string
          category: string
          items: Array<{ title: string; service_date: string | null }>
        }>()

        if (items_with_requests && items_with_requests.length > 0) {
          for (const item of items_with_requests) {
            if (!item.request_id) continue

            if (!cancellationsByRequestId.has(item.request_id)) {
              cancellationsByRequestId.set(item.request_id, {
                request_id: item.request_id,
                supplier_name: item.supplier_name || '',
                category: item.category || '',
                items: [],
              })
            }

            const group = cancellationsByRequestId.get(item.request_id)!
            group.items.push({
              title: item.title || '',
              service_date: item.service_date,
            })
          }
        }

        // 2. 刪除所有舊的行程項目（行程是 SSOT，不保護下游資料）
        // 根據 William 決策：不管有沒有報價/需求/確認，行程刪除就是刪除
        const { error: delete_error } = await supabase
          .from('tour_itinerary_items')
          .delete()
          .eq('itinerary_id', itinerary_id)

        if (delete_error) throw delete_error

        // 3. 為每個需求單產生取消通知（更新原需求單狀態為 cancelled）
        for (const [request_id, cancellation] of cancellationsByRequestId) {
          const cancellationNote = `取消項目：\n${cancellation.items.map(i => `- ${i.service_date || ''} ${i.title}`).join('\n')}`
          
          await supabase
            .from('tour_requests')
            .update({
              status: 'cancelled',
              note: cancellationNote,
            })
            .eq('id', request_id)
        }

        // 4. 建立新的行程項目
        const new_items: TourItineraryItemInsert[] = []

        for (let day_index = 0; day_index < daily_itinerary.length; day_index++) {
          const day = daily_itinerary[day_index]
          const day_number = day_index + 1
          const service_date = day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date : null
          let sort = 0

          // Activities（從景點資料庫）
          if (day.activities && day.activities.length > 0) {
            for (const activity of day.activities) {
              // 直接插入（舊項目已全部刪除）
              new_items.push(
                activityToItem(
                  activity,
                  day_number,
                  sort,
                  service_date,
                  itinerary_id,
                  tour_id,
                  workspace_id
                )
              )
              sort++
            }
          }

          // Meals
          if (day.meals) {
            const meals = day.meals as Meals
            const mealIds = (day as unknown as Record<string, unknown>).meal_ids as { breakfast?: string; lunch?: string; dinner?: string } | undefined
            const meal_entries: [string, MealSubCategory, string | undefined][] = [
              [meals.breakfast, MEAL_SUB_CATEGORIES.BREAKFAST, mealIds?.breakfast],
              [meals.lunch, MEAL_SUB_CATEGORIES.LUNCH, mealIds?.lunch],
              [meals.dinner, MEAL_SUB_CATEGORIES.DINNER, mealIds?.dinner],
            ]
            for (const [meal_name, sub_cat, meal_resource_id] of meal_entries) {
              // 直接插入（舊項目已全部刪除）
              const item = mealToItem(
                meal_name,
                sub_cat,
                day_number,
                sort,
                service_date,
                itinerary_id,
                tour_id,
                workspace_id,
                meal_resource_id
              )
              if (item) new_items.push(item)
              sort++
            }
          }

          // Accommodation — 續住時解析完整飯店名稱
          if (day.accommodation) {
            let resolvedAccommodation = day.accommodation
            let resolvedAccommodationId = (day as unknown as Record<string, unknown>).accommodation_id as string | undefined
            if (day.isSameAccommodation || resolvedAccommodation.startsWith('續住')) {
              // 從「續住 (XXX)」提取飯店名，或往前找上一天的住宿
              const match = resolvedAccommodation.match(/續住\s*[（(](.+?)[）)]/)
              if (match) {
                resolvedAccommodation = match[1]
              }
              // 往前找最近一天有住宿的（取名稱 + resource_id）
              if (day_index > 0) {
                for (let prev = day_index - 1; prev >= 0; prev--) {
                  const prevAcc = daily_itinerary[prev].accommodation
                  if (prevAcc && !prevAcc.startsWith('續住')) {
                    if (!match) resolvedAccommodation = prevAcc
                    // 續住也帶上前一天的 accommodation_id
                    if (!resolvedAccommodationId) {
                      resolvedAccommodationId = (daily_itinerary[prev] as unknown as Record<string, unknown>).accommodation_id as string | undefined
                    }
                    break
                  }
                }
              }
            }

            // 直接插入（舊項目已全部刪除）
            const item = accommodationToItem(
              resolvedAccommodation,
              day_number,
              sort,
              service_date,
              itinerary_id,
              tour_id,
              workspace_id,
              resolvedAccommodationId
            )
            if (item) new_items.push(item)
            sort++
          }
        }

        // 2. 批次插入新項目
        if (new_items.length > 0) {
          const { error: insert_error } = await supabase
            .from('tour_itinerary_items')
            .insert(new_items)

          if (insert_error) throw insert_error
        }

        await invalidateTourItineraryItems()
        logger.log(SYNC_LABELS.SYNC_COMPLETE, {
          deleted: '所有舊項目（行程是 SSOT）',
          inserted: new_items.length,
        })

        return {
          success: true,
          inserted: new_items.length,
        }
      } catch (error) {
        logger.error(SYNC_LABELS.SYNC_ERROR, error)
        return { success: false, message: String(error) }
      }
    },
    [user?.workspace_id]
  )

  return { syncToCore }
}
