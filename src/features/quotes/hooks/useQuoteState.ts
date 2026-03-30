import { getTodayString } from '@/lib/utils/format-date'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuotes } from './useQuotes'
import { useToursSlim, useTour, useItineraries, useOrdersSlim, createTour } from '@/data'
import { useWorkspaceChannels } from '@/stores/workspace'
import {
  CostCategory,
  ParticipantCounts,
  SellingPrices,
  costCategories,
  TierPricing,
  CostItem,
} from '../types'
import { QuickQuoteItem } from '@/types/quote.types'
import type { FlightInfo } from '@/stores/types/tour.types'
import { QUOTE_HOOKS_LABELS } from '../constants/labels'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import { coreItemsToCostCategories } from '../utils/core-table-adapter'

export const useQuoteState = () => {
  const params = useParams()
  const router = useRouter()
  const { quotes, updateQuote, loadQuotes } = useQuotes()
  const { items: tours } = useToursSlim()
  const { items: orders } = useOrdersSlim()
  const { workspaces, loadWorkspaces } = useWorkspaceChannels()
  const { items: itineraries } = useItineraries()

  const quote_id = params.id as string
  const quote = quotes.find(q => q.id === quote_id)

  // 自動載入 workspaces（如果還沒載入）
  useEffect(() => {
    if (workspaces.length === 0) {
      loadWorkspaces()
    }
  }, [])

  // 自動載入 quotes（如果還沒載入）
  useEffect(() => {
    if (quotes.length === 0) {
      loadQuotes()
    }
  }, [])

  // 完整 tour 資料（含定價欄位）
  const { item: fullTour } = useTour(quote?.tour_id ?? null)

  // 檢查是否為特殊團報價單
  const relatedTour = quote?.tour_id ? tours.find(t => t.id === quote.tour_id) : null
  const isSpecialTour = relatedTour?.status === '特殊團' // 使用中文狀態值
  const isReadOnly = isSpecialTour // 特殊團報價單設為唯讀

  // SWR 自動載入行程表

  // 找到關聯的行程表（用 itinerary_id 直接關聯）
  const linkedItinerary = useMemo(() => {
    if (quote?.itinerary_id) {
      const itinerary = itineraries.find(i => i.id === quote.itinerary_id)
      if (itinerary) return itinerary
    }
    return null
  }, [quote?.itinerary_id, itineraries])

  // === 核心表資料（有 tour_id 的報價單直接讀核心表）===
  const { items: coreItems, refresh: refreshCoreItems } = useTourItineraryItemsByTour(
    quote?.tour_id ?? null
  )
  const hasInitializedFromCore = useRef(false)

  // 檢查核心表是否有行程更新但報價還沒看過的項目
  const hasCoreChanges = useMemo(() => {
    if (!quote || coreItems.length === 0) return false
    return coreItems.some(item => item.quote_status === 'none')
  }, [coreItems, quote?.id])

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

  // 追蹤是否已添加過航班資訊，避免重複添加
  const hasAddedFlightInfo = useRef(false)
  const lastQuoteId = useRef<string | null>(null)
  const hasLoadedPricingFromTour = useRef(false)

  // 當 quote.id 改變時，重置航班添加狀態和核心表初始化狀態
  useEffect(() => {
    if (quote_id !== lastQuoteId.current) {
      hasAddedFlightInfo.current = false
      hasInitializedFromCore.current = false
      hasLoadedPricingFromTour.current = false
      hasLoadedTierPricings.current = false
      lastQuoteId.current = quote_id
    }
  }, [quote_id])

  // categories 初始為空分類，由核心表效果填入
  const [categories, setCategories] = useState<CostCategory[]>(() =>
    costCategories.map(cat => ({ ...cat, items: [], total: 0 }))
  )

  const [accommodationDays, setAccommodationDays] = useState<number>(0)

  // 多身份人數統計（初始值先用預設，由 effect 從 fullTour 或 quote 載入）
  const [participantCounts, setParticipantCounts] = useState<ParticipantCounts>({
    adult: 1,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })

  // 追蹤是否已經載入過砍次表，避免重複載入覆蓋用戶編輯
  const hasLoadedTierPricings = useRef(false)

  // 當 quote 載入後，更新 header 狀態（categories 由核心表效果處理）
  useEffect(() => {
    if (quote) {
      if (quote.name) {
        setQuoteName(quote.name)
      }
      // 快速報價單資料
      if (quote.quick_quote_items) {
        setQuickQuoteItems(quote.quick_quote_items as QuickQuoteItem[])
      }
      // 快速報價單客戶資訊
      setQuickQuoteCustomerInfo({
        customer_name: quote.customer_name || quote.name || '',
        contact_person: quote.contact_person || '',
        contact_phone: quote.contact_phone || '',
        contact_address: quote.contact_address || '',
        tour_code: quote.tour_code || relatedTour?.code || '',
        handler_name: quote.handler_name || 'William',
        issue_date: quote.issue_date || getTodayString(),
        received_amount: quote.received_amount || 0,
        expense_description:
          (quote as typeof quote & { expense_description?: string })?.expense_description || '',
      })
      // 讀取保險和不包含項目
      const metadata = (quote as typeof quote & { metadata?: any })?.metadata
      if (metadata) {
        if (metadata.insuranceText) setInsuranceText(metadata.insuranceText)
        if (Array.isArray(metadata.excludedItems)) setExcludedItems(metadata.excludedItems)
      }
    }
  }, [quote?.id, quote?.updated_at, relatedTour?.code])

  // 定價欄位從 fullTour 讀取（fallback 到 quote）
  useEffect(() => {
    if (hasLoadedPricingFromTour.current) return
    // 優先從 fullTour 讀取
    const source = fullTour || quote
    if (!source) return

    const accDays = fullTour?.accommodation_days ?? quote?.accommodation_days
    if (accDays !== undefined && accDays !== null) {
      setAccommodationDays(accDays)
    }

    const pc = fullTour?.participant_counts ?? quote?.participant_counts
    if (pc) {
      setParticipantCounts(pc as ParticipantCounts)
    } else if (quote?.tour_id && relatedTour) {
      // fallback: 從訂單或 tour 推算
      const tourOrders = orders.filter(order => order.tour_id === relatedTour.id)
      const totalMembers = tourOrders.reduce((sum, order) => sum + (order.member_count || 0), 0)
      if (totalMembers > 0) {
        setParticipantCounts({
          adult: totalMembers,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        })
      } else if (relatedTour.max_participants) {
        setParticipantCounts({
          adult: relatedTour.max_participants,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        })
      }
    } else if (quote?.group_size && quote.group_size > 0) {
      setParticipantCounts({
        adult: quote.group_size,
        child_with_bed: 0,
        child_no_bed: 0,
        single_room: 0,
        infant: 0,
      })
    }

    const sp = fullTour?.selling_prices ?? quote?.selling_prices
    if (sp) {
      setSellingPrices(sp as SellingPrices)
    }

    // 砍次表
    if (!hasLoadedTierPricings.current) {
      const tp = (fullTour?.tier_pricings ??
        (quote as typeof quote & { tier_pricings?: TierPricing[] })?.tier_pricings) as
        | TierPricing[]
        | undefined
      if (tp && Array.isArray(tp) && tp.length > 0) {
        setTierPricings(tp)
      }
      hasLoadedTierPricings.current = true
    }

    hasLoadedPricingFromTour.current = true
  }, [fullTour?.id, quote?.id])

  // === 核心表初始化：從核心表讀取分類 ===
  useEffect(() => {
    if (coreItems.length > 0 && !hasInitializedFromCore.current) {
      const coreCategories = coreItemsToCostCategories(coreItems)
      setCategories(coreCategories)

      // 從核心表推算住宿天數
      const maxAccDay = coreItems
        .filter(item => item.category === 'accommodation' && item.day_number)
        .reduce((max, item) => Math.max(max, item.day_number!), 0)
      if (maxAccDay > 0) {
        setAccommodationDays(maxAccDay)
      }

      hasInitializedFromCore.current = true
    }
  }, [coreItems])

  // 當行程表載入後，自動添加航班資訊到交通類別
  useEffect(() => {
    // 只在以下條件成立時添加航班項目：
    // 1. 有關聯的行程表
    // 2. 行程表有航班資訊
    // 3. 還沒添加過（避免重複）
    // 4. 報價單的交通類別還沒有「機票成人」項目（避免覆蓋用戶已編輯的資料）
    if (!linkedItinerary || hasAddedFlightInfo.current) return

    const outboundFlight = linkedItinerary.outbound_flight as FlightInfo | null
    const returnFlight = linkedItinerary.return_flight as FlightInfo | null

    // 沒有航班資訊，不需要添加
    if (!outboundFlight && !returnFlight) return

    // 檢查交通類別是否已有「機票成人」
    const transportCategory = categories.find(cat => cat.id === 'transport')
    const hasExistingFlightItem = transportCategory?.items.some(item => item.name === '機票成人')

    // 如果已有航班項目，不重複添加
    if (hasExistingFlightItem) {
      hasAddedFlightInfo.current = true
      return
    }

    // 格式化航班備註
    const flightNotes: string[] = []
    const outboundNote = formatFlightInfo(outboundFlight, '去程')
    const returnNote = formatFlightInfo(returnFlight, '回程')
    if (outboundNote) flightNotes.push(outboundNote)
    if (returnNote) flightNotes.push(returnNote)

    if (flightNotes.length === 0) return

    // 創建航班項目
    const flightItem: CostItem = {
      id: `flight-adult-${Date.now()}`,
      name: '機票成人',
      quantity: null, // 不填數量
      unit_price: null, // 不填金額
      total: 0,
      note: flightNotes.join('\n'),
    }

    // 添加到交通類別
    setCategories(prevCategories => {
      return prevCategories.map(cat => {
        if (cat.id === 'transport') {
          return {
            ...cat,
            items: [flightItem, ...cat.items],
          }
        }
        return cat
      })
    })

    hasAddedFlightInfo.current = true
  }, [linkedItinerary, categories, formatFlightInfo])

  // 總人數：直接用報價單設定的人數
  const groupSize =
    participantCounts.adult +
      participantCounts.child_with_bed +
      participantCounts.child_no_bed +
      participantCounts.single_room +
      participantCounts.infant || 1

  // 團體分攤人數（不含嬰兒）：直接用報價單設定的人數
  const groupSizeForGuide =
    participantCounts.adult +
      participantCounts.child_with_bed +
      participantCounts.child_no_bed +
      participantCounts.single_room || 1

  const [quoteName, setQuoteName] = useState<string>(quote?.name || '')
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  // 多身份售價（由 effect 從 fullTour 或 quote 載入）
  const [sellingPrices, setSellingPrices] = useState<SellingPrices>({
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })

  // 快速報價單相關狀態
  const [quickQuoteItems, setQuickQuoteItems] = useState<QuickQuoteItem[]>(
    (quote?.quick_quote_items as QuickQuoteItem[]) || []
  )
  const [quickQuoteCustomerInfo, setQuickQuoteCustomerInfo] = useState({
    customer_name: quote?.customer_name || quote?.name || '', // 優先用 customer_name，否則用團體名稱
    contact_person: quote?.contact_person || '',
    contact_phone: quote?.contact_phone || '',
    contact_address: quote?.contact_address || '',
    tour_code: quote?.tour_code || relatedTour?.code || '',
    handler_name: quote?.handler_name || 'William',
    issue_date: quote?.issue_date || getTodayString(),
    received_amount: quote?.received_amount || 0,
    expense_description:
      (quote as typeof quote & { expense_description?: string })?.expense_description || '',
  })

  // 砍次表狀態（由 effect 從 fullTour 或 quote 載入）
  const [tierPricings, setTierPricings] = useState<TierPricing[]>([])

  // 保險文字和費用不包含項目
  const [insuranceText, setInsuranceText] = useState('')
  const [excludedItems, setExcludedItems] = useState<string[]>([
    '個人護照及簽證費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ])

  // 檢查是否為 404 狀態（資料已載入但找不到對應的 quote）
  const [notFound, setNotFound] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  // 🔧 修復：追蹤是否曾經找到過報價單，避免 SWR 刷新時短暫顯示 404
  const hasFoundQuoteRef = useRef(false)

  useEffect(() => {
    // 當 quotes 已載入時設定 hasLoaded
    if (quotes.length > 0) {
      setHasLoaded(true)
    }
  }, [quotes.length])

  useEffect(() => {
    // 如果找到報價單，記錄下來
    if (quote) {
      hasFoundQuoteRef.current = true
      setNotFound(false)
      return
    }

    // 只有當資料已載入、找不到報價單、且從未找到過時，才設定 notFound
    // 這樣可以避免 SWR 刷新時短暫顯示 404
    if (hasLoaded && !quote && !hasFoundQuoteRef.current) {
      setNotFound(true)
    }
  }, [quote, hasLoaded])

  // 當 quote_id 改變時，重置 hasFoundQuoteRef
  useEffect(() => {
    hasFoundQuoteRef.current = false
    setNotFound(false)
  }, [quote_id])

  return {
    quote_id,
    quote,
    relatedTour,
    isSpecialTour,
    isReadOnly,
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    participantCounts,
    setParticipantCounts,
    groupSize,
    groupSizeForGuide,
    quoteName,
    setQuoteName,
    saveSuccess,
    setSaveSuccess,
    sellingPrices,
    setSellingPrices,
    // 快速報價單相關
    quickQuoteItems,
    setQuickQuoteItems,
    quickQuoteCustomerInfo,
    setQuickQuoteCustomerInfo,
    // 砍次表相關
    tierPricings,
    setTierPricings,
    // 保險和不包含項目
    insuranceText,
    setInsuranceText,
    excludedItems,
    setExcludedItems,
    // 核心表
    coreItems,
    refreshCoreItems,
    hasCoreChanges,
    // 完整 tour（含定價欄位）
    fullTour,
    // 404 狀態
    notFound,
    hasLoaded,
    updateQuote,
    addTour: createTour,
    router,
  }
}
