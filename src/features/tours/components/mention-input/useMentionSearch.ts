'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface MentionResult {
  id: string
  name: string
  city_name: string
}

// Module-level cache: countryName → countryId
const countryIdCache = new Map<string, string>()

// Sanitize input to prevent SQL injection in LIKE queries
function sanitizeInput(input: string): string {
  // Escape SQL LIKE special characters: % _ \
  return input.replace(/[%_\\]/g, '\\$&')
}

export function useMentionSearch(countryName: string, query: string, isOpen: boolean) {
  const [results, setResults] = useState<MentionResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resolvedCountryIdRef = useRef<string>('')

  // Resolve countryName → countryId (cached)
  const resolveCountryId = useCallback(async (name: string): Promise<string> => {
    if (!name) return ''
    const cached = countryIdCache.get(name)
    if (cached) return cached

    const { data } = await supabase
      .from('countries')
      .select('id')
      .eq('name', name)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (data?.id) {
      countryIdCache.set(name, data.id)
      return data.id
    }
    return ''
  }, [])

  // Search attractions
  useEffect(() => {
    if (!isOpen) {
      setResults([])
      return
    }

    // Cancel previous timer & request
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        // Resolve country_id if needed
        if (!resolvedCountryIdRef.current && countryName) {
          resolvedCountryIdRef.current = await resolveCountryId(countryName)
        }
        const countryId = resolvedCountryIdRef.current

        if (controller.signal.aborted) return

        setLoading(true)

        let q = supabase
          .from('attractions')
          .select('id, name, cities(name)')
          .eq('is_active', true)
          .limit(10)

        if (countryId) {
          q = q.eq('country_id', countryId)
        }

        if (query.trim()) {
          q = q.ilike('name', `%${sanitizeInput(query.trim())}%`)
        }

        q = q.order('name')

        const { data } = await q

        if (controller.signal.aborted) return

        setResults(
          (data || []).map(
            (item: { id: string; name: string; cities: { name: string } | null }) => ({
              id: item.id,
              name: item.name,
              city_name: (item.cities as { name: string } | null)?.name || '',
            })
          )
        )
      } catch {
        // silently fail
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, isOpen, countryName, resolveCountryId])

  // Reset resolved country when countryName changes
  useEffect(() => {
    resolvedCountryIdRef.current = ''
  }, [countryName])

  return { results, loading }
}
