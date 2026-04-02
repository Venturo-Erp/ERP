/**
 * useAirports - 統一機場資料來源
 *
 * 從 ref_airports 讀取，取代舊的 useTourDestinations
 * - is_favorite = true 的機場排在最前面
 * - 按國家篩選
 * - 支援搜尋
 */

import { useCallback, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface Airport {
  iata_code: string
  icao_code: string | null
  english_name: string | null
  name_zh: string | null
  city_name_en: string | null
  city_name_zh: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  is_favorite: boolean
  usage_count: number
}

interface CountryInfo {
  name: string
  code: string
}

// SWR 快取 key
const AIRPORTS_CACHE_KEY = 'entity:ref_airports:list'
const COUNTRIES_CACHE_KEY = 'entity:countries:slim'

// SWR 配置
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
}

// Fetcher（按使用次數排序）
async function fetchAirports(): Promise<Airport[]> {
  const { data, error } = await supabase
    .from('ref_airports')
    .select('iata_code, icao_code, english_name, name_zh, city_code, city_name_en, city_name_zh, country_code, timezone, latitude, longitude, is_favorite, usage_count, workspace_id, created_at')
    .order('usage_count', { ascending: false, nullsFirst: true })
    .order('city_name_zh', { ascending: true })
    .limit(500)

  if (error) {
    logger.error('載入機場資料失敗:', error)
    throw error
  }

  return (data || []) as Airport[]
}

// 從 countries 表讀取國家（含 code 用於對照）
// RLS 會自動根據 auth session 的 workspace_id 過濾
async function fetchCountries(): Promise<CountryInfo[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('name, code')
    .eq('is_active', true)
    .order('usage_count', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('載入國家列表失敗:', error)
    throw error
  }

  return (data || []) as CountryInfo[]
}

interface UseAirportsOptions {
  enabled?: boolean
}

export function useAirports(options: UseAirportsOptions = {}) {
  const { enabled = true } = options

  // 載入所有機場
  const {
    data: airports = [],
    isLoading: airportsLoading,
    error: airportsError,
  } = useSWR<Airport[]>(enabled ? AIRPORTS_CACHE_KEY : null, fetchAirports, SWR_CONFIG)

  // 載入國家列表（RLS 自動根據 auth session 過濾 workspace）
  const { data: countriesData = [], isLoading: countriesLoading } = useSWR<CountryInfo[]>(
    enabled ? COUNTRIES_CACHE_KEY : null,
    fetchCountries,
    SWR_CONFIG
  )

  const loading = airportsLoading || countriesLoading
  const error = airportsError

  // 建立 name → code 對照表（從 DB 讀取，非硬編碼）
  const countryNameToCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of countriesData) {
      map[c.name] = c.code
    }
    return map
  }, [countriesData])

  // 建立 code → name 對照表
  const countryCodeToName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of countriesData) {
      map[c.code] = c.name
    }
    return map
  }, [countriesData])

  // 返回國家名稱陣列（保持向後相容）
  const countries = useMemo(() => countriesData.map(c => c.name), [countriesData])

  // 根據國家名稱取得機場列表（按使用次數排序）
  const getAirportsByCountry = useCallback(
    (countryName: string): Airport[] => {
      const countryCode = countryNameToCode[countryName]
      if (!countryCode) return []

      return airports
        .filter(a => a.country_code === countryCode)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    },
    [airports, countryNameToCode]
  )

  // 取得機場詳細資訊
  const getAirport = useCallback(
    (iataCode: string): Airport | null => {
      return airports.find(a => a.iata_code === iataCode) || null
    },
    [airports]
  )

  // 取得機場顯示名稱
  const getAirportDisplayName = useCallback(
    (iataCode: string): string => {
      const airport = airports.find(a => a.iata_code === iataCode)
      if (!airport) return iataCode
      return airport.city_name_zh || airport.city_name_en || iataCode
    },
    [airports]
  )

  // 新增機場到 ref_airports（透過 API route 使用 admin client 繞過 RLS）
  const addAirport = useCallback(
    async (params: { iata_code: string; city_name_zh: string; country_code: string }) => {
      const res = await fetch('/api/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        logger.error('新增機場失敗:', data.error || res.statusText)
        throw new Error(data.error || '新增機場失敗')
      }

      await mutate(AIRPORTS_CACHE_KEY)
      return params.iata_code
    },
    []
  )

  // 標記機場為常用（增加 usage_count）
  const markAsUsed = useCallback(
    async (iataCode: string) => {
      // 先取得目前的 usage_count
      const airport = airports.find(a => a.iata_code === iataCode)
      const currentCount = airport?.usage_count || 0

      const { error } = await supabase
        .from('ref_airports')
        .update({ usage_count: currentCount + 1 })
        .eq('iata_code', iataCode)

      if (error) {
        logger.error('更新 usage_count 失敗:', error)
        return
      }

      // 重新載入
      mutate(AIRPORTS_CACHE_KEY)
    },
    [airports]
  )

  // 轉換格式：相容舊的 TourDestination 格式（用過的機場）
  const destinations = useMemo(() => {
    return airports
      .filter(a => (a.usage_count || 0) > 0)
      .map(a => ({
        id: a.iata_code,
        country: countryCodeToName[a.country_code || ''] || a.country_code || '',
        city: a.city_name_zh || a.city_name_en || '',
        airport_code: a.iata_code,
        created_at: null,
      }))
  }, [airports, countryCodeToName])

  return {
    airports,
    countries,
    countryNameToCode,
    destinations, // 相容舊格式
    loading,
    error,
    getAirportsByCountry,
    getAirport,
    getAirportDisplayName,
    addAirport,
    markAsUsed,
    refresh: () => mutate(AIRPORTS_CACHE_KEY),
  }
}
