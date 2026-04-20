'use client'

/**
 * useCountryCities — 某國家底下的所有城市（ref_cities）
 *
 * 用途：建團/訂單「城市」下拉取代原「機場」下拉
 *   value 存 city.code、label 顯示「城市名 (機場 IATA)」或「城市名」
 *   陸路案沒機場也能選（primary_airport_iata 可為 null）
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export interface RefCity {
  code: string
  name_zh: string
  name_en: string | null
  country_code: string
  primary_airport_iata: string | null
  is_major: boolean
  is_active: boolean
}

export function useCountryCities(countryCode: string | null | undefined) {
  const cacheKey = countryCode ? `ref_cities:${countryCode}` : null

  const { data, error, isLoading } = useSWR<RefCity[]>(cacheKey, async () => {
    if (!countryCode) return []
    // ref_cities 新表、Supabase types 尚未 regen、用 as never 繞過
    const { data, error } = (await supabase
      .from('ref_cities' as never)
      .select('code, name_zh, name_en, country_code, primary_airport_iata, is_major, is_active')
      .eq('country_code' as never, countryCode)
      .eq('is_active' as never, true)
      .order('is_major' as never, { ascending: false })
      .order('name_zh' as never, { ascending: true })) as unknown as {
      data: RefCity[] | null
      error: Error | null
    }
    if (error) throw error
    return (data ?? []) as RefCity[]
  })

  return {
    cities: data ?? [],
    loading: isLoading,
    error,
  }
}
