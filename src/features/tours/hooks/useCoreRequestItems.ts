/**
 * useCoreRequestItems - 從核心表讀取需求單資料
 * 
 * 用途：產生需求單時，從 tour_itinerary_items 讀取已報價的項目
 * 
 * 資料來源：
 * - tour_itinerary_items（核心表）
 * - restaurants（餐廳資料）
 * - hotels（飯店資料）
 * - attractions（景點資料）
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { TourItineraryItem } from '../types/tour-itinerary-item.types'

// 核心表項目 + 供應商資料
export interface CoreRequestItem extends TourItineraryItem {
  // 餐廳資料
  restaurant?: {
    id: string
    name: string
    address: string | null
    phone: string | null
    fax: string | null
    latitude: number | null
    longitude: number | null
    google_maps_url: string | null
  }
  // 飯店資料
  hotel?: {
    id: string
    name: string
    address: string | null
    phone: string | null
    fax: string | null
    latitude: number | null
    longitude: number | null
    google_maps_url: string | null
  }
  // 景點資料
  attraction?: {
    id: string
    name: string
    address: string | null
    phone: string | null
    latitude: number | null
    longitude: number | null
    google_maps_url: string | null
  }
}

/**
 * 從核心表讀取需求單資料
 */
async function fetchCoreRequestItems(
  tourId: string,
  supplierId: string
): Promise<CoreRequestItem[]> {
  try {
    const { data, error } = await supabase
      .from('tour_itinerary_items')
      .select(`
        *,
        restaurants:resource_id (
          id,
          name,
          address,
          phone,
          fax,
          latitude,
          longitude,
          google_maps_url
        ),
        hotels:resource_id (
          id,
          name,
          address,
          phone,
          fax,
          latitude,
          longitude,
          google_maps_url
        ),
        attractions:resource_id (
          id,
          name,
          address,
          phone,
          latitude,
          longitude,
          google_maps_url
        )
      `)
      .eq('tour_id', tourId)
      .eq('supplier_id', supplierId)
      .eq('quote_status', 'quoted') // 只抓有報價的項目
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('讀取核心表需求單資料失敗:', error)
      throw error
    }

    return (data as unknown as CoreRequestItem[]) || []
  } catch (err) {
    logger.error('fetchCoreRequestItems 錯誤:', err)
    throw err
  }
}

/**
 * Hook：讀取核心表需求單資料
 */
export function useCoreRequestItems(tourId: string | null, supplierId: string | null) {
  return useSWR(
    tourId && supplierId ? ['core-request-items', tourId, supplierId] : null,
    () => fetchCoreRequestItems(tourId!, supplierId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
}

/**
 * 從訂單讀取總人數
 */
async function fetchTotalPax(tourId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('member_count')
      .eq('tour_id', tourId)

    if (error) {
      logger.error('讀取訂單總人數失敗:', error)
      return 0
    }

    if (!data || data.length === 0) {
      return 0
    }

    return data.reduce((total, order) => {
      return total + (order.member_count || 0)
    }, 0)
  } catch (err) {
    logger.error('fetchTotalPax 錯誤:', err)
    return 0
  }
}

/**
 * Hook：讀取訂單總人數
 */
export function useTotalPax(tourId: string | null) {
  return useSWR(tourId ? ['total-pax', tourId] : null, () => fetchTotalPax(tourId!), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
