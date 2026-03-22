/**
 * useItineraryHiddenItems - 管理行程表隱藏項目
 *
 * 用途：
 * - 網頁展示時隱藏部分項目（排版問題）
 * - 手冊打印時隱藏部分項目
 *
 * 設計：
 * - 只記錄「被隱藏的項目 ID」
 * - 預設顯示全部
 * - 輕量級（不需要更新每個項目）
 */

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useItineraries, updateItinerary } from '@/data'
import type { Itinerary } from '@/stores/types'

type HiddenContext = 'web' | 'brochure'

/**
 * 管理行程表隱藏項目
 *
 * @param itineraryId - 行程表 ID
 */
export function useItineraryHiddenItems(itineraryId: string | null) {
  const { items: itineraries } = useItineraries()
  const itinerary = itineraries.find(i => i.id === itineraryId)

  /**
   * 取得隱藏清單
   */
  const getHiddenItems = useCallback(
    (context: HiddenContext = 'web'): string[] => {
      if (!itinerary) return []

      const field = context === 'web' ? 'hidden_items_for_web' : 'hidden_items_for_brochure'
      const hiddenItems = (itinerary as Itinerary & Record<string, unknown>)[field]

      if (Array.isArray(hiddenItems)) {
        return hiddenItems as string[]
      }

      return []
    },
    [itinerary]
  )

  /**
   * 檢查項目是否隱藏
   */
  const isHidden = useCallback(
    (itemId: string, context: HiddenContext = 'web'): boolean => {
      const hiddenIds = getHiddenItems(context)
      return hiddenIds.includes(itemId)
    },
    [getHiddenItems]
  )

  /**
   * 切換項目隱藏狀態
   */
  const toggleHidden = useCallback(
    async (itemId: string, context: HiddenContext = 'web'): Promise<boolean> => {
      if (!itinerary) {
        logger.warn('useItineraryHiddenItems: no itinerary')
        return false
      }

      const currentHidden = getHiddenItems(context)
      const isCurrentlyHidden = currentHidden.includes(itemId)

      const newHidden = isCurrentlyHidden
        ? currentHidden.filter(id => id !== itemId) // 取消隱藏
        : [...currentHidden, itemId] // 加入隱藏

      const field = context === 'web' ? 'hidden_items_for_web' : 'hidden_items_for_brochure'

      try {
        await updateItinerary(itinerary.id, {
          [field]: newHidden,
        } as Partial<Itinerary>)

        logger.log(`toggleHidden: ${itemId} → ${!isCurrentlyHidden ? 'hidden' : 'visible'}`)
        return true
      } catch (error) {
        logger.error('toggleHidden failed:', error)
        return false
      }
    },
    [itinerary, getHiddenItems]
  )

  /**
   * 批次設定隱藏項目
   */
  const setHiddenItems = useCallback(
    async (itemIds: string[], context: HiddenContext = 'web'): Promise<boolean> => {
      if (!itinerary) {
        logger.warn('useItineraryHiddenItems: no itinerary')
        return false
      }

      const field = context === 'web' ? 'hidden_items_for_web' : 'hidden_items_for_brochure'

      try {
        await updateItinerary(itinerary.id, {
          [field]: itemIds,
        } as Partial<Itinerary>)

        logger.log(`setHiddenItems: ${itemIds.length} items hidden`)
        return true
      } catch (error) {
        logger.error('setHiddenItems failed:', error)
        return false
      }
    },
    [itinerary]
  )

  /**
   * 清除所有隱藏項目
   */
  const clearHidden = useCallback(
    async (context: HiddenContext = 'web'): Promise<boolean> => {
      return setHiddenItems([], context)
    },
    [setHiddenItems]
  )

  return {
    hiddenItems: getHiddenItems('web'),
    hiddenItemsForBrochure: getHiddenItems('brochure'),
    isHidden,
    toggleHidden,
    setHiddenItems,
    clearHidden,
  }
}
