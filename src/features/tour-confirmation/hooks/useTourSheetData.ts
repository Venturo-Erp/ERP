// @ts-nocheck -- tour_requests table missing columns in generated types; pending DB migration
/**
 * 團確單相關資料載入 Hook
 *
 * 整合載入行程表、需求單、報價單項目、訂單團員、房型配置等資料
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Itinerary } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'

// tour_requests Row type
type TourRequestRow = Database['public']['Tables']['tour_requests']['Row']

// 報價單項目
export interface QuoteItem {
  category: string
  supplierName: string
  title: string
  serviceDate: string | null
  quantity: number
  resourceType?: string | null
  resourceId?: string | null
  latitude?: number | null
  longitude?: number | null
  googleMapsUrl?: string | null
  quotedPrice?: number | null
}

// 訂單成員
export interface OrderMember {
  id: string
  chinese_name: string | null
  birth_date: string | null
}

// 團訂單
export interface TourOrder {
  id: string
  code: string
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  members: OrderMember[]
}

// 房型
export interface TourRoom {
  id: string
  night_number: number
  hotel_name: string | null
  room_type: string
  room_number: string | null
  amount: number | null
  notes: string | null
}

// 報價單房型
export interface QuoteRoomItem {
  day: number
  room_type: string
  quantity: number
}

// 人數分組
export interface AgeGroups {
  under6: number
  over65: number
  others: number
  total: number
}

interface UseTourSheetDataProps {
  tourId: string
  quoteId: string | null | undefined
  departureDate: string | null | undefined
}

export function useTourSheetData({ tourId, quoteId, departureDate }: UseTourSheetDataProps) {
  // 行程表資料
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [itineraryLoading, setItineraryLoading] = useState(false)

  // 需求單資料
  const [tourRequests, setTourRequests] = useState<TourRequestRow[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // 報價單項目
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [quoteItemsLoading, setQuoteItemsLoading] = useState(false)

  // 訂單和團員
  const [tourOrders, setTourOrders] = useState<TourOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // 房型配置
  const [tourRooms, setTourRooms] = useState<TourRoom[]>([])

  // 報價單房型
  const [quoteRoomItems, setQuoteRoomItems] = useState<QuoteRoomItem[]>([])

  // 載入行程表
  useEffect(() => {
    const loadItinerary = async () => {
      if (!tourId) return
      setItineraryLoading(true)
      try {
        const { data } = await supabase
          .from('itineraries')
          .select('*')
          .eq('tour_id', tourId)
          .maybeSingle()
        if (data) {
          setItinerary(data as unknown as Itinerary)
        }
      } finally {
        setItineraryLoading(false)
      }
    }
    loadItinerary()
  }, [tourId])

  // 載入需求單（顯示所有狀態，除了取消的）
  useEffect(() => {
    const loadTourRequests = async () => {
      if (!tourId) return
      setRequestsLoading(true)
      try {
        const { data } = await supabase
          .from('tour_requests')
          .select('*')
          .eq('tour_id', tourId)
          .neq('status', 'cancelled')
          .order('service_date')
        if (data) {
          setTourRequests(data)
        }
      } finally {
        setRequestsLoading(false)
      }
    }
    loadTourRequests()
  }, [tourId])

  // 載入報價單項目
  useEffect(() => {
    const loadQuoteItems = async () => {
      if (!quoteId) return
      setQuoteItemsLoading(true)
      try {
        const { data: quote } = await supabase
          .from('quotes')
          .select('categories, start_date')
          .eq('id', quoteId)
          .single()

        if (!quote?.categories) {
          setQuoteItems([])
          return
        }

        const categories = quote.categories as Array<{
          id: string
          items?: Array<{
            name?: string
            day?: number
            quantity?: number | null
            unit_price?: number | null
            is_self_arranged?: boolean
            resource_type?: string | null
            resource_id?: string | null
            resource_latitude?: number | null
            resource_longitude?: number | null
            resource_google_maps_url?: string | null
          }>
        }>

        const startDate = quote.start_date || departureDate
        const calculateDate = (dayNum: number): string | null => {
          if (!startDate) return null
          const date = new Date(startDate)
          date.setDate(date.getDate() + dayNum - 1)
          return date.toISOString().split('T')[0]
        }

        const items: QuoteItem[] = []
        const CATEGORY_MAP: Record<string, string> = {
          transport: 'transport',
          'group-transport': 'transport',
          accommodation: 'accommodation',
          meals: 'meal',
          activities: 'activity',
          others: 'other',
        }

        for (const cat of categories) {
          const mappedCategory = CATEGORY_MAP[cat.id]
          if (!mappedCategory || !cat.items) continue

          for (const item of cat.items) {
            if (!item.name) continue
            // 跳過自理項目
            if (item.is_self_arranged || item.name.includes('自理')) continue
            // 跳過身份票種和領隊分攤
            if (['成人', '兒童', '嬰兒', '領隊分攤'].includes(item.name)) continue

            let supplierName = ''
            let title = item.name
            let serviceDate: string | null = null

            if (mappedCategory === 'accommodation') {
              supplierName = item.name
              title = item.name
              if (item.day) serviceDate = calculateDate(item.day)
            } else if (mappedCategory === 'meal') {
              const match = item.name.match(
                /Day\s*(\d+)\s*(早餐|午餐|晚餐)\s*(?:[：:]|\s*-\s*)\s*(.+)/
              )
              if (match) {
                const dayNum = parseInt(match[1])
                supplierName = match[3].trim()
                title = match[2]
                serviceDate = calculateDate(dayNum)
              } else {
                supplierName = item.name
              }
            } else if (mappedCategory === 'activity') {
              supplierName = item.name
              title = item.name
              if (item.day) serviceDate = calculateDate(item.day)
            } else {
              supplierName = item.name
              title = item.name
            }

            items.push({
              category: mappedCategory,
              supplierName,
              title,
              serviceDate,
              quantity: item.quantity || 1,
              resourceType: item.resource_type,
              resourceId: item.resource_id,
              latitude: item.resource_latitude,
              longitude: item.resource_longitude,
              googleMapsUrl: item.resource_google_maps_url,
              quotedPrice: item.unit_price,
            })
          }
        }

        setQuoteItems(items)
      } finally {
        setQuoteItemsLoading(false)
      }
    }
    loadQuoteItems()
  }, [quoteId, departureDate])

  // 載入訂單和團員資料
  useEffect(() => {
    const loadOrdersAndMembers = async () => {
      if (!tourId) return
      setOrdersLoading(true)
      try {
        // 載入訂單
        const { data: orders } = await supabase
          .from('orders')
          .select('id, code, contact_person, contact_phone, contact_email')
          .eq('tour_id', tourId)
          .order('created_at')

        if (orders && orders.length > 0) {
          // 一次查詢所有訂單的成員（避免 N+1）
          const orderIds = orders.map(o => o.id)
          const { data: allMembers } = await supabase
            .from('order_members')
            .select('id, chinese_name, birth_date, order_id')
            .in('order_id', orderIds)

          // 按 order_id 分組
          const membersByOrder = new Map<string, OrderMember[]>()
          for (const member of allMembers || []) {
            const existing = membersByOrder.get(member.order_id) || []
            existing.push({
              id: member.id,
              chinese_name: member.chinese_name,
              birth_date: member.birth_date,
            })
            membersByOrder.set(member.order_id, existing)
          }

          const ordersWithMembers: TourOrder[] = orders.map(order => ({
            ...order,
            members: membersByOrder.get(order.id) || [],
          }))
          setTourOrders(ordersWithMembers)
        }
      } finally {
        setOrdersLoading(false)
      }
    }
    loadOrdersAndMembers()
  }, [tourId])

  // 載入房型配置資料
  useEffect(() => {
    const loadTourRooms = async () => {
      if (!tourId) return
      try {
        const { data } = await supabase
          .from('tour_rooms')
          .select('id, night_number, hotel_name, room_type, room_number, amount, notes')
          .eq('tour_id', tourId)
          .order('night_number')
          .order('room_type')
        if (data) {
          setTourRooms(data)
        }
      } catch (err) {
        logger.error('載入房型配置失敗:', err)
      }
    }
    loadTourRooms()
  }, [tourId])

  // 載入報價單房型資料
  useEffect(() => {
    const loadQuoteRoomItems = async () => {
      if (!quoteId) return
      try {
        const { data: quote } = await supabase
          .from('quotes')
          .select('versions')
          .eq('id', quoteId)
          .maybeSingle()

        if (!quote?.versions) return

        // 取得最新版本的 categories
        const versions = quote.versions as Array<{
          categories?: Array<{
            id: string
            name: string
            items?: Array<{
              name?: string
              day?: number
              quantity?: number | null
            }>
          }>
        }>
        if (!versions || versions.length === 0) return

        const latestVersion = versions[versions.length - 1]
        if (!latestVersion?.categories) return

        // 找住宿類別
        const accommodationCategory = latestVersion.categories.find(
          cat => cat.id === 'accommodation' || cat.name === '住宿'
        )
        if (!accommodationCategory?.items) return

        const roomItems: QuoteRoomItem[] = accommodationCategory.items
          .filter(item => item.day && item.name)
          .map(item => ({
            day: item.day!,
            room_type: item.name!,
            quantity: item.quantity || 1,
          }))

        setQuoteRoomItems(roomItems)
      } catch (err) {
        logger.error('載入報價單房型資料失敗:', err)
      }
    }
    loadQuoteRoomItems()
  }, [quoteId])

  // 計算人數分組
  const calculateAgeGroups = (referenceDate?: string | null): AgeGroups => {
    const allMembers = tourOrders.flatMap(o => o.members)
    const today = new Date()
    const refDate = referenceDate ? new Date(referenceDate) : today

    let under6 = 0
    let over65 = 0
    let others = 0

    allMembers.forEach(member => {
      if (!member.birth_date) {
        others++
        return
      }
      const birthDate = new Date(member.birth_date)
      const age = Math.floor(
        (refDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      if (age < 6) {
        under6++
      } else if (age >= 65) {
        over65++
      } else {
        others++
      }
    })

    return { under6, over65, others, total: allMembers.length }
  }

  // 主要聯絡人
  const primaryContact = tourOrders.length > 0 ? tourOrders[0] : null

  // 交通需求（遊覽車）
  const vehicleRequests = tourRequests.filter(
    req => req.category === 'vehicle' || req.category === 'transport'
  )

  // 未完成需求
  const incompleteRequests = tourRequests.filter(
    req => req.status !== 'confirmed' && req.status !== 'replied'
  )

  return {
    // 行程表
    itinerary,
    itineraryLoading,
    // 需求單
    tourRequests,
    requestsLoading,
    vehicleRequests,
    incompleteRequests,
    // 報價單
    quoteItems,
    quoteItemsLoading,
    // 訂單
    tourOrders,
    ordersLoading,
    primaryContact,
    calculateAgeGroups,
    // 房型
    tourRooms,
    quoteRoomItems,
  }
}
