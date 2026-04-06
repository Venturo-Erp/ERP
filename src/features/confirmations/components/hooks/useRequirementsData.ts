/**
 * useRequirementsData - 需求清單資料 Hook
 * 處理需求資料的載入、計算和變更追蹤
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import type { CostCategory } from '@/features/quotes/types'
interface ConfirmedRequirementItem {
  id: string
  category: string
  supplier_name: string
  service_date: string | null
  title: string
  quantity: number
  notes?: string
}

interface ConfirmedRequirementsSnapshot {
  snapshot: ConfirmedRequirementItem[]
  confirmed_at: string
  confirmed_by?: string
}
import type { FlightInfo } from '@/types/flight.types'

// 需求單類型
export interface TourRequest {
  id: string
  code: string
  category: string
  supplier_name: string
  title: string
  service_date: string | null
  quantity: number | null
  note?: string | null
  status?: string | null
  quoted_cost?: number | null
  hidden?: boolean | null
  resource_id?: string | null
  resource_type?: string | null
}

// 報價單項目
export interface QuoteItem {
  category: string
  supplierName: string
  title: string
  serviceDate: string | null
  quantity: number
  key: string
  notes?: string
  resourceType?: string | null
  resourceId?: string | null
  latitude?: number | null
  longitude?: number | null
  googleMapsUrl?: string | null
}

// 變更追蹤項目
export interface ChangeTrackItem {
  type: 'new' | 'confirmed' | 'cancelled'
  item: QuoteItem | ConfirmedRequirementItem
}

// 分類 key
import type { CategoryKey } from '../requirements-list.types'
export type { CategoryKey }

// 分類配置
export const CATEGORIES: { key: CategoryKey; label: string; quoteCategoryId: string }[] = [
  { key: 'transport', label: '交通', quoteCategoryId: 'transport' },
  { key: 'meal', label: '餐食', quoteCategoryId: 'meal' },
  { key: 'accommodation', label: '住宿', quoteCategoryId: 'accommodation' },
  { key: 'activity', label: '活動', quoteCategoryId: 'activity' },
  { key: 'other', label: '其他', quoteCategoryId: 'other' },
]

interface UseRequirementsDataOptions {
  tourId?: string
  quoteId?: string | null
}

export function useRequirementsData({ tourId, quoteId: propQuoteId }: UseRequirementsDataOptions) {
  const { user } = useAuthStore()

  // 狀態
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tour, setTour] = useState<Tour | null>(null)
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(propQuoteId || null)
  const [existingRequests, setExistingRequests] = useState<TourRequest[]>([])
  const [quoteCategories, setQuoteCategories] = useState<CostCategory[]>([])
  const [startDate, setStartDate] = useState<string | null>(null)
  const [outboundFlight, setOutboundFlight] = useState<FlightInfo | null>(null)
  const [returnFlight, setReturnFlight] = useState<FlightInfo | null>(null)
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<ConfirmedRequirementItem[]>([])

  // 載入資料
  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      try {
        let quoteId = propQuoteId || null

        if (tourId) {
          // 旅遊團模式：載入團資料
          const { data: tourData } = await supabase
            .from('tours')
            .select(
              'id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_deleted, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, tour_leader_id, controller_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by'
            )
            .eq('id', tourId)
            .single()

          if (!tourData) return

          setTour(tourData as Tour)

          // 取得報價單 ID
          const tourQuoteId = (tourData as { quote_id?: string | null }).quote_id
          const tourLockedQuoteId = (tourData as { locked_quote_id?: string | null })
            .locked_quote_id
          quoteId = quoteId || tourQuoteId || tourLockedQuoteId || null

          if (!quoteId) {
            const { data: linkedQuote } = await supabase
              .from('quotes')
              .select('id')
              .eq('tour_id', tourId)
              .limit(1)
              .maybeSingle()
            quoteId = linkedQuote?.id || null
          }

          // 載入航班資訊
          if (tourData.outbound_flight) {
            setOutboundFlight(tourData.outbound_flight as FlightInfo)
            setReturnFlight(tourData.return_flight as FlightInfo | null)
          }

          // 載入已確認快照
          if (
            tourData.confirmed_requirements &&
            typeof tourData.confirmed_requirements === 'object'
          ) {
            const snapshot = (
              tourData.confirmed_requirements as unknown as ConfirmedRequirementsSnapshot
            )?.snapshot
            setConfirmedSnapshot(snapshot || [])
          } else {
            setConfirmedSnapshot([])
          }

          // 載入現有需求單
          const { data: requests } = await supabase
            .from('tour_requests')
            .select(
              'id, code, category, supplier_name, title, service_date, quantity, notes, status, quoted_cost, hidden, resource_id, resource_type'
            )
            .eq('tour_id', tourId)
            .order('created_at', { ascending: true })
          setExistingRequests((requests as unknown as TourRequest[]) || [])
        }

        setLinkedQuoteId(quoteId)

        // 載入報價單內容
        if (quoteId) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('categories, start_date')
            .eq('id', quoteId)
            .single()

          if (quote) {
            setQuoteCategories((quote.categories as unknown as CostCategory[]) || [])
            setStartDate(quote.start_date || tour?.departure_date || null)
          }
        } else {
          setQuoteCategories([])
          setStartDate(tour?.departure_date || null)
        }
      } catch (error) {
        logger.error('載入需求資料失敗:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tourId, propQuoteId, tour?.departure_date]
  )

  useEffect(() => {
    loadData(true)
  }, [loadData])

  // 計算日期
  const calculateDate = useCallback(
    (dayNum: number): string | null => {
      if (!startDate) return null
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayNum - 1)
      return date.toISOString().split('T')[0]
    },
    [startDate]
  )

  // 格式化航班資訊
  const formatFlightInfo = useCallback(
    (flight: FlightInfo | null, type: '去程' | '回程'): string => {
      if (!flight) return ''
      const parts: string[] = []
      if (flight.flightNumber) parts.push(flight.flightNumber)
      if (flight.departureAirport && flight.arrivalAirport) {
        parts.push(`${flight.departureAirport}→${flight.arrivalAirport}`)
      }
      if (flight.departureTime && flight.arrivalTime) {
        parts.push(`${flight.departureTime}-${flight.arrivalTime}`)
      }
      return parts.length > 0 ? `【${type}】${parts.join(' ')}` : ''
    },
    []
  )

  // 生成項目 key
  const generateItemKey = useCallback(
    (category: string, supplierName: string, title: string, serviceDate: string | null): string => {
      return `${category}-${supplierName}-${title}-${serviceDate || 'no-date'}`
    },
    []
  )

  // 從報價單解析項目
  const quoteItems = useMemo((): QuoteItem[] => {
    const items: QuoteItem[] = []

    for (const cat of CATEGORIES) {
      // 交通：從航班資訊
      if (cat.key === 'transport') {
        if (outboundFlight || returnFlight) {
          const flightInfos: string[] = []
          const outboundInfo = formatFlightInfo(outboundFlight, '去程')
          const returnInfo = formatFlightInfo(returnFlight, '回程')
          if (outboundInfo) flightInfos.push(outboundInfo)
          if (returnInfo) flightInfos.push(returnInfo)

          if (flightInfos.length > 0) {
            const airline = outboundFlight?.airline || returnFlight?.airline || '航空公司'
            items.push({
              category: 'transport',
              supplierName: airline,
              title: flightInfos.join('\n'),
              serviceDate: startDate,
              quantity: 1,
              key: `transport-${airline}-flight`,
            })
          }
        }
      }

      // 其他分類：從報價單
      const quoteCat = quoteCategories.find(qc => qc.id === cat.quoteCategoryId)
      if (quoteCat?.items) {
        for (const item of quoteCat.items) {
          if (!item.name) continue
          const serviceDate = item.day ? calculateDate(item.day) : null
          const key = `${cat.key}-${item.name}-${item.description || item.name}-${serviceDate || 'no-date'}`
          items.push({
            category: cat.key,
            supplierName: item.name,
            title: item.description || item.name,
            serviceDate,
            quantity: item.quantity || 1,
            key,
            notes: item.notes,
            resourceType: item.resource_type || null,
            resourceId: item.resource_id || null,
            latitude: item.resource_latitude || null,
            longitude: item.resource_longitude || null,
            googleMapsUrl: item.resource_google_maps_url || null,
          })
        }
      }
    }

    return items
  }, [quoteCategories, outboundFlight, returnFlight, formatFlightInfo, startDate, calculateDate])

  // 變更追蹤（按分類）
  const changeTrackByCategory = useMemo((): Record<CategoryKey, ChangeTrackItem[]> => {
    const result: Record<CategoryKey, ChangeTrackItem[]> = {
      transport: [],
      meal: [],
      accommodation: [],
      activity: [],
      other: [],
    }

    if (confirmedSnapshot.length === 0) {
      for (const item of quoteItems) {
        const cat = item.category as CategoryKey
        result[cat].push({ type: 'new', item })
      }
      return result
    }

    const snapshotKeys = new Map<string, ConfirmedRequirementItem>()
    for (const snap of confirmedSnapshot) {
      const key = generateItemKey(snap.category, snap.supplier_name, snap.title, snap.service_date)
      snapshotKeys.set(key, snap)
    }

    const quoteKeys = new Set<string>()
    for (const item of quoteItems) {
      const key = generateItemKey(item.category, item.supplierName, item.title, item.serviceDate)
      quoteKeys.add(key)
    }

    for (const item of quoteItems) {
      const cat = item.category as CategoryKey
      const key = generateItemKey(item.category, item.supplierName, item.title, item.serviceDate)
      if (snapshotKeys.has(key)) {
        result[cat].push({ type: 'confirmed', item })
      } else {
        result[cat].push({ type: 'new', item })
      }
    }

    for (const snap of confirmedSnapshot) {
      const cat = snap.category as CategoryKey
      const key = generateItemKey(snap.category, snap.supplier_name, snap.title, snap.service_date)
      if (!quoteKeys.has(key)) {
        result[cat].push({ type: 'cancelled', item: snap })
      }
    }

    // 按日期排序
    for (const cat of Object.keys(result) as CategoryKey[]) {
      result[cat].sort((a, b) => {
        const dateA = ('serviceDate' in a.item ? a.item.serviceDate : a.item.service_date) || ''
        const dateB = ('serviceDate' in b.item ? b.item.serviceDate : b.item.service_date) || ''
        return dateA.localeCompare(dateB)
      })
    }

    return result
  }, [quoteItems, confirmedSnapshot, generateItemKey])

  // 是否有變更
  const hasUnconfirmedChanges = useMemo(() => {
    for (const cat of CATEGORIES) {
      if (
        changeTrackByCategory[cat.key].some(
          item => item.type === 'new' || item.type === 'cancelled'
        )
      ) {
        return true
      }
    }
    return false
  }, [changeTrackByCategory])

  return {
    // 狀態
    loading,
    refreshing,
    tour,
    linkedQuoteId,
    existingRequests,
    quoteCategories,
    startDate,
    outboundFlight,
    returnFlight,
    confirmedSnapshot,
    // 計算結果
    quoteItems,
    changeTrackByCategory,
    hasUnconfirmedChanges,
    // Setters
    setExistingRequests,
    setConfirmedSnapshot,
    // Actions
    loadData,
    calculateDate,
    formatFlightInfo,
    generateItemKey,
  }
}
