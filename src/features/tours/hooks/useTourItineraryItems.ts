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
        // 1. 取得現有的核心表項目（保留有報價/需求/確認資料的）
        const { data: existing_items, error: fetch_error } = await supabase
          .from('tour_itinerary_items')
          .select(
            'id,category,sub_category,day_number,sort_order,title,quote_status,confirmation_status,leader_status,request_id,quote_item_id'
          )
          .eq('itinerary_id', itinerary_id)

        if (fetch_error) throw fetch_error

        // 2. 分成「純行程項目」和「已有下游資料的項目」
        const items_with_downstream = (existing_items ?? []).filter(
          item =>
            item.quote_status !== 'none' ||
            item.confirmation_status !== 'none' ||
            item.leader_status !== 'none' ||
            item.request_id !== null ||
            item.quote_item_id !== null
        )
        const pure_itinerary_item_ids = (existing_items ?? [])
          .filter(
            item =>
              item.quote_status === 'none' &&
              item.confirmation_status === 'none' &&
              item.leader_status === 'none' &&
              item.request_id === null &&
              item.quote_item_id === null
          )
          .map(item => item.id)

        // 3. 刪除純行程項目（沒有下游資料的）
        if (pure_itinerary_item_ids.length > 0) {
          const { error: delete_error } = await supabase
            .from('tour_itinerary_items')
            .delete()
            .in('id', pure_itinerary_item_ids)

          if (delete_error) throw delete_error
        }

        // 4. 建立新的行程項目
        const new_items: TourItineraryItemInsert[] = []

        for (let day_index = 0; day_index < daily_itinerary.length; day_index++) {
          const day = daily_itinerary[day_index]
          const day_number = day_index + 1
          const service_date = day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date : null
          let sort = 0

          // Activities
          if (day.activities) {
            for (const activity of day.activities) {
              // 活動：檢查同一天同一活動是否已有項目（用 title 比對）
              const already_exists = items_with_downstream.some(
                item =>
                  item.day_number === day_number &&
                  item.category === ITINERARY_ITEM_CATEGORIES.ACTIVITIES &&
                  item.title === activity.title
              )
              
              if (!already_exists) {
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
              }
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
              // 餐食：檢查同一天同一餐是否已有項目（不管狀態）
              const already_exists = items_with_downstream.some(
                item =>
                  item.day_number === day_number &&
                  item.category === ITINERARY_ITEM_CATEGORIES.MEALS &&
                  item.sub_category === sub_cat
              )

              if (!already_exists) {
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
              }
              sort++
            }
          }

          // Accommodation — 續住時解析完整飯店名稱
          if (day.accommodation) {
            let resolvedAccommodation = day.accommodation
            if (day.isSameAccommodation || resolvedAccommodation.startsWith('續住')) {
              // 從「續住 (XXX)」提取飯店名，或往前找上一天的住宿
              const match = resolvedAccommodation.match(/續住\s*[（(](.+?)[）)]/)
              if (match) {
                resolvedAccommodation = match[1]
              } else if (day_index > 0) {
                // 往前找最近一天有住宿的
                for (let prev = day_index - 1; prev >= 0; prev--) {
                  const prevAcc = daily_itinerary[prev].accommodation
                  if (prevAcc && !prevAcc.startsWith('續住')) {
                    resolvedAccommodation = prevAcc
                    break
                  }
                }
              }
            }

            // 住宿：檢查同一天是否已有任何住宿項目（不管狀態）
            const already_exists = items_with_downstream.some(
              item =>
                item.day_number === day_number &&
                item.category === ITINERARY_ITEM_CATEGORIES.ACCOMMODATION
            )
            
            if (!already_exists) {
              const accommodationId = (day as unknown as Record<string, unknown>).accommodation_id as string | undefined
              const item = accommodationToItem(
                resolvedAccommodation,
                day_number,
                sort,
                service_date,
                itinerary_id,
                tour_id,
                workspace_id,
                accommodationId
              )
              if (item) new_items.push(item)
            }
            sort++
          }
        }

        // 5. 批次插入
        if (new_items.length > 0) {
          const { error: insert_error } = await supabase
            .from('tour_itinerary_items')
            .insert(new_items)

          if (insert_error) throw insert_error
        }

        // 6. 更新已有下游資料的項目（只更新行程欄位，不動報價/需求/確認欄位）
        for (const downstream_item of items_with_downstream) {
          // 在新的 daily_itinerary 裡找對應的項目
          const day = daily_itinerary[(downstream_item.day_number ?? 1) - 1]
          if (!day) continue

          const service_date = day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date : null
          let updated_title: string | null = null

          if (downstream_item.category === ITINERARY_ITEM_CATEGORIES.ACTIVITIES) {
            const matching = day.activities?.find(a => a.title === downstream_item.title)
            if (matching) {
              updated_title = matching.title
            }
          } else if (downstream_item.category === ITINERARY_ITEM_CATEGORIES.MEALS) {
            const meals = day.meals as Meals | undefined
            if (meals && downstream_item.sub_category) {
              updated_title = meals[downstream_item.sub_category as keyof Meals] || null
            }
          } else if (downstream_item.category === ITINERARY_ITEM_CATEGORIES.ACCOMMODATION) {
            updated_title = day.accommodation || null
          }

          if (updated_title !== null) {
            await supabase
              .from('tour_itinerary_items')
              .update({ title: updated_title, service_date })
              .eq('id', downstream_item.id)
          }
        }

        await invalidateTourItineraryItems()
        logger.log(SYNC_LABELS.SYNC_COMPLETE, {
          deleted: pure_itinerary_item_ids.length,
          inserted: new_items.length,
          preserved: items_with_downstream.length,
        })

        return {
          success: true,
          inserted: new_items.length,
          preserved: items_with_downstream.length,
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
