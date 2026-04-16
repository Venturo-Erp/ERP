'use client'

/**
 * useEnabledCountries — SSOT 國家來源
 *
 * 底層讀 old countries（保留 UUID id 相容 FK），
 * 但只回傳 workspace_countries.is_enabled = true 的國家。
 * 其他 hook / component 應用這個取代 useCountries。
 */

import { useMemo } from 'react'
import useSWR from 'swr'
import { useCountries } from '@/data'
import { supabase } from '@/lib/supabase/client'

async function fetchEnabledCodes(): Promise<Set<string>> {
  const { data } = await supabase
    .from('workspace_countries')
    .select('country_code')
    .eq('is_enabled', true)
  return new Set((data || []).map(d => d.country_code))
}

export function useEnabledCountries() {
  const { items, loading, ...rest } = useCountries()

  const { data: enabledCodes } = useSWR('workspace_countries:enabled_codes', fetchEnabledCodes, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const filtered = useMemo(() => {
    if (!enabledCodes || !items) return items
    return items.filter(c => !c.code || enabledCodes.has(c.code))
  }, [items, enabledCodes])

  return { items: filtered, loading, ...rest }
}
