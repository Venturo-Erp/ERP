// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { createItinerary, updateItinerary, createTourLeader } from '@/data'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
// syncHotelsFromItineraryToQuote 已移除 — 報價單直接讀核心表
import { useSyncItineraryToCore } from '@/features/tours/hooks/useTourItineraryItems'
import { supabase } from '@/lib/supabase/client'
import { confirm } from '@/lib/ui/alert-dialog'
import type {
  FlightInfo,
  Feature,
  FocusCard,
  LeaderInfo,
  MeetingPoint,
  DailyItinerary,
  HotelInfo,
} from '@/components/editor/tour-form/types'
import type { ItineraryVersionRecord, PricingDetails, PriceTier, FAQ } from '@/stores/types'
import type { TierPricing } from '@/stores/types/quote.types'
import { ITINERARY_EDITOR_LABELS } from '../../constants/labels'
import { getWorkspaceTagline } from '@/lib/workspace-helpers'

// Local tour data interface
export interface LocalTourData {
  tagline: string
  title: string
  subtitle: string
  description: string
  departureDate: string
  tourCode: string
  coverImage?: string
  coverStyle?: 'original' | 'gemini' | 'nature' | 'luxury' | 'art' | 'dreamscape' | 'collage'
  flightStyle?:
    | 'original'
    | 'chinese'
    | 'japanese'
    | 'luxury'
    | 'art'
    | 'none'
    | 'dreamscape'
    | 'collage'
  itineraryStyle?: 'original' | 'luxury' | 'art' | 'dreamscape'
  price?: string | null
  priceNote?: string | null
  country: string
  city: string
  status: string
  outboundFlight: FlightInfo
  returnFlight: FlightInfo
  features: Feature[]
  focusCards: FocusCard[]
  leader: LeaderInfo
  meetingInfo?: MeetingPoint
  meetingPoints?: MeetingPoint[]
  hotels?: HotelInfo[]
  itinerarySubtitle: string
  dailyItinerary: DailyItinerary[]
  showFeatures?: boolean
  showLeaderMeeting?: boolean
  showHotels?: boolean
  showPricingDetails?: boolean
  pricingDetails?: PricingDetails
  priceTiers?: PriceTier[]
  showPriceTiers?: boolean
  faqs?: FAQ[]
  showFaqs?: boolean
  notices?: string[]
  showNotices?: boolean
  cancellationPolicy?: string[]
  showCancellationPolicy?: boolean
  version_records?: ItineraryVersionRecord[]
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useItineraryEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itineraryId = searchParams.get('itinerary_id')

  const [tourData, setTourData] = useState<LocalTourData>(getEmptyTourData())
  const [isDirty, setIsDirty] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(itineraryId)
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1)
  const [quoteTierPricings, setQuoteTierPricings] = useState<TierPricing[]>([])
  const [isHandedOff, setIsHandedOff] = useState(false) // 是否已交接（唯讀）
  const [hasLinkedQuote, setHasLinkedQuote] = useState(false) // 是否有關聯報價單（住宿鎖定）

  const { user } = useAuthStore()
  const { syncToCore } = useSyncItineraryToCore()
  const tourDataRef = useRef(tourData)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 保持 ref 同步
  useEffect(() => {
    tourDataRef.current = tourData
  }, [tourData])

  // 轉換資料格式（camelCase → snake_case）
  const convertDataForSave = useCallback(() => {
    const data = tourDataRef.current
    logger.log(
      '[ItineraryEditor] convertDataForSave - features:',
      data.features?.length || 0,
      data.features
    )
    return {
      tour_id: undefined,
      tagline: data.tagline,
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      departure_date: data.departureDate,
      tour_code: data.tourCode,
      cover_image: data.coverImage,
      cover_style: data.coverStyle || 'original',
      flight_style: data.flightStyle || 'original',
      itinerary_style: data.itineraryStyle || 'original',
      price: data.price || null,
      price_note: data.priceNote || null,
      country: data.country,
      city: data.city,
      status: (data.status || '開團') as '開團' | '待出發',
      outbound_flight: data.outboundFlight,
      return_flight: data.returnFlight,
      features: data.features,
      focus_cards: data.focusCards,
      leader: data.leader,
      meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
      show_features: data.showFeatures,
      show_leader_meeting: data.showLeaderMeeting,
      hotels: data.hotels || [],
      show_hotels: data.showHotels,
      show_pricing_details: data.showPricingDetails,
      pricing_details: data.pricingDetails,
      // price_tiers: 欄位已從 DB 移除，改用 tours.tier_pricings
      show_price_tiers: data.showPriceTiers || false,
      faqs: data.faqs || null,
      show_faqs: data.showFaqs || false,
      notices: data.notices || null,
      show_notices: data.showNotices || false,
      cancellation_policy: data.cancellationPolicy || null,
      show_cancellation_policy: data.showCancellationPolicy || false,
      itinerary_subtitle: data.itinerarySubtitle,
      daily_itinerary: data.dailyItinerary,
      version_records: data.version_records || [],
    }
  }, [])

  // 自動存檔函數
  const performAutoSave = useCallback(async () => {
    if (!isDirty) return

    setAutoSaveStatus('saving')
    try {
      const convertedData = convertDataForSave()
      logger.log('[ItineraryEditor] 準備存檔 - features:', convertedData.features?.length || 0)
      logger.log(
        '[ItineraryEditor] 準備存檔 - daily_itinerary:',
        convertedData.daily_itinerary?.length || 0
      )

      if (currentItineraryId) {
        logger.log('[ItineraryEditor] 更新行程:', currentItineraryId)
        await updateItinerary(currentItineraryId, convertedData)
        logger.log('[ItineraryEditor] 更新完成')

        // 報價單直接讀核心表，不需要同步飯店

        // 取得 tour_id（用於多處同步）
        const { data: itinerary_record } = await supabase
          .from('itineraries')
          .select('tour_id')
          .eq('id', currentItineraryId)
          .maybeSingle()

        const tourId = itinerary_record?.tour_id

        // 同步航班資訊到 tours 表
        if (tourId && (convertedData.outbound_flight || convertedData.return_flight)) {
          await supabase
            .from('tours')
            .update({
              outbound_flight: JSON.parse(JSON.stringify(convertedData.outbound_flight ?? null)),
              return_flight: JSON.parse(JSON.stringify(convertedData.return_flight ?? null)),
            })
            .eq('id', tourId)
          logger.log('[ItineraryEditor] 航班資訊已同步到 tours 表')
        }

        // 同步行程項目到核心表 (tour_itinerary_items)
        if (convertedData.daily_itinerary && convertedData.daily_itinerary.length > 0) {
          syncToCore({
            itinerary_id: currentItineraryId,
            tour_id: tourId ?? null,
            daily_itinerary: convertedData.daily_itinerary as DailyItinerary[],
          })
            .then(result => {
              if (!result.success) {
                logger.warn('Core table sync:', result.message)
              }
            })
            .catch(err => logger.error('Core table sync error:', err))
        }

        // 同步領隊到 tour_leaders 表
        const leader = convertedData.leader
        if (leader?.name && leader.name.trim()) {
          // 檢查是否已存在
          const { data: existingLeader } = await supabase
            .from('tour_leaders')
            .select('id, name')
            .eq('name', leader.name.trim())
            .maybeSingle()

          if (!existingLeader) {
            // 詢問是否要新增到領隊資料庫
            const shouldSave = await confirm(
              ITINERARY_EDITOR_LABELS.SAVE_LEADER_CONFIRM(leader.name),
              { title: ITINERARY_EDITOR_LABELS.SAVE_LEADER_TITLE, type: 'info' }
            )

            if (shouldSave) {
              await createTourLeader({
                name: leader.name.trim(),
                english_name: leader.englishName || null,
                photo: leader.photo || null,
                domestic_phone: leader.domesticPhone || null,
                overseas_phone: leader.overseasPhone || null,
                status: 'active',
              } as Parameters<typeof createTourLeader>[0])
              logger.log('[ItineraryEditor] 領隊已新增到資料庫:', leader.name)
            }
          }
        }
      } else {
        if (!convertedData.title) {
          setAutoSaveStatus('idle')
          return
        }
        const newItinerary = await createItinerary({
          ...convertedData,
          created_by: user?.id || undefined,
        } as Parameters<typeof createItinerary>[0])

        if (newItinerary?.id) {
          setCurrentItineraryId(newItinerary.id)
          window.history.replaceState(null, '', `/itinerary/new?itinerary_id=${newItinerary.id}`)
        }
      }

      setIsDirty(false)
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error) {
      logger.error('自動存檔失敗:', error)
      setAutoSaveStatus('error')
      toast.error(ITINERARY_EDITOR_LABELS.AUTO_SAVE_FAILED)
    }
  }, [isDirty, currentItineraryId, convertDataForSave, updateItinerary, createItinerary, user?.id])

  // 保持 performAutoSave 的最新引用
  const performAutoSaveRef = useRef(performAutoSave)
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave
  }, [performAutoSave])

  // 30 秒自動存檔 - 只依賴 isDirty，避免 tourData/performAutoSave 變化觸發無限迴圈
  useEffect(() => {
    if (isDirty) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSaveRef.current()
      }, 30000)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [isDirty])

  // 保持 isDirty 的最新引用（用於 beforeunload）
  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // 離開頁面前存檔 - 使用 ref 避免頻繁重新綁定事件
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        performAutoSaveRef.current()
        e.preventDefault()
        e.returnValue = ITINERARY_EDITOR_LABELS.UNSAVED_CHANGES
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // 版本切換處理
  const handleVersionChange = useCallback((index: number, versionData?: ItineraryVersionRecord) => {
    setCurrentVersionIndex(index)
    // 版本切換邏輯在主組件處理
  }, [])

  // 更新行程資料
  const updateTourData = useCallback((newData: Partial<LocalTourData>) => {
    setTourData(prev => ({ ...prev, ...newData }))
    setIsDirty(true)
  }, [])

  return {
    tourData,
    setTourData,
    updateTourData,
    isDirty,
    setIsDirty,
    autoSaveStatus,
    currentItineraryId,
    currentVersionIndex,
    setCurrentVersionIndex,
    handleVersionChange,
    performAutoSave,
    quoteTierPricings,
    setQuoteTierPricings,
    isHandedOff,
    setIsHandedOff,
    hasLinkedQuote,
    setHasLinkedQuote,
  }
}

function getEmptyTourData(): LocalTourData {
  return {
    tagline: getWorkspaceTagline(),
    title: '',
    subtitle: '',
    description: '',
    departureDate: '',
    tourCode: '',
    coverImage: '',
    country: '',
    city: '',
    status: ITINERARY_EDITOR_LABELS.STATUS_PROPOSAL,
    outboundFlight: {
      airline: '',
      flightNumber: '',
      departureAirport: 'TPE',
      departureTime: '',
      departureDate: '',
      arrivalAirport: '',
      arrivalTime: '',
      duration: '',
    },
    returnFlight: {
      airline: '',
      flightNumber: '',
      departureAirport: '',
      departureTime: '',
      departureDate: '',
      arrivalAirport: 'TPE',
      arrivalTime: '',
      duration: '',
    },
    features: [],
    focusCards: [],
    leader: {
      name: '',
      domesticPhone: '',
      overseasPhone: '',
    },
    meetingInfo: {
      time: '',
      location: '',
    },
    meetingPoints: [],
    itinerarySubtitle: '',
    dailyItinerary: [],
    showPricingDetails: false,
    pricingDetails: {
      show_pricing_details: false,
      insurance_amount: '500',
      included_items: [
        { text: ITINERARY_EDITOR_LABELS.TRANSPORT_COST, included: true },
        { text: ITINERARY_EDITOR_LABELS.ACCOMMODATION_COST, included: true },
        { text: ITINERARY_EDITOR_LABELS.MEAL_COST, included: true },
        { text: ITINERARY_EDITOR_LABELS.TICKET_COST, included: true },
        { text: ITINERARY_EDITOR_LABELS.GUIDE_SERVICE, included: true },
        { text: ITINERARY_EDITOR_LABELS.INSURANCE, included: true },
      ],
      excluded_items: [
        { text: ITINERARY_EDITOR_LABELS.PASSPORT_VISA, included: false },
        { text: ITINERARY_EDITOR_LABELS.OPTIONAL_TOUR, included: false },
        { text: ITINERARY_EDITOR_LABELS.PERSONAL_EXPENSE, included: false },
        { text: ITINERARY_EDITOR_LABELS.LUGGAGE_OVERWEIGHT, included: false },
        { text: ITINERARY_EDITOR_LABELS.SINGLE_ROOM, included: false },
      ],
      notes: [],
    },
  }
}
