/**
 * useTourDestinations - 管理開團目的地
 * 國家從 countries 表讀取，機場代碼從 tour_destinations 表讀取
 * 使用 SWR 快取，避免每次開啟 Dialog 都重新載入
 */

import { useCallback, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import type { Country as FullCountry } from '@/stores/region-store'

export interface TourDestination {
  id: string
  country: string
  city: string
  airport_code: string
  created_at: string | null
}

// 此 hook 只需要 Country 的部分欄位（usage_count 可能是 null）
type Country = Pick<FullCountry, 'id' | 'name' | 'name_en'> & {
  usage_count?: number | null
}

// SWR 快取 key（避免與 entity 系統衝突，使用不同的 key）
const COUNTRIES_CACHE_KEY = 'tour:countries:slim'
const DESTINATIONS_CACHE_KEY = 'tour:destinations:list'

// SWR 配置：靜態資料，較長的快取時間
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 分鐘內不重複請求
}

// Fetchers
async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, name, name_en, usage_count')
    .eq('is_active', true)
    .order('usage_count', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    logger.error('載入國家列表失敗:', error)
    throw error
  }
  logger.log(`載入國家列表成功: ${data?.length || 0} 筆`)
  return data || []
}

async function fetchDestinations(): Promise<TourDestination[]> {
  const { data, error } = await supabase
    .from('tour_destinations')
    .select('id, country, city, airport_code, created_at, updated_at')
    .order('country', { ascending: true })
    .order('city', { ascending: true })
    .limit(500)

  if (error) throw error
  return data || []
}

interface UseTourDestinationsOptions {
  /** 是否啟用資料載入（預設 false，需要時才載入） */
  enabled?: boolean
}

export function useTourDestinations(options: UseTourDestinationsOptions = {}) {
  const { enabled = false } = options
  const user = useAuthStore(state => state.user)

  // 使用 SWR 載入國家資料（只在 enabled 時才載入）
  const {
    data: countriesData = [],
    isLoading: countriesLoading,
    error: countriesError,
  } = useSWR<Country[]>(enabled ? COUNTRIES_CACHE_KEY : null, fetchCountries, SWR_CONFIG)

  // 使用 SWR 載入目的地資料（只在 enabled 時才載入）
  const {
    data: destinations = [],
    isLoading: destinationsLoading,
    error: destinationsError,
  } = useSWR<TourDestination[]>(
    enabled ? DESTINATIONS_CACHE_KEY : null,
    fetchDestinations,
    SWR_CONFIG
  )

  // 合併 loading 狀態
  const loading = countriesLoading || destinationsLoading
  const error = countriesError || destinationsError

  // 重新載入資料
  const refreshDestinations = useCallback(async () => {
    await Promise.all([mutate(COUNTRIES_CACHE_KEY), mutate(DESTINATIONS_CACHE_KEY)])
  }, [])

  // 取得國家列表（從 countries 表，按使用次數排序）
  const countries = useMemo(() => {
    return countriesData.map(c => c.name)
  }, [countriesData])

  // 根據國家名稱取得城市列表（從 tour_destinations 表）
  const getCitiesByCountry = useCallback(
    (countryName: string) => {
      return destinations
        .filter(d => d.country === countryName)
        .map(d => ({
          city: d.city,
          airport_code: d.airport_code,
        }))
    },
    [destinations]
  )

  // 檢查城市是否有機場代碼
  const getAirportCode = useCallback(
    (countryName: string, cityName: string): string | null => {
      const dest = destinations.find(d => d.country === countryName && d.city === cityName)
      return dest?.airport_code || null
    },
    [destinations]
  )

  // 新增目的地（在 tour_destinations 表新增）
  const addDestination = useCallback(
    async (countryName: string, cityName: string, airportCode: string) => {
      if (!user?.workspace_id) {
        return { success: false, error: '無法取得工作區資訊' }
      }

      try {
        // tour_destinations 是全域共用表，沒有 workspace_id 欄位
        const { data, error } = await supabase
          .from('tour_destinations')
          .insert({
            country: countryName.trim(),
            city: cityName.trim(),
            airport_code: airportCode.trim().toUpperCase(),
          })
          .select()
          .single()

        if (error) throw error

        // 使用 SWR mutate 更新快取
        mutate(
          DESTINATIONS_CACHE_KEY,
          (current: TourDestination[] | undefined) => [...(current || []), data],
          false
        )
        return { success: true, data }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        logger.error('新增目的地失敗:', error)
        return { success: false, error: errorMessage }
      }
    },
    [user?.workspace_id]
  )

  // 更新目的地
  const updateDestination = useCallback(
    async (
      id: string,
      updates: Partial<Pick<TourDestination, 'country' | 'city' | 'airport_code'>>
    ) => {
      try {
        const updateData: Record<string, string> = {}
        if (updates.country) updateData.country = updates.country.trim()
        if (updates.city) updateData.city = updates.city.trim()
        if (updates.airport_code)
          updateData.airport_code = updates.airport_code.trim().toUpperCase()

        const { error } = await supabase.from('tour_destinations').update(updateData).eq('id', id)

        if (error) throw error

        // 使用 SWR mutate 重新載入
        await mutate(DESTINATIONS_CACHE_KEY)
        return { success: true }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        logger.error('更新目的地失敗:', error)
        return { success: false, error: errorMessage }
      }
    },
    []
  )

  // 刪除目的地
  const deleteDestination = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('tour_destinations').delete().eq('id', id)

      if (error) throw error

      // 使用 SWR mutate 更新快取
      mutate(
        DESTINATIONS_CACHE_KEY,
        (current: TourDestination[] | undefined) => (current || []).filter(d => d.id !== id),
        false
      )
      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      logger.error('刪除目的地失敗:', error)
      return { success: false, error: errorMessage }
    }
  }, [])

  return {
    destinations,
    countries,
    loading,
    error,
    fetchDestinations: refreshDestinations,
    getCitiesByCountry,
    getAirportCode,
    addDestination,
    updateDestination,
    deleteDestination,
  }
}
