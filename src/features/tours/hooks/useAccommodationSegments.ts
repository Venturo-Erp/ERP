'use client'

/**
 * useAccommodationSegments - 讀取行程表住宿並合併成區段
 * 
 * 邏輯：連續住同一家飯店的晚數合併成一個區段
 * 例如：第 1 晚 A 飯店、第 2-4 晚 B 飯店 → 2 個區段
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface AccommodationItem {
  day_number: number
  title: string | null
  resource_name: string | null
  supplier_name: string | null
}

export interface AccommodationSegment {
  id: string // 唯一識別碼，用於 key
  hotel_name: string
  start_night: number // 開始晚數（第幾晚）
  end_night: number // 結束晚數
  nights: number[] // 包含的晚數陣列 [1, 2, 3]
  night_count: number // 總晚數
}

interface UseAccommodationSegmentsResult {
  segments: AccommodationSegment[]
  accommodations: AccommodationItem[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * 正規化飯店名稱（用於比較是否同一家）
 * - 移除前後空白
 * - 「同上」視為沿用前一天
 */
function normalizeHotelName(title: string | null): string {
  if (!title) return ''
  const trimmed = title.trim()
  // 「同上」會在合併邏輯中特殊處理
  return trimmed
}

/**
 * 將住宿項目合併成區段
 */
function mergeIntoSegments(accommodations: AccommodationItem[]): AccommodationSegment[] {
  if (accommodations.length === 0) return []

  // 按 day_number 排序
  const sorted = [...accommodations].sort((a, b) => a.day_number - b.day_number)
  
  const segments: AccommodationSegment[] = []
  let currentSegment: AccommodationSegment | null = null
  let lastHotelName = ''

  for (const item of sorted) {
    let hotelName = normalizeHotelName(item.title)
    
    // 「同上」沿用前一天的飯店名稱
    if (hotelName === '同上' && lastHotelName) {
      hotelName = lastHotelName
    }
    
    const nightNumber = item.day_number // day_number 就是晚數

    if (
      currentSegment &&
      hotelName === currentSegment.hotel_name &&
      nightNumber === currentSegment.end_night + 1
    ) {
      // 連續且同一飯店，擴展當前區段
      currentSegment.end_night = nightNumber
      currentSegment.nights.push(nightNumber)
      currentSegment.night_count = currentSegment.nights.length
    } else {
      // 新區段
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = {
        id: `segment-${nightNumber}`,
        hotel_name: hotelName,
        start_night: nightNumber,
        end_night: nightNumber,
        nights: [nightNumber],
        night_count: 1,
      }
    }

    lastHotelName = hotelName
  }

  // 加入最後一個區段
  if (currentSegment) {
    segments.push(currentSegment)
  }

  return segments
}

export function useAccommodationSegments(tourId: string | null): UseAccommodationSegmentsResult {
  const [accommodations, setAccommodations] = useState<AccommodationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  useEffect(() => {
    if (!tourId) {
      setAccommodations([])
      return
    }

    const loadAccommodations = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('tour_itinerary_items')
          .select('day_number, title, resource_name, supplier_name')
          .eq('tour_id', tourId)
          .eq('category', 'accommodation')
          .order('day_number', { ascending: true })
          .order('sort_order', { ascending: true })

        if (queryError) throw queryError

        // 每天只取第一筆住宿（避免重複）
        const uniqueByDay = new Map<number, AccommodationItem>()
        for (const item of data || []) {
          const dayNum = item.day_number ?? 0
          if (dayNum > 0 && !uniqueByDay.has(dayNum)) {
            uniqueByDay.set(dayNum, { ...item, day_number: dayNum })
          }
        }

        setAccommodations(Array.from(uniqueByDay.values()))
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入住宿資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadAccommodations()
  }, [tourId, reloadTrigger])

  const segments = useMemo(() => mergeIntoSegments(accommodations), [accommodations])

  const reload = () => setReloadTrigger(t => t + 1)

  return { segments, accommodations, loading, error, reload }
}
