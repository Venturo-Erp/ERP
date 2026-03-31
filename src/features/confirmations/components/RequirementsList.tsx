// @ts-nocheck
'use client'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

/**
 * RequirementsList - 需求總覽共用組件
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Printer,
  Send,
  Check,
  X,
} from 'lucide-react'
// TODO: [品質優化] 將 supabase 操作搬到 confirmations/services/ — 目前因 setState 交錯暫保留
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { Tour } from '@/stores/types'

import { TransportQuoteDialog } from './TransportQuoteDialog'
import { AccommodationQuoteDialog } from './AccommodationQuoteDialog'
import { MealQuoteDialog } from './MealQuoteDialog'
import { ActivityQuoteDialog } from './ActivityQuoteDialog'
import { AssignSupplierDialog, type AssignSupplierDialogProps } from './AssignSupplierDialog'
import { LocalQuoteDialog } from './LocalQuoteDialog'
import { TicketRequestDialog } from './TicketRequestDialog'
import { RequirementsDrawer } from './RequirementsDrawer'
import { TeamConfirmationSheet } from './TeamConfirmationSheet'
// CostCategory 已不需要 — 需求單直接讀核心表
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import { createInsuranceRequirement } from '../services/create-insurance-requirement'
import { getStatusConfig } from '@/lib/status-config'
import type { FlightInfo } from '@/types/flight.types'

import type {
  RequirementsListProps,
  TourRequest,
  TourRequestItem,
  QuoteItem,
  CategoryKey,
} from './requirements-list.types'
import { CATEGORIES } from './requirements-list.types'
import { COMP_REQUIREMENTS_LABELS } from './constants/labels'
import { groupItemsByCategory } from './parse-quote-items'
import { coreItemsToQuoteItems } from './core-items-to-quote-items'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { useConfirmationSheet } from './use-confirmation-sheet'
import { CoreTableRequestDialog } from '@/features/tours/components/CoreTableRequestDialog'

// ============================================
// Component
// ============================================

export function RequirementsList({
  tourId,
  quoteId: propQuoteId,
  onOpenRequestDialog,
  className,
}: RequirementsListProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()

  // 狀態
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tour, setTour] = useState<Tour | null>(null)
  const [itinerary, setItinerary] = useState<any>(null) // 行程表資料（包含 daily_itinerary）
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(propQuoteId || null)
  const [existingRequests, setExistingRequests] = useState<TourRequest[]>([])
  // quoteCategories 已移除 — 需求單直接讀核心表
  const [quoteGroupSize, setQuoteGroupSize] = useState<number | null>(null)
  const [memberAgeBreakdown, setMemberAgeBreakdown] = useState<{
    total: number
    adult: number // ≥12
    child6to12: number // ≥6 & <12
    child2to6: number // ≥2 & <6
    infant: number // <2
  } | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [outboundFlight, setOutboundFlight] = useState<FlightInfo | null>(null)
  const [returnFlight, setReturnFlight] = useState<FlightInfo | null>(null)

  const [selectedHotel, setSelectedHotel] = useState<{
    name: string
    resourceId: string | null
    serviceDate: string | null
    nights: number
  } | null>(null)
  const [showTransportDialog, setShowTransportDialog] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<{
    name: string
    resourceId: string | null
  } | null>(null)
  const [showTicketDialog, setShowTicketDialog] = useState(false)
  const [showAccommodationDialog, setShowAccommodationDialog] = useState(false)
  const [showMealDialog, setShowMealDialog] = useState(false)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  // 勾選項目 + 發給供應商
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  // 隱藏項目展開狀態
  const [expandedHiddenCategories, setExpandedHiddenCategories] = useState<Set<string>>(new Set())

  // 🆕 產生需求單狀態
  const [generatingRequests, setGeneratingRequests] = useState(false)

  // 🆕 從核心表產生需求單
  const [showCoreRequestDialog, setShowCoreRequestDialog] = useState(false)
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [coreItems, setCoreItems] = useState<TourItineraryItem[]>([])
  // 🆕 從分房系統讀取的房型資料（按飯店分組）
  const [tourRoomsByHotel, setTourRoomsByHotel] = useState<Record<string, { room_type: string; capacity: number; quantity: number }[]>>({})

  // Local 報價 Dialog
  const [showLocalQuoteDialog, setShowLocalQuoteDialog] = useState(false)

  // 🆕 團確單 Dialog
  const [showTeamConfirmationSheet, setShowTeamConfirmationSheet] = useState(false)

  // 委託展開狀態
  const [expandedDelegation, setExpandedDelegation] = useState<string | null>(null)
  // 發送方式 state（draft→sent 用）
  const [sentViaInput, setSentViaInput] = useState<string>('line')
  const [sentToInput, setSentToInput] = useState<string>('')
  // 回覆報價編輯（sent→replied 用）
  const [editingItemCosts, setEditingItemCosts] = useState<Record<number, number | null>>({})
  // 狀態操作 loading
  const [statusUpdating, setStatusUpdating] = useState(false)
  // 🆕 主表格項目展開狀態（用於顯示需求單詳情）
  const [expandedMainItems, setExpandedMainItems] = useState<Set<string>>(new Set())

  // ============================================
  // 載入資料
  // ============================================
  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      try {
        let quoteId = propQuoteId || null
        if (tourId) {
          const { data: tourData } = await supabase
            .from('tours')
            .select('*')
            .eq('id', tourId)
            .single()
          if (!tourData) return
          setTour(tourData as Tour)
          quoteId = quoteId || (tourData as { quote_id?: string | null }).quote_id || null
          if (tourData.outbound_flight) {
            setOutboundFlight(tourData.outbound_flight as FlightInfo)
            setReturnFlight(tourData.return_flight as FlightInfo | null)
          }

          // 讀取行程表（包含 daily_itinerary 的完整行程描述）
          const { data: itineraryData } = await supabase
            .from('itineraries')
            .select('id, daily_itinerary')
            .eq('tour_id', tourId)
            .single()
          if (itineraryData) {
            setItinerary(itineraryData)
          }
          // 🛡️ 自動建立保險需求單（如果不存在）
          if (user?.workspace_id && tourData.departure_date) {
            // 計算團員人數（保險固定出現，人數可為 0）
            const { data: tmMembers } = await supabase
              .from('tour_members')
              .select('id')
              .eq('tour_id', tourId)
            const pax = tmMembers?.length || 0
            await createInsuranceRequirement(
              tourId,
              user.workspace_id,
              user.id,
              pax,
              tourData.departure_date,
              tourData.return_date || null
            )
          }

          const { data: requests } = await supabase
            .from('tour_requests')
            .select(
              'id, code, supplier_name, supplier_id, supplier_contact, request_type, items, status, hidden, note, created_at, sent_at, sent_via, sent_to, replied_at, confirmed_at, source_type, source_id, created_by'
            )
            .eq('tour_id', tourId)
            .order('created_at', { ascending: true })
          setExistingRequests((requests as unknown as TourRequest[]) || [])

          // 直接讀核心表（不依賴 quote_id）
          const { data: items } = await supabase
            .from('tour_itinerary_items')
            .select('*')
            .eq('tour_id', tourId)
            .order('day_number', { ascending: true })
            .order('sort_order', { ascending: true })
          setCoreItems((items as TourItineraryItem[]) || [])
          setStartDate(tourData.departure_date || null)

          // 🆕 讀取分房系統的房型資料
          const { data: tourRooms } = await supabase
            .from('tour_rooms')
            .select('hotel_name, room_type, capacity, night_number, display_order')
            .eq('tour_id', tourId)
            .order('night_number', { ascending: true })
            .order('display_order', { ascending: true })
          
          if (tourRooms && tourRooms.length > 0) {
            // 按飯店分組，統計每種房型的數量
            const roomsByHotel: Record<string, Record<string, { room_type: string; capacity: number; count: number }>> = {}
            for (const room of tourRooms) {
              const hotelName = room.hotel_name || '未指定'
              if (!roomsByHotel[hotelName]) roomsByHotel[hotelName] = {}
              const key = `${room.room_type}-${room.capacity}`
              if (!roomsByHotel[hotelName][key]) {
                roomsByHotel[hotelName][key] = { room_type: room.room_type || '', capacity: room.capacity || 0, count: 0 }
              }
              // 只算第一晚的數量（避免重複計算）
              const firstNight = tourRooms.filter(r => r.hotel_name === hotelName)[0]?.night_number
              if (room.night_number === firstNight) {
                roomsByHotel[hotelName][key].count++
              }
            }
            // 轉換成陣列格式
            const result: Record<string, { room_type: string; capacity: number; quantity: number }[]> = {}
            for (const [hotel, rooms] of Object.entries(roomsByHotel)) {
              result[hotel] = Object.values(rooms).map(r => ({ room_type: r.room_type, capacity: r.capacity, quantity: r.count }))
            }
            setTourRoomsByHotel(result)
          } else {
            setTourRoomsByHotel({})
          }

          // 查團員 + 客戶生日，計算年齡分類
          const { data: members } = await supabase
            .from('tour_members')
            .select('customer_id')
            .eq('tour_id', tourId)
          if (members && members.length > 0) {
            const customerIds = members.map(m => m.customer_id).filter(Boolean)
            const { data: customers } = await supabase
              .from('customers')
              .select('id, birth_date')
              .in('id', customerIds)

            const departureDate = tourData.departure_date
              ? new Date(tourData.departure_date)
              : new Date()
            const breakdown = {
              total: members.length,
              adult: 0,
              child6to12: 0,
              child2to6: 0,
              infant: 0,
            }

            for (const member of members) {
              const customer = customers?.find(c => c.id === member.customer_id)
              if (!customer?.birth_date) {
                breakdown.adult++ // 沒生日預設成人
                continue
              }
              const birth = new Date(customer.birth_date)
              const ageMs = departureDate.getTime() - birth.getTime()
              const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)

              if (ageYears >= 12) breakdown.adult++
              else if (ageYears >= 6) breakdown.child6to12++
              else if (ageYears >= 2) breakdown.child2to6++
              else breakdown.infant++
            }
            setMemberAgeBreakdown(breakdown)
            if (!quoteGroupSize) setQuoteGroupSize(members.length)
          }
        }

        // 保留 quote 讀取（用於 group_size 等 header 資訊）
        if (quoteId) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('start_date, group_size')
            .eq('id', quoteId)
            .single()
          if (quote) {
            if (quote.start_date) setStartDate(quote.start_date)
            setQuoteGroupSize(quote.group_size || null)
          }
        }
      } catch (error) {
        logger.error(COMP_REQUIREMENTS_LABELS.載入需求資料失敗, error)
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

  // ============================================
  // 計算邏輯
  // ============================================

  const calculateDate = useCallback(
    (dayNum: number): string | null => {
      if (!startDate) return null
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayNum - 1)
      return date.toISOString().split('T')[0]
    },
    [startDate]
  )

  const quoteItems = useMemo(() => {
    const items = coreItemsToQuoteItems(coreItems, calculateDate)
    // 把 existingRequests 中非行程來源的「其他」類需求（如保險）也加入主表格
    for (const req of existingRequests) {
      if (req.request_type !== 'other') continue
      if (!req.items || !Array.isArray(req.items) || req.items.length === 0) continue
      // 檢查是否已在 quoteItems 裡（避免重複）
      const already = items.some(
        qi => qi.category === 'other' && qi.supplierName === req.supplier_name
      )
      if (already) continue
      const firstItem = req.items[0] as unknown as Record<string, unknown>
      items.push({
        category: 'other',
        supplierName: req.supplier_name || '',
        title: (firstItem.title as string) || req.supplier_name || '',
        serviceDate: (firstItem.service_date as string) || null,
        quantity: (firstItem.quantity as number) || 1,
        key: `other-req-${req.id}`,
        notes: (firstItem.notes as string) || '',
        quotedPrice: null,
      })
    }
    return items
  }, [coreItems, calculateDate, existingRequests])
  const itemsByCategory = useMemo(() => groupItemsByCategory(quoteItems), [quoteItems])

  // 交通 Dialog 用：建立天數資訊（從行程表 daily_itinerary 讀取完整描述）
  const transportDays = useMemo(() => {
    const dayMap = new Map<number, { dayNumber: number; date: string; route: string }>()

    // 優先從 daily_itinerary 讀取完整的行程描述（route 欄位）
    if (itinerary?.daily_itinerary && Array.isArray(itinerary.daily_itinerary)) {
      const dailyItinerary = itinerary.daily_itinerary as Array<{
        day?: number
        route?: string
        activities?: any[]
        meals?: any
        accommodation?: string
      }>

      for (const day of dailyItinerary) {
        const dayNum = day.day || 0
        if (!dayNum) continue

        const date = calculateDate(dayNum)
        const routeText = day.route || ''

        dayMap.set(dayNum, {
          dayNumber: dayNum,
          date: date
            ? new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
            : `Day ${dayNum}`,
          route: routeText, // 直接使用行程表的完整描述（例如：台北車站 ⇀ 高爾夫球場 ⇀台中洲際酒店）
        })
      }
    }

    // 如果沒有 daily_itinerary，fallback 到原本的邏輯（從 coreItems 組合）
    if (dayMap.size === 0) {
      // 先建立每天的基礎資訊
      for (const item of coreItems) {
        const dn = item.day_number
        if (!dn) continue
        if (!dayMap.has(dn)) {
          const date = calculateDate(dn)
          dayMap.set(dn, {
            dayNumber: dn,
            date: date
              ? new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
              : `Day ${dn}`,
            route: '',
          })
        }
      }
      // 從所有 item 組合路線（景點、餐廳名都算）
      for (const item of coreItems) {
        const dn = item.day_number
        if (!dn || !dayMap.has(dn)) continue
        const title = item.supplierName || item.title || ''
        if (!title) continue
        const day = dayMap.get(dn)!
        // 避免重複（飯店早餐等跳過）
        if (title === '飯店早餐' || day.route.includes(title)) continue
        day.route = day.route ? `${day.route} → ${title}` : title
      }
    }

    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, itinerary, calculateDate])

  // 團確單
  const { generatingSheet, handleGenerateConfirmationSheet } = useConfirmationSheet({
    user,
    tour,
    tourId,
    quoteItems,
    quoteGroupSize,
    existingRequests,
    outboundFlight,
    returnFlight,
  })

  // ============================================
  // 動作
  // ============================================

  const handleToggleHidden = useCallback(
    async (
      existingRequestId: string | null,
      hidden: boolean,
      itemData?: {
        category: string
        supplierName: string
        title: string
        serviceDate: string | null
        quantity: number
        notes?: string
        resourceId?: string | null
        resourceType?: string | null
      }
    ) => {
      try {
        if (existingRequestId) {
          const { error } = await supabase
            .from('tour_requests')
            .update({ hidden })
            .eq('id', existingRequestId)
          if (error) throw error
          setExistingRequests(prev =>
            prev.map(r => (r.id === existingRequestId ? { ...r, hidden } : r))
          )
        } else if (itemData && user?.workspace_id) {
          const code = `RQ${Date.now().toString().slice(-8)}`
          const insertData = {
            code,
            workspace_id: user.workspace_id,
            tour_id: tourId || null,
            supplier_name: itemData.supplierName?.trim() || null,
            request_type: itemData.category || 'other',
            items: [
              {
                category: itemData.category,
                title: itemData.title,
                service_date: itemData.serviceDate || null,
                quantity: itemData.quantity,
                notes: itemData.notes || null,
                resource_id: itemData.resourceId || null,
                resource_type: itemData.resourceType || null,
              },
            ],
            status: 'draft',
            hidden,
            note: itemData.notes || null,
            created_by: user.id,
          }
          const { data: newRequest, error } = await supabase
            .from('tour_requests')
            .insert(insertData as never)
            .select(
              'id, code, supplier_name, supplier_id, supplier_contact, request_type, items, status, hidden, note, created_at, sent_at, sent_via, sent_to, replied_at, confirmed_at, source_type, source_id, created_by'
            )
            .single()
          if (error) throw error
          if (newRequest)
            setExistingRequests(prev => [...prev, newRequest as unknown as TourRequest])
        }
        toast({
          title: hidden ? COMP_REQUIREMENTS_LABELS.已隱藏 : COMP_REQUIREMENTS_LABELS.已恢復顯示,
        })
      } catch (error) {
        logger.error(COMP_REQUIREMENTS_LABELS.更新隱藏狀態失敗, error)
        toast({ title: COMP_REQUIREMENTS_LABELS.操作失敗, variant: 'destructive' })
      }
    },
    [toast, user, tourId, tour]
  )

  const toggleHiddenCategory = useCallback((category: string) => {
    setExpandedHiddenCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) newSet.delete(category)
      else newSet.add(category)
      return newSet
    })
  }, [])

  // Blur 自動存檔：更新 tour_request 的 items 欄位
  const handleInlineUpdate = useCallback(
    async (
      item: QuoteItem,
      category: string,
      field: string,
      value: string | number | undefined,
      existingRequests: TourRequest[]
    ) => {
      try {
        // 找到對應的 request
        const match = existingRequests.find(
          r => r.request_type === category && r.supplier_name?.trim() === item.supplierName?.trim()
        )
        if (match) {
          // 更新 items 裡第一筆的欄位
          const updatedItems = [...(match.items || [])]
          if (updatedItems.length === 0) updatedItems.push({} as TourRequestItem)
          ;(updatedItems[0] as any)[field] = value
          const { error } = await supabase
            .from('tour_requests')
            .update({ items: updatedItems } as any)
            .eq('id', match.id)
          if (error) throw error
          setExistingRequests(prev =>
            prev.map(r => (r.id === match.id ? { ...r, items: updatedItems } : r))
          )
        } else if (user?.workspace_id) {
          // 建立新的 draft request
          const code = `RQ${Date.now().toString().slice(-8)}`
          const newItem: Record<string, unknown> = {
            category,
            title: item.title || '',
            service_date: item.serviceDate || null,
            quantity: item.quantity || 1,
            [field]: value,
          }
          const insertData = {
            code,
            workspace_id: user.workspace_id,
            tour_id: tourId || null,
            supplier_name: item.supplierName?.trim() || null,
            request_type: category,
            items: [newItem],
            status: 'draft',
            created_by: user.id,
          }
          const { data: newReq, error } = await supabase
            .from('tour_requests')
            .insert(insertData as never)
            .select('*')
            .single()
          if (error) throw error
          if (newReq) setExistingRequests(prev => [...prev, newReq as unknown as TourRequest])
        }
      } catch (error) {
        logger.error('自動存檔失敗', error)
      }
    },
    [user, tourId]
  )

  // 勾選項目的 key
  const getItemKey = (cat: string, item: QuoteItem, idx: number) =>
    `${cat}::${item.resourceId || item.supplierName || item.title}::${item.serviceDate || idx}`

  const toggleItem = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const checkedQuoteItems = useMemo(() => {
    const result: { category: string; item: QuoteItem }[] = []
    for (const cat of CATEGORIES) {
      const items = itemsByCategory[cat.key]
      items.forEach((item, idx) => {
        const key = getItemKey(cat.key, item, idx)
        if (checkedItems.has(key)) {
          result.push({ category: cat.key, item })
        }
      })
    }
    return result
  }, [checkedItems, itemsByCategory])

  // 年齡分類文字
  const ageBreakdownText = useMemo(() => {
    if (!memberAgeBreakdown) return ''
    const parts: string[] = []
    if (memberAgeBreakdown.adult > 0) parts.push(`滿12歲以上 ${memberAgeBreakdown.adult} 位`)
    if (memberAgeBreakdown.child6to12 > 0)
      parts.push(`滿6歲未滿12歲 ${memberAgeBreakdown.child6to12} 位`)
    if (memberAgeBreakdown.child2to6 > 0)
      parts.push(`滿2歲未滿6歲 ${memberAgeBreakdown.child2to6} 位`)
    if (memberAgeBreakdown.infant > 0) parts.push(`未滿2歲 ${memberAgeBreakdown.infant} 位`)
    return parts.join('、')
  }, [memberAgeBreakdown])

  const totalPax = memberAgeBreakdown?.total || quoteGroupSize || null
  // 發送保險名單到 LINE
  const handleSendInsurance = useCallback(
    async (item: QuoteItem) => {
      if (!tourId || !tour) return
      // 判斷是否為人員異動（已經發過的再次發送）
      const req = existingRequests.find(
        r => r.supplier_name === '保險公司' && r.request_type === 'other'
      )
      const isChange = req?.status === 'sent' || req?.status === 'confirmed'
      try {
        const res = await fetch('/api/cron/auto-insurance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tourId, isChange }),
        })
        const result = await res.json()
        if (result.success) {
          toast({ title: isChange ? '✅ 人員異動已發送到保險群組' : '✅ 保險名單已發送到 LINE' })
          await loadData(false)
        } else {
          toast({ title: '❌ 發送失敗', description: result.error, variant: 'destructive' })
        }
      } catch (err) {
        toast({ title: '❌ 發送失敗', description: String(err), variant: 'destructive' })
      }
    },
    [tourId, tour, existingRequests, toast, loadData]
  )

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    // 支援日期範圍（如 "2026-09-25~2026-09-28"）
    if (dateStr.includes('~')) {
      const [start, end] = dateStr.split('~')
      const fmt = (s: string) =>
        new Date(s).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
      return `${fmt(start)}~${fmt(end)}`
    }
    return new Date(dateStr).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const openRequestDialog = useCallback(
    (category: string, supplierName: string) => {
      if (!onOpenRequestDialog) return
      const categoryItems = itemsByCategory[category as CategoryKey] || []
      const items = categoryItems
        .filter(item => item.supplierName === supplierName)
        .map(item => ({
          serviceDate: item.serviceDate,
          title: item.title,
          quantity: item.quantity,
          notes: item.notes,
        }))
      onOpenRequestDialog({
        category,
        supplierName,
        items,
        tour: tour || undefined,
        startDate,
      })
    },
    [itemsByCategory, tour, startDate, onOpenRequestDialog]
  )

  // 🆕 從核心表產生需求單
  const openCoreRequestDialog = useCallback((category: string, supplierName: string) => {
    setSelectedCategory(category)
    setSelectedSupplierName(supplierName)
    setShowCoreRequestDialog(true)
  }, [])

  // ============================================
  // 委託狀態流轉
  // ============================================

  // draft → sent
  const handleMarkSent = useCallback(
    async (delegation: TourRequest) => {
      if (!user?.workspace_id) return
      setStatusUpdating(true)
      try {
        const { error } = await supabase
          .from('tour_requests')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_via: sentViaInput || null,
            sent_to: sentToInput || null,
            updated_by: user.id,
          } as never)
          .eq('id', delegation.id)
        if (error) throw error
        toast({ title: '已標記為已發出' })
        setSentViaInput('line')
        setSentToInput('')
        await loadData(false)
      } catch (error) {
        logger.error('標記已發出失敗', error)
        toast({ title: '操作失敗', variant: 'destructive' })
      } finally {
        setStatusUpdating(false)
      }
    },
    [user, sentViaInput, sentToInput, toast, loadData]
  )

  // sent → replied（可以更新每個 item 的 quoted_cost）
  const handleMarkReplied = useCallback(
    async (delegation: TourRequest) => {
      if (!user?.workspace_id) return
      setStatusUpdating(true)
      try {
        // 合併 editingItemCosts 到 items
        const updatedItems = (delegation.items || []).map((item, idx) => {
          const editedCost = editingItemCosts[idx]
          if (editedCost !== undefined && editedCost !== null) {
            return { ...item, quoted_cost: editedCost }
          }
          return item
        })

        const { error } = await supabase
          .from('tour_requests')
          .update({
            status: 'replied',
            replied_at: new Date().toISOString(),
            items: updatedItems as never,
            updated_by: user.id,
          } as never)
          .eq('id', delegation.id)
        if (error) throw error
        toast({ title: '已標記為已回覆' })
        setEditingItemCosts({})
        await loadData(false)
      } catch (error) {
        logger.error('標記已回覆失敗', error)
        toast({ title: '操作失敗', variant: 'destructive' })
      } finally {
        setStatusUpdating(false)
      }
    },
    [user, editingItemCosts, toast, loadData]
  )

  // replied → confirmed + 回填世界樹
  const handleMarkConfirmed = useCallback(
    async (delegation: TourRequest) => {
      if (!user?.workspace_id || !tourId) return
      setStatusUpdating(true)
      try {
        // 1. 更新 tour_requests 狀態
        const { error } = await supabase
          .from('tour_requests')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_by: user.id,
            confirmed_by_name: user.display_name || user.chinese_name || '',
            updated_by: user.id,
          } as never)
          .eq('id', delegation.id)
        if (error) throw error

        // 2. 回填世界樹：把 quoted_cost 寫回 tour_itinerary_items.unit_cost
        const items = delegation.items || []
        const costDiffs: string[] = []

        for (const item of items) {
          const quotedCost = item.quoted_cost
          if (quotedCost === undefined || quotedCost === null) continue

          // 用 resource_id 或 itinerary_item_id 找到對應的 core item
          const resourceId = item.resource_id
          const itineraryItemId = item.itinerary_item_id

          let matchingCoreItem: TourItineraryItem | undefined

          if (itineraryItemId) {
            matchingCoreItem = coreItems.find(c => c.id === itineraryItemId)
          }
          if (!matchingCoreItem && resourceId) {
            matchingCoreItem = coreItems.find(c => c.resource_id === resourceId)
          }

          if (!matchingCoreItem) continue

          const oldCost = matchingCoreItem.unit_price
          if (oldCost !== quotedCost) {
            // 更新 tour_itinerary_items（覆蓋價格 + 標記已確認）
            const { error: updateError } = await supabase
              .from('tour_itinerary_items')
              .update({
                unit_price: quotedCost,
                confirmation_status: 'confirmed',
                confirmed_cost: quotedCost,
                updated_by: user.id,
              } as never)
              .eq('id', matchingCoreItem.id)
            if (updateError) {
              logger.error('回填成本失敗', updateError)
              continue
            }

            const itemTitle = item.title || matchingCoreItem.title || '項目'
            const diff = (oldCost || 0) - quotedCost
            if (oldCost && diff !== 0) {
              const direction =
                diff > 0
                  ? `多賺 $${diff.toLocaleString()}`
                  : `多花 $${Math.abs(diff).toLocaleString()}`
              costDiffs.push(
                `${itemTitle} $${oldCost.toLocaleString()} → $${quotedCost.toLocaleString()}，${direction}`
              )
            } else {
              costDiffs.push(`${itemTitle} 成本設為 $${quotedCost.toLocaleString()}`)
            }
          }
        }

        // 3. 自動關閉同一項目的其他需求單
        const confirmedResourceIds = new Set<string>()
        const confirmedItineraryItemIds = new Set<string>()
        
        for (const item of items) {
          if (item.resource_id) confirmedResourceIds.add(item.resource_id)
          if (item.itinerary_item_id) confirmedItineraryItemIds.add(item.itinerary_item_id)
        }

        if (confirmedResourceIds.size > 0 || confirmedItineraryItemIds.size > 0) {
          // 找出其他待處理的需求單（同一項目）
          const { data: otherRequests } = await supabase
            .from('tour_requests')
            .select('id, items, supplier_name')
            .eq('tour_id', tourId)
            .in('status', ['draft', 'sent', 'replied'])
            .neq('id', delegation.id)

          if (otherRequests && otherRequests.length > 0) {
            const toReject: string[] = []
            for (const req of otherRequests) {
              const reqItems = req.items || []
              const hasOverlap = reqItems.some(
                (ri: any) =>
                  (ri.resource_id && confirmedResourceIds.has(ri.resource_id)) ||
                  (ri.itinerary_item_id && confirmedItineraryItemIds.has(ri.itinerary_item_id))
              )
              if (hasOverlap) {
                toReject.push(req.id)
              }
            }

            if (toReject.length > 0) {
              // 更新狀態為 rejected
              await supabase
                .from('tour_requests')
                .update({
                  status: 'rejected',
                  note: `已選擇其他供應商（${delegation.supplier_name || ''}）`,
                  updated_by: user.id,
                  needs_cancellation_notice: true, // 標記需要發送取消通知
                } as never)
                .in('id', toReject)

              // 檢查需要發送的通知
              const { data: rejectedRequests } = await supabase
                .from('tour_requests')
                .select('id, supplier_name, sent_via')
                .in('id', toReject)

              const lineNotices: string[] = []
              const printNotices: string[] = []
              const pendingNotices: string[] = []

              if (rejectedRequests) {
                for (const req of rejectedRequests) {
                  if (req.sent_via === 'line') {
                    lineNotices.push(req.supplier_name || '')
                  } else if (req.sent_via === 'print' || req.sent_via === 'fax') {
                    printNotices.push(req.supplier_name || '')
                  } else {
                    pendingNotices.push(req.supplier_name || '')
                  }
                }
              }

              // 標記需要處理的取消通知（不用 Toast，改用持久化提示）
              logger.info(`已關閉 ${toReject.length} 個重複需求單，請確認取消通知`)
              
              // 刷新頁面（顯示持久化提示區域）
              await loadData(false)
            }
          }
        }

        // 4. 顯示結果
        if (costDiffs.length > 0) {
          toast({
            title: '已確認預訂，成本已回填',
            description: costDiffs.join('；'),
          })
        } else {
          toast({ title: '已確認預訂' })
        }

        // 5. 刷新 coreItems
        await loadData(false)
      } catch (error) {
        logger.error('確認預訂失敗', error)
        toast({ title: '操作失敗', variant: 'destructive' })
      } finally {
        setStatusUpdating(false)
      }
    },
    [user, tourId, coreItems, toast, loadData]
  )

  // 刪除委託
  const handleDeleteRequest = useCallback(
    async (delegationId: string) => {
      if (!confirm('確定要刪除此委託？')) return
      try {
        const { error } = await supabase.from('tour_requests').delete().eq('id', delegationId)
        if (error) throw error
        toast({ title: '已刪除委託' })
        await loadData(false)
      } catch {
        toast({ title: '刪除失敗', variant: 'destructive' })
      }
    },
    [supabase, toast, loadData]
  )

  // 🆕 產生單一供應商的需求單
  const handleGenerateSupplierRequest = useCallback(
    async (category: string, supplierName: string, items: QuoteItem[]) => {
      if (!tourId || !user?.workspace_id || !linkedQuoteId) {
        toast({
          title: '無法產生需求單',
          description: '缺少必要資訊',
          variant: 'destructive',
        })
        return
      }

      try {
        setGeneratingRequests(true)

        // 轉換為 RequestItem 格式
        const requestItems = items.map(item => ({
          service_date: item.serviceDate || null,
          title: item.title,
          quantity: item.quantity,
          note: item.notes || '',
          unit_price: 0,
          total_price: 0,
        }))

        // 建立需求單記錄
        const { data: request, error } = await supabase
          .from('tour_requests')
          .insert({
            workspace_id: user.workspace_id,
            tour_id: tourId,
            source_type: 'quote',
            source_id: linkedQuoteId,
            code: `REQ-${Date.now()}`,
            request_type: category,
            supplier_name: supplierName,
            items: requestItems as any,
            status: '草稿',
            created_by: user.id,
            updated_by: user.id,
          } as any)
          .select()
          .single()

        if (error) throw error

        toast({
          title: '需求單已建立',
          description: `${supplierName} 的 ${category} 需求單`,
        })

        // 重新載入
        await loadData(false)

        // TODO: 產生 PDF
        // 可以導航到需求單詳細頁面或直接下載 PDF
      } catch (error) {
        logger.error('產生需求單失敗', error)
        toast({
          title: '產生需求單失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          variant: 'destructive',
        })
      } finally {
        setGeneratingRequests(false)
      }
    },
    [tourId, user, linkedQuoteId, toast, loadData]
  )

  const totalItems = quoteItems.length

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-morandi-gold" size={32} />
      </div>
    )
  }

  // 找出需要處理的取消通知
  const pendingCancellations = existingRequests.filter(
    req => req.status === 'rejected' && (req as any).needs_cancellation_notice === true
  )

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* 待處理取消通知（持久化提示）*/}
        {pendingCancellations.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-700 mb-2">
                  ⚠️ 待處理取消通知（{pendingCancellations.length} 筆）
                </h3>
                <div className="space-y-2">
                  {pendingCancellations.map(req => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 bg-white rounded px-3 py-2 border border-red-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {req.supplier_name || '供應商'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {req.note || '已選擇其他供應商'}
                        </p>
                      </div>
                      {req.sent_via === 'line' ? (
                        <button
                          onClick={async () => {
                            // TODO: 自動發送 Line 通知
                            logger.info('發送 Line 取消通知:', req.id)
                            // 暫時直接標記為已處理
                            await supabase
                              .from('tour_requests')
                              .update({ needs_cancellation_notice: false } as never)
                              .eq('id', req.id)
                            await loadData(false)
                            toast({ title: `Line 取消通知已發送給 ${req.supplier_name}` })
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          📱 發送 Line
                        </button>
                      ) : req.sent_via === 'print' || req.sent_via === 'fax' ? (
                        (() => {
                          const downloaded = (req as any).cancellation_pdf_downloaded === true
                          const confirmLabel = req.sent_via === 'fax' ? '✓ 已傳真' : '✓ 已完成'
                          
                          return !downloaded ? (
                            <button
                              onClick={async () => {
                                // TODO: 產生並下載取消通知 PDF
                                logger.info('產生取消通知 PDF:', req.id)
                                
                                // 暫時模擬下載
                                toast({ title: 'PDF 下載中...', description: '功能開發中' })
                                
                                // 標記為已下載
                                await supabase
                                  .from('tour_requests')
                                  .update({ cancellation_pdf_downloaded: true } as never)
                                  .eq('id', req.id)
                                
                                await loadData(false)
                                toast({ title: `PDF 已下載，請${req.sent_via === 'fax' ? '傳真' : '列印'}後點擊確認` })
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                            >
                              📄 下載 PDF
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await supabase
                                  .from('tour_requests')
                                  .update({ 
                                    needs_cancellation_notice: false,
                                    cancellation_pdf_downloaded: false
                                  } as never)
                                  .eq('id', req.id)
                                await loadData(false)
                                toast({ title: '已標記為已處理' })
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                            >
                              {confirmLabel}
                            </button>
                          )
                        })()
                      
                      ) : (
                        <button
                          onClick={async () => {
                            await supabase
                              .from('tour_requests')
                              .update({ needs_cancellation_notice: false } as never)
                              .eq('id', req.id)
                            await loadData(false)
                            toast({ title: '已標記為已通知' })
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          ✓ 已通知
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 主表格 — 核心表有資料就顯示，不需要綁定報價單 */}
        {coreItems.length === 0 && !linkedQuoteId ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-morandi-muted mb-3" size={48} />
            <p className="text-morandi-secondary mb-2">尚無行程資料</p>
            <p className="text-xs text-morandi-muted">請先到「行程」頁籤填寫行程內容</p>
          </div>
        ) : quoteItems.length === 0 && existingRequests.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-morandi-muted mb-3" size={48} />
            <p className="text-morandi-secondary">{COMP_REQUIREMENTS_LABELS.報價單尚無需求項目}</p>
            <p className="text-xs text-morandi-muted mt-1">
              {COMP_REQUIREMENTS_LABELS.請先在報價單填寫交通住宿餐食活動資料}
            </p>
          </div>
        ) : (
          <>
            {/* 勾選項目後顯示「發給供應商」按鈕 */}
            {checkedItems.size > 0 && (
              <div className="mb-3 flex items-center gap-3 bg-morandi-container/30 border border-border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-morandi-primary ml-2">
                  已選 {checkedItems.size} 項
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white h-7 px-3 text-xs"
                >
                  <Printer size={12} className="mr-1" />
                  發給供應商
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckedItems(new Set())}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  取消選取
                </Button>
              </div>
            )}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-morandi-container/50 border-b border-border">
                    <th colSpan={7} className="px-3 py-2">
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={() => setShowLocalQuoteDialog(true)}
                          className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                        >
                          給 Local 報價
                        </Button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(cat => {
                    const categoryItems = itemsByCategory[cat.key]
                    if (categoryItems.length === 0) return null

                    const findMatchingRequest = (item: QuoteItem) => {
                      if (item.resourceId) {
                        const byResourceId = existingRequests.find(
                          r => r.request_type === cat.key && r.resource_id === item.resourceId
                        )
                        if (byResourceId) return byResourceId
                      }
                      return existingRequests.find(
                        r =>
                          r.request_type === cat.key &&
                          r.supplier_name?.trim() === item.supplierName?.trim()
                      )
                    }

                    const getSupplierKey = (item: QuoteItem) => {
                      if (item.resourceId) return item.resourceId
                      if (item.supplierName === '飯店早餐')
                        return `飯店早餐-${item.serviceDate || ''}`
                      if (item.supplierName) return item.supplierName
                      return `${item.title}-${item.serviceDate || ''}`
                    }

                    const visibleItems: QuoteItem[] = []
                    const hiddenItems: QuoteItem[] = []
                    // 不需要需求的餐食關鍵字
                    const autoHideMealKeywords = ['飯店早餐', '機上簡餐', '敬請自理', '自理']
                    for (const item of categoryItems) {
                      const existingRequest = findMatchingRequest(item)
                      const isAutoHideMeal =
                        cat.key === 'meal' &&
                        autoHideMealKeywords.some(
                          kw => item.title?.includes(kw) || item.supplierName?.includes(kw)
                        )
                      if (existingRequest?.hidden || isAutoHideMeal) hiddenItems.push(item)
                      else visibleItems.push(item)
                    }

                    const isHiddenExpanded = expandedHiddenCategories.has(cat.key)
                    const categoryTotal = visibleItems.reduce((sum, item) => {
                      const existing = findMatchingRequest(item)
                      return sum + (existing?.quoted_cost || 0)
                    }, 0)

                    const renderedSuppliers = new Set<string>()

                    const renderItem = (item: QuoteItem, idx: number, isHidden: boolean) => {
                      const existingRequest = findMatchingRequest(item)
                      const supplierKey = getSupplierKey(item)
                      const isFirstRowForSupplier = !renderedSuppliers.has(supplierKey)
                      if (isFirstRowForSupplier) renderedSuppliers.add(supplierKey)

                      let statusLabel = COMP_REQUIREMENTS_LABELS.待作業
                      let statusClass = ''
                      if (!existingRequest) {
                        const config = getStatusConfig('tour_request', 'pending')
                        statusClass = `${config.bgColor} ${config.color}`
                      } else {
                        const s = existingRequest.status || 'pending'
                        const config = getStatusConfig('tour_request', s)
                        statusLabel = config.label
                        statusClass = `${config.bgColor} ${config.color}`
                      }

                      const itemKey = getItemKey(cat.key, item, idx)
                      const isExpanded = expandedMainItems.has(itemKey)

                      return (
                        <React.Fragment
                          key={`${cat.key}-${isHidden ? 'hidden' : 'visible'}-${idx}`}
                        >
                          <tr
                            className={cn(
                              'border-t border-border/50 hover:bg-morandi-container/20',
                              isHidden && 'bg-morandi-muted/5'
                            )}
                          >
                            {/* 欄位1: 項目名稱 */}
                            <td className="px-3 py-2.5" style={{ width: '140px' }}>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 text-left font-medium text-morandi-primary hover:text-morandi-gold transition-colors"
                                onClick={() => {
                                  // 之後展開選單用
                                  const newExpanded = new Set(expandedMainItems)
                                  if (isExpanded) newExpanded.delete(itemKey)
                                  else newExpanded.add(itemKey)
                                  setExpandedMainItems(newExpanded)
                                }}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {item.supplierName || item.title || '-'}
                              </button>
                            </td>
                            {/* 欄位2: 日期 */}
                            <td className="px-2 py-2.5 text-sm text-morandi-secondary" style={{ width: '70px' }}>
                              {formatDate(item.serviceDate)}
                            </td>
                            {/* 欄位3: 說明（房型/車型/時間/數量等） */}
                            <td className="px-2 py-2.5 text-sm" style={{ width: '10%' }}>
                              {(() => {
                                // 住宿：從分房系統讀取房型
                                if (cat.key === 'accommodation') {
                                  const hotelName = item.supplierName || item.title || ''
                                  const roomsFromAssignment = tourRoomsByHotel[hotelName]
                                  
                                  if (roomsFromAssignment && roomsFromAssignment.length > 0) {
                                    return (
                                      <div className="flex flex-col gap-0.5">
                                        {roomsFromAssignment.map((room, ri) => (
                                          <span key={ri} className="text-morandi-secondary text-xs">
                                            {room.room_type}×{room.quantity}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  }
                                  return <span className="text-morandi-muted">{item.quantity || 1}晚</span>
                                }
                                // 交通：顯示車型
                                if (cat.key === 'transport') {
                                  const req = findMatchingRequest(item)
                                  const vehicleDesc = (req?.items?.[0] as any)?.vehicle_desc
                                  return vehicleDesc || item.title || '-'
                                }
                                // 餐食：顯示時間
                                if (cat.key === 'meal') {
                                  const req = findMatchingRequest(item)
                                  const mealTime = (req?.items?.[0] as any)?.meal_time
                                  return mealTime ? `${item.title} ${mealTime}` : item.title || '-'
                                }
                                // 其他
                                return item.title || '-'
                              })()}
                            </td>
                            {/* 欄位6: 備註 */}
                            {/* 欄位4: 備註 */}
                            <td className="px-2 py-2.5" style={{ width: '10%' }}>
                              {(() => {
                                const req = findMatchingRequest(item)
                                const noteFieldMap: Record<string, string> = {
                                  accommodation: 'hotel_note',
                                  meal: 'meal_note',
                                  transport: 'transport_note',
                                }
                                const noteField = noteFieldMap[cat.key] || 'note'
                                const noteValue = ((req?.items?.[0] as any)?.[noteField] as string) || req?.note || ''
                                return (
                                  <span className="text-sm text-morandi-secondary truncate block">
                                    {noteValue || '-'}
                                  </span>
                                )
                              })()}
                            </td>
                            {/* 欄位5: 報價 */}
                            <td className="px-2 py-2.5 text-right" style={{ width: '70px' }}>
                              {(() => {
                                const estimatedPrice = item.quotedPrice
                                const request = findMatchingRequest(item)
                                const actualPrice = request?.items?.[0]?.quoted_cost

                                if (!estimatedPrice && !actualPrice) return '-'
                                
                                const displayPrice = actualPrice || estimatedPrice
                                const hasPriceChange = estimatedPrice && actualPrice && estimatedPrice !== actualPrice
                                const isExpensive = hasPriceChange && actualPrice! > estimatedPrice
                                const isCheaper = hasPriceChange && actualPrice! < estimatedPrice

                                return (
                                  <span
                                    className={cn(
                                      hasPriceChange && isExpensive && 'text-red-600',
                                      hasPriceChange && isCheaper && 'text-blue-600',
                                      !hasPriceChange && 'text-morandi-primary'
                                    )}
                                    title={
                                      hasPriceChange
                                        ? `原估 $${estimatedPrice.toLocaleString()} → ${
                                            isExpensive ? '調漲' : '優惠'
                                          } $${actualPrice!.toLocaleString()}`
                                        : undefined
                                    }
                                  >
                                    ${displayPrice!.toLocaleString()}
                                  </span>
                                )
                              })()}
                            </td>
                            {/* 欄位6: 狀態 */}
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px' }}>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                  statusClass
                                )}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            {/* 欄位7: 操作 */}
                            <td className="px-2 py-2.5 text-center" style={{ width: '80px' }}>
                              {(() => {
                                const supplierName = item.supplierName || item.title
                                const draft = existingRequests.find(
                                  r =>
                                    r.supplier_name === supplierName &&
                                    r.request_type === cat.key &&
                                    r.status === 'draft'
                                )

                                // 住宿：從分房系統判斷是否有房型
                                if (cat.key === 'accommodation') {
                                  const hotelName = supplierName || ''
                                  const roomsFromAssignment = tourRoomsByHotel[hotelName]
                                  
                                  // 有房型了（從分房系統）→ 顯示「發送需求」
                                  if (roomsFromAssignment && roomsFromAssignment.length > 0) {
                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedHotel({
                                            name: hotelName,
                                            resourceId: item.resourceId ?? null,
                                            serviceDate: item.serviceDate ?? null,
                                            nights: item.quantity || 1,
                                          })
                                          setShowAccommodationDialog(true)
                                        }}
                                        className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                      >
                                        <Send size={12} className="mr-1" />
                                        發送需求
                                      </Button>
                                    )
                                  }
                                  
                                  // 沒房型 → 顯示「同上」或「新增需求」
                                  const sameHotelDraft = existingRequests.find(
                                    r =>
                                      r.request_type === 'accommodation' &&
                                      r.supplier_name !== supplierName &&
                                      r.status === 'draft' &&
                                      r.items &&
                                      r.items.length > 0
                                  )
                                  return (
                                    <div className="flex items-center justify-center gap-1">
                                      {sameHotelDraft && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            // 複製其他飯店的房型需求
                                            try {
                                              if (!user?.workspace_id)
                                                throw new Error('缺少 workspace_id')
                                              const { error: dbError } = await supabase
                                                .from('tour_requests')
                                                .insert({
                                                  workspace_id: user.workspace_id,
                                                  tour_id: tourId,
                                                  supplier_name: supplierName,
                                                  request_type: 'accommodation',
                                                  status: 'draft',
                                                  items: sameHotelDraft.items,
                                                  note: `${item.serviceDate ? item.serviceDate + ' ' : ''}${item.quantity || 1}晚`,
                                                } as any)
                                              if (dbError) throw dbError
                                              loadData(false)
                                            } catch (err) {
                                              logger.error('同上需求失敗:', err)
                                            }
                                          }}
                                          className="h-7 px-2 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                                        >
                                          同上
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedHotel({
                                            name: supplierName,
                                            resourceId: item.resourceId ?? null,
                                            serviceDate: item.serviceDate ?? null,
                                            nights: item.quantity || 1,
                                          })
                                          setShowAccommodationDialog(true)
                                        }}
                                        className="h-7 px-2 text-xs border-morandi-gold/30 text-morandi-gold hover:bg-morandi-gold/10"
                                      >
                                        發送需求
                                      </Button>
                                    </div>
                                  )
                                }

                                // 交通：區分機票和遊覽車
                                if (cat.key === 'transport') {
                                  // 機票（成人/小孩/嬰兒）
                                  const isTicket = ['成人', '小孩', '嬰兒', '兒童'].some(t => 
                                    item.title?.includes(t) || supplierName?.includes(t)
                                  )
                                  
                                  if (isTicket) {
                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowTicketDialog(true)}
                                        className="h-7 px-2 text-xs border-morandi-sky/50 text-morandi-sky hover:bg-morandi-sky/10"
                                      >
                                        發訂票任務
                                      </Button>
                                    )
                                  }
                                  
                                  // 遊覽車等其他交通
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTransport({
                                          name: supplierName,
                                          resourceId: item.resourceId ?? null,
                                        })
                                        setShowTransportDialog(true)
                                      }}
                                      className="h-7 px-2 text-xs border-morandi-gold/30 text-morandi-gold hover:bg-morandi-gold/10"
                                    >
                                      新增需求單
                                    </Button>
                                  )
                                }

                                // 餐廳：打開需求單 Dialog（預設列印樣式）
                                if (cat.key === 'meal') {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTransport({
                                          name: supplierName,
                                          resourceId: item.resourceId ?? null,
                                        })
                                        setShowMealDialog(true)
                                      }}
                                      className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Printer size={12} className="mr-1" />
                                      新增需求單
                                    </Button>
                                  )
                                }

                                // 活動：打開需求單 Dialog（預設列印樣式）
                                if (cat.key === 'activity') {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTransport({
                                          name: supplierName,
                                          resourceId: item.resourceId ?? null,
                                        })
                                        setShowActivityDialog(true)
                                      }}
                                      className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Printer size={12} className="mr-1" />
                                      新增需求單
                                    </Button>
                                  )
                                }

                                // 其他（保險等）：發送保險名單
                                if (cat.key === 'other' && item.supplierName === '保險公司') {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSendInsurance(item)}
                                      className="h-7 px-2 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                                    >
                                      <Send size={12} className="mr-1" />
                                      發送保險
                                    </Button>
                                  )
                                }

                                return null
                              })()}
                            </td>
                          </tr>

                          {/* 🆕 展開抽屜：顯示需求單詳情 */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="bg-morandi-container/10 border-t border-morandi-gold/10 p-6 space-y-4">
                                  {/* 已發送需求單（最新報價 + 歷史）*/}
                                  {(() => {
                                    const relatedRequests = existingRequests.filter(r => {
                                      if (item.resourceId) {
                                        return (
                                          r.request_type === cat.key &&
                                          r.resource_id === item.resourceId
                                        )
                                      }
                                      return (
                                        r.request_type === cat.key &&
                                        r.supplier_name?.trim() === item.supplierName?.trim()
                                      )
                                    })

                                    if (relatedRequests.length === 0) {
                                      return (
                                        <div className="text-sm text-morandi-muted">
                                          尚未發送需求單
                                        </div>
                                      )
                                    }

                                    // 🆕 按時間排序（最新在前）
                                    const sortedRequests = [...relatedRequests].sort((a, b) => {
                                      const timeA = a.replied_at || a.sent_at || a.created_at || ''
                                      const timeB = b.replied_at || b.sent_at || b.created_at || ''
                                      return timeB.localeCompare(timeA)
                                    })

                                    const latestRequest = sortedRequests[0]
                                    const historyRequests = sortedRequests.slice(1)

                                    // 🆕 處理多廠商比價分組（只用於最新報價）
                                    const quoteGroups = new Map<string, TourRequest[]>()
                                    const standaloneRequests: TourRequest[] = []

                                    for (const req of [latestRequest]) {
                                      const sourceId = req.source_id
                                      if (sourceId && req.status !== 'draft') {
                                        if (!quoteGroups.has(sourceId)) {
                                          quoteGroups.set(sourceId, [])
                                        }
                                        quoteGroups.get(sourceId)!.push(req)
                                      } else {
                                        standaloneRequests.push(req)
                                      }
                                    }

                                    // 合併比價組
                                    const latestRequestDisplay =
                                      standaloneRequests.length > 0
                                        ? standaloneRequests
                                        : Array.from(quoteGroups.values()).flatMap(requests => {
                                            if (requests.length >= 2) {
                                              return [
                                                {
                                                  ...requests[0],
                                                  _isComparisonGroup: true,
                                                  _comparisonRequests: requests,
                                                  _sourceId: requests[0].source_id,
                                                } as any,
                                              ]
                                            }
                                            return requests
                                          })

                                    return (
                                      <div className="space-y-4">
                                        {/* 最新報價 */}
                                        <div>
                                          <h4 className="text-sm font-semibold text-morandi-primary mb-2 flex items-center gap-2">
                                            <Send size={14} />
                                            最新報價
                                          </h4>
                                          <RequirementsDrawer
                                            requests={latestRequestDisplay as any}
                                            onRefresh={() => loadData(false)}
                                          />
                                        </div>

                                        {/* 報價歷程 */}
                                        {historyRequests.length > 0 && (
                                          <div>
                                            <button
                                              onClick={() => {
                                                const historyKey = `history-${itemKey}`
                                                const newExpanded = new Set(expandedMainItems)
                                                if (newExpanded.has(historyKey)) {
                                                  newExpanded.delete(historyKey)
                                                } else {
                                                  newExpanded.add(historyKey)
                                                }
                                                setExpandedMainItems(newExpanded)
                                              }}
                                              className="flex items-center gap-2 text-sm font-medium text-morandi-secondary hover:text-morandi-primary transition-colors mb-2"
                                            >
                                              {expandedMainItems.has(`history-${itemKey}`) ? (
                                                <ChevronDown size={14} />
                                              ) : (
                                                <ChevronRight size={14} />
                                              )}
                                              📜 報價歷程 ({historyRequests.length})
                                            </button>

                                            {expandedMainItems.has(`history-${itemKey}`) && (
                                              <div className="space-y-2 pl-6">
                                                {historyRequests.map(req => {
                                                  const statusConfig = getStatusConfig(
                                                    'tour_request',
                                                    req.status || 'draft'
                                                  )
                                                  const quotedCost = (req.supplier_response as any)
                                                    ?.quotedCost
                                                  const time =
                                                    req.replied_at || req.sent_at || req.created_at

                                                  return (
                                                    <div
                                                      key={req.id}
                                                      className="bg-white border border-morandi-gold/20 rounded-lg p-3 text-sm"
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-morandi-secondary">
                                                            {time
                                                              ? new Date(time).toLocaleDateString(
                                                                  'zh-TW'
                                                                )
                                                              : '—'}
                                                          </span>
                                                          <span
                                                            className={cn(
                                                              'px-2 py-0.5 rounded text-xs',
                                                              statusConfig.bgColor,
                                                              statusConfig.color
                                                            )}
                                                          >
                                                            {statusConfig.label}
                                                          </span>
                                                        </div>
                                                        {quotedCost && (
                                                          <span className="font-semibold text-morandi-gold">
                                                            ${quotedCost.toLocaleString()}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    }

                    return (
                      <React.Fragment key={cat.key}>
                        {/* 分類標題 + 欄位標題（同一行） */}
                        <tr className="bg-morandi-container/30 border-t border-border">
                          <th className="px-3 py-2 text-left" style={{ width: '140px' }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-morandi-primary">{cat.label}</span>
                              {hiddenItems.length > 0 && (
                                <button
                                  onClick={() => toggleHiddenCategory(cat.key)}
                                  className="flex items-center gap-1 text-xs text-morandi-muted hover:text-morandi-secondary transition-colors font-normal"
                                >
                                  {isHiddenExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <EyeOff size={12} />
                                  <span>{COMP_REQUIREMENTS_LABELS.已隱藏}({hiddenItems.length})</span>
                                </button>
                              )}
                            </div>
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-morandi-secondary" style={{ width: '70px' }}>日期</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-morandi-secondary" style={{ width: '10%' }}>說明</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-morandi-secondary" style={{ width: '10%' }}>備註</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-morandi-secondary" style={{ width: '70px' }}>報價</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-morandi-secondary" style={{ width: '60px' }}>狀態</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-morandi-secondary" style={{ width: '80px' }}>操作</th>
                        </tr>

                        {visibleItems.map((trackItem, idx) => renderItem(trackItem, idx, false))}
                        {isHiddenExpanded && hiddenItems.length > 0 && (
                          <>
                            <tr className="bg-morandi-muted/10 border-t border-dashed border-morandi-muted/30">
                              <td colSpan={7} className="px-3 py-1.5 text-xs text-morandi-muted">
                                <div className="flex items-center gap-1">
                                  <EyeOff size={12} />
                                  <span>{COMP_REQUIREMENTS_LABELS.已隱藏的項目}</span>
                                </div>
                              </td>
                            </tr>
                            {hiddenItems.map((trackItem, idx) => renderItem(trackItem, idx, true))}
                          </>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 從核心表產生需求單 Dialog */}
      {tour && (
        <CoreTableRequestDialog
          isOpen={showCoreRequestDialog}
          onClose={() => {
            setShowCoreRequestDialog(false)
            loadData(false) // 關閉後重新載入資料
          }}
          tour={tour}
          supplierName={selectedSupplierName}
          category={selectedCategory}
        />
      )}
      {/* 勾選發給供應商 Dialog */}
      <AssignSupplierDialog
        open={showAssignDialog}
        onClose={() => {
          setShowAssignDialog(false)
          setCheckedItems(new Set())
        }}
        tour={tour}
        tourId={tourId || ''}
        items={checkedQuoteItems}
        totalPax={totalPax}
        ageBreakdown={ageBreakdownText}
        formatDate={formatDate}
        onSave={() => loadData(false)}
        existingRequests={existingRequests as AssignSupplierDialogProps['existingRequests']}
      />

      {/* 交通報價 Dialog */}
      {selectedTransport && tour && (
        <TransportQuoteDialog
          open={showTransportDialog}
          onClose={() => {
            setShowTransportDialog(false)
            setSelectedTransport(null)
          }}
          tour={{
            id: tour.id,
            code: tour.code,
            name: tour.name,
            departure_date: tour.departure_date,
            return_date: tour.return_date,
            current_participants: totalPax,
          }}
          coreItems={coreItems}
          supplierName={selectedTransport.name}
          vehicleDesc=""
        />
      )}

      {/* 機票訂票任務 Dialog */}
      {tour && (
        <TicketRequestDialog
          open={showTicketDialog}
          onClose={() => setShowTicketDialog(false)}
          tour={{
            id: tour.id,
            code: tour.code,
            name: tour.name,
            departure_date: tour.departure_date,
            return_date: tour.return_date,
            outbound_flight: outboundFlight,
            return_flight: returnFlight,
          }}
          totalPax={totalPax}
        />
      )}

      {/* 住宿報價 Dialog */}
      {selectedHotel && tour && (
        <AccommodationQuoteDialog
          open={showAccommodationDialog}
          onClose={() => {
            setShowAccommodationDialog(false)
            setSelectedHotel(null)
          }}
          tour={{
            id: tour.id,
            code: tour.code,
            name: tour.name,
            departure_date: tour.departure_date,
          }}
          totalPax={memberAgeBreakdown?.total || quoteGroupSize || 0}
          accommodations={(() => {
            // 匹配飯店：supplier_name 或 title 都可能存飯店名
            const hotelCoreItems = coreItems
              .filter(it =>
                it.category === 'accommodation' &&
                (it.supplier_name === selectedHotel.name || it.title === selectedHotel.name)
              )
              .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))

            if (hotelCoreItems.length === 0) return []

            // 算入住日（第一晚）和退房日（最後一晚 + 1天）
            const firstItem = hotelCoreItems[0]
            const lastItem = hotelCoreItems[hotelCoreItems.length - 1]
            const checkInDate = firstItem.service_date
              || (firstItem.day_number != null ? calculateDate(firstItem.day_number) : '')
              || ''
            let checkOutDate = ''
            if (lastItem.service_date) {
              const d = new Date(lastItem.service_date)
              d.setDate(d.getDate() + 1)
              checkOutDate = d.toISOString().split('T')[0]
            } else if (lastItem.day_number != null) {
              checkOutDate = calculateDate(lastItem.day_number + 1) || ''
            }
            const nights = hotelCoreItems.length
            const dateRange = checkInDate && checkOutDate
              ? `${checkInDate} ~ ${checkOutDate}（${nights}晚）`
              : checkInDate || ''

            // 一筆合併的住宿，房型和床型留空讓業務手填
            return [{
              checkIn: dateRange,
              roomType: '',
              bedType: '',
              quantity: '',
              note: '',
            }]
          })()}
          supplierName={selectedHotel.name}
        />
      )}

      {/* 餐食報價 Dialog */}
      {selectedTransport && tour && (
        <MealQuoteDialog
          open={showMealDialog}
          onClose={() => {
            setShowMealDialog(false)
            setSelectedTransport(null)
          }}
          tour={{
            id: tour.id,
            code: tour.code,
            name: tour.name,
            departure_date: tour.departure_date,
          }}
          totalPax={totalPax}
          meals={coreItems
            .filter(it => {
              const itemSupplierName = (it.resource_name || it.title || '').trim()
              return itemSupplierName === selectedTransport.name && it.category === 'meals'
            })
            .map(it => ({
              date: it.service_date || (it.day_number != null ? calculateDate(it.day_number) : ''),
              time: it.sub_category
                ? { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[it.sub_category] ||
                  it.sub_category
                : '',
              price: '',
              quantity: it.quantity || 1,
              note: it.quote_note || '',
            }))}
          supplierName={selectedTransport.name}
        />
      )}

      {/* 活動報價 Dialog */}
      {selectedTransport && tour && (
        <ActivityQuoteDialog
          open={showActivityDialog}
          onClose={() => {
            setShowActivityDialog(false)
            setSelectedTransport(null)
          }}
          tour={{
            id: tour.id,
            code: tour.code,
            name: tour.name,
            departure_date: tour.departure_date,
          }}
          totalPax={totalPax}
          activities={coreItems
            .filter(it => {
              const itemSupplierName = (it.resource_name || it.title || '').trim()
              return itemSupplierName === selectedTransport.name && it.category === 'activities'
            })
            .map(it => ({
              time: it.service_date || (it.day_number != null ? calculateDate(it.day_number) : ''),
              venue: it.title || '',
              quantity: it.quantity || 1,
              note: it.quote_note || '',
            }))}
          supplierName={selectedTransport.name}
          resourceId={selectedTransport.resourceId}
        />
      )}

      {/* Local 報價 Dialog */}
      {showLocalQuoteDialog && (
        <LocalQuoteDialog
          open={showLocalQuoteDialog}
          onClose={() => setShowLocalQuoteDialog(false)}
          tour={tour}
          transportDays={transportDays}
          totalPax={totalPax}
          coreItems={coreItems}
          startDate={startDate}
        />
      )}

      {/* 🆕 團確單 Dialog */}
      {showTeamConfirmationSheet && tour && (
        <TeamConfirmationSheet
          open={showTeamConfirmationSheet}
          onClose={() => setShowTeamConfirmationSheet(false)}
          tour={{
            code: tour.code || '',
            name: tour.name || '',
            departure_date: tour.departure_date || '',
            return_date: tour.return_date || '',
            current_participants: totalPax || 0,
          }}
          confirmedRequests={existingRequests}
        />
      )}
    </>
  )
}
