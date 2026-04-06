/**
 * usePackageItinerary - 行程表對話框核心 Hook
 * 管理所有狀態和邏輯
 * 重構：使用 ItineraryEditorContext 取代 ProposalPackage + Proposal
 */

'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores'
import { useFlightSearch } from '@/hooks'
import { useItineraries, createItinerary } from '@/data'
import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/types'
import type { Itinerary, ItineraryVersionRecord } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import { stripHtml } from '@/lib/utils/string-utils'
// syncItineraryToQuote 已移除 — 報價單直接讀核心表
import { useSyncItineraryToCore } from '@/features/tours/hooks/useTourItineraryItems'
import { isFeatureAvailable } from '@/lib/feature-restrictions'
import { toast } from 'sonner'
import type {
  ItineraryEditorContext,
  ItineraryFormData,
  DailyScheduleItem,
  SimpleActivity,
  PreviewDayData,
  AccommodationStatus,
} from './types'
import {
  formatDailyItinerary,
  getPreviewDailyData as getPreviewData,
  generatePrintHtml,
} from './format-itinerary'
import { ITINERARY_EDITOR_LABELS } from './labels'

interface UsePackageItineraryOptions {
  isOpen: boolean
  context: ItineraryEditorContext
  onClose: () => void
  onItineraryCreated?: (itineraryId?: string) => void
}

export function usePackageItinerary({
  isOpen,
  context: ctx,
  onClose,
  onItineraryCreated,
}: UsePackageItineraryOptions) {
  const { items: itineraries, refresh } = useItineraries()
  const create = createItinerary
  const { user: currentUser } = useAuthStore()
  const { syncToCore } = useSyncItineraryToCore()

  // 判斷是否為國內旅遊（台灣）
  const isDomestic = useMemo(() => {
    const dest = ctx.destination?.toLowerCase() || ''
    return dest.includes('台灣') || dest.includes('taiwan') || dest === 'tw'
  }, [ctx.destination])

  // 基本狀態
  const [isCreating, setIsCreating] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ItineraryFormData>({
    title: '',
    description: '',
    outboundFlight: null,
    returnFlight: null,
  })

  // 航班搜尋輸入 state
  const [outboundFlightNumber, setOutboundFlightNumber] = useState('')
  const [outboundFlightDate, setOutboundFlightDate] = useState('')
  const [returnFlightNumber, setReturnFlightNumber] = useState('')
  const [returnFlightDate, setReturnFlightDate] = useState('')

  // 搜尋用的臨時航班 state
  const [searchOutboundFlight, setSearchOutboundFlight] = useState<FlightInfo | null>(null)
  const [searchReturnFlight, setSearchReturnFlight] = useState<FlightInfo | null>(null)

  // 當輸入改變時，更新搜尋用 state
  useEffect(() => {
    setSearchOutboundFlight(outboundFlightNumber ? { flightNumber: outboundFlightNumber } : null)
  }, [outboundFlightNumber])

  useEffect(() => {
    setSearchReturnFlight(returnFlightNumber ? { flightNumber: returnFlightNumber } : null)
  }, [returnFlightNumber])

  // 航班查詢（使用共用 hook）
  const flightSearch = useFlightSearch({
    outboundFlight: searchOutboundFlight,
    setOutboundFlight: flight => {
      setFormData(prev => ({ ...prev, outboundFlight: flight }))
      setOutboundFlightNumber('')
    },
    returnFlight: searchReturnFlight,
    setReturnFlight: flight => {
      setFormData(prev => ({ ...prev, returnFlight: flight }))
      setReturnFlightNumber('')
    },
    departureDate: outboundFlightDate || ctx?.start_date || '',
    days: String(ctx?.days || ''),
  })

  // 版本控制狀態
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(-1)
  const [directLoadedItinerary, setDirectLoadedItinerary] = useState<Itinerary | null>(null)

  // 檢視模式：edit = 編輯模式, preview = 簡易行程表預覽
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  // AI 排行程狀態
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiArrivalTime, setAiArrivalTime] = useState('11:00')
  const [aiDepartureTime, setAiDepartureTime] = useState('14:00')
  const [aiTheme, setAiTheme] = useState<string>('classic')
  const showAiGenerate = isFeatureAvailable('ai_suggest', currentUser?.workspace_code)

  // 追蹤 refs
  const hasInitializedDailyScheduleRef = useRef(false)
  const loadingRef = useRef(false)
  const prevIsOpenRef = useRef(false)

  // 每日行程狀態
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([])

  // 時間軸模式
  const [isTimelineMode, setIsTimelineMode] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  // 計算天數
  const calculateDays = useCallback(() => {
    if (!ctx.start_date || !ctx.end_date) return ctx.days || 5
    const start = new Date(ctx.start_date)
    const end = new Date(ctx.end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, Math.min(diffDays, 30))
  }, [ctx.start_date, ctx.end_date, ctx.days])

  // 從行程表載入每日資料
  const loadDailyDataFromItinerary = useCallback(
    (itinerary: Itinerary, versionIndex: number, days: number) => {
      const versionRecordsData = (itinerary.version_records || []) as ItineraryVersionRecord[]

      type DailyData = Array<{
        title?: string
        meals?: { breakfast?: string; lunch?: string; dinner?: string }
        accommodation?: string
        activities?: Array<{ id?: string; title?: string; startTime?: string; endTime?: string }>
      }>

      let dailyData: DailyData | null = null

      if (versionIndex === -1) {
        dailyData = (itinerary.daily_itinerary || []) as unknown as DailyData
      } else if (versionRecordsData[versionIndex]) {
        dailyData = (versionRecordsData[versionIndex].daily_itinerary || []) as unknown as DailyData
      }

      if (dailyData && dailyData.length > 0) {
        const loadedSchedule = dailyData.map((day, idx) => {
          const isHotelBreakfast = day.meals?.breakfast === '飯店早餐'
          const isLunchSelf = day.meals?.lunch === '敬請自理' || day.meals?.lunch === '自理'
          const isDinnerSelf = day.meals?.dinner === '敬請自理' || day.meals?.dinner === '自理'
          let sameAsPrevious = false
          if (idx > 0) {
            const prevAccommodation = dailyData![idx - 1]?.accommodation
            sameAsPrevious =
              Boolean(day.accommodation?.includes('續住')) ||
              Boolean(prevAccommodation && day.accommodation === prevAccommodation)
          }
          const activities = (day.activities || []).map((act, actIdx) => ({
            id: act.id || `activity-${idx}-${actIdx}`,
            title: act.title || '',
            startTime: act.startTime || '',
            endTime: act.endTime || '',
          }))
          return {
            day: idx + 1,
            route: day.title || '',
            meals: {
              breakfast: isHotelBreakfast ? '' : day.meals?.breakfast || '',
              lunch: isLunchSelf ? '' : day.meals?.lunch || '',
              dinner: isDinnerSelf ? '' : day.meals?.dinner || '',
            },
            accommodation: sameAsPrevious ? '' : day.accommodation || '',
            sameAsPrevious,
            hotelBreakfast: isHotelBreakfast,
            lunchSelf: isLunchSelf,
            dinnerSelf: isDinnerSelf,
            activities: activities.length > 0 ? activities : undefined,
          }
        })
        setDailySchedule(loadedSchedule)
        if (loadedSchedule.some(d => d.activities && d.activities.length > 0)) {
          setIsTimelineMode(true)
        }
      } else {
        setDailySchedule(
          Array.from({ length: days }, (_, i) => ({
            day: i + 1,
            route: '',
            meals: { breakfast: '', lunch: '', dinner: '' },
            accommodation: '',
            sameAsPrevious: false,
            hotelBreakfast: false,
            lunchSelf: false,
            dinnerSelf: false,
            activities: undefined,
          }))
        )
      }

      setFormData(prev => ({
        ...prev,
        title: stripHtml(itinerary.title) || prev.title,
        outboundFlight:
          itinerary.flight_info?.outbound ||
          (itinerary as { outbound_flight?: FlightInfo }).outbound_flight ||
          null,
        returnFlight:
          itinerary.flight_info?.return ||
          (itinerary as { return_flight?: FlightInfo }).return_flight ||
          null,
      }))
    },
    []
  )

  // 載入行程表資料
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (justOpened && !loadingRef.current) {
      loadingRef.current = true
      setIsDataLoading(true)
      setCreateError(null)
      setSelectedVersionIndex(-1)
      setDirectLoadedItinerary(null)
      setViewMode('edit')
      hasInitializedDailyScheduleRef.current = false
      setFormData({
        title: ctx.title || ctx.version_name || '',
        description: '',
        outboundFlight: null,
        returnFlight: null,
      })
      setOutboundFlightNumber('')
      setOutboundFlightDate(ctx.start_date || '')
      setReturnFlightNumber('')
      setReturnFlightDate(ctx.end_date || '')

      const loadData = async () => {
        if (ctx.itinerary_id) {
          logger.log('[ItineraryEditor] 直接從資料庫載入行程表:', ctx.itinerary_id)
          const { data, error } = await supabase
            .from('itineraries')
            .select(
              'id, tour_id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary, version_records, workspace_id, created_at, updated_at'
            )
            .eq('id', ctx.itinerary_id)
            .single()

          if (!error && data) {
            logger.log(
              '[ItineraryEditor] 載入成功，版本數:',
              (data.version_records as unknown[])?.length || 0
            )
            setDirectLoadedItinerary(data as unknown as Itinerary)
          } else {
            logger.error('[ItineraryEditor] 載入失敗:', error)
          }
        }
        await refresh()
        setIsDataLoading(false)
        loadingRef.current = false
      }

      loadData().catch(err => logger.error('[loadData]', err))
    } else if (!isOpen) {
      loadingRef.current = false
    }
  }, [isOpen, ctx.itinerary_id, ctx.start_date, ctx.end_date, ctx.version_name, ctx.title, refresh])

  // 已關聯的行程表（透過 itinerary_id 查找）
  const linkedItineraries = useMemo(() => {
    const filtered = itineraries.filter(i => {
      if (i._deleted) return false
      return ctx.itinerary_id && i.id === ctx.itinerary_id
    })
    return filtered
  }, [itineraries, ctx.itinerary_id])

  // 當資料載入完成後初始化每日行程
  useEffect(() => {
    if (!isDataLoading && isOpen && !hasInitializedDailyScheduleRef.current) {
      hasInitializedDailyScheduleRef.current = true
      const days = calculateDays()

      const itinerary =
        directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)

      if (itinerary) {
        loadDailyDataFromItinerary(itinerary, -1, days)
      } else {
        setDailySchedule(
          Array.from({ length: days }, (_, i) => ({
            day: i + 1,
            route: '',
            meals: { breakfast: '', lunch: '', dinner: '' },
            accommodation: '',
            sameAsPrevious: false,
            hotelBreakfast: false,
            lunchSelf: false,
            dinnerSelf: false,
            activities: undefined,
          }))
        )
      }
    }
  }, [
    isDataLoading,
    isOpen,
    directLoadedItinerary,
    linkedItineraries,
    ctx.itinerary_id,
    calculateDays,
    loadDailyDataFromItinerary,
  ])

  // 判斷是否為編輯模式
  const existingItinerary = useMemo(() => {
    return directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)
  }, [directLoadedItinerary, linkedItineraries, ctx.itinerary_id])

  const isEditMode = Boolean(existingItinerary)

  // 版本記錄
  const versionRecords = useMemo(() => {
    return (existingItinerary?.version_records || []) as ItineraryVersionRecord[]
  }, [existingItinerary])

  // 處理版本切換
  const handleVersionChange = useCallback(
    (index: number) => {
      setSelectedVersionIndex(index)
      const itinerary =
        directLoadedItinerary || linkedItineraries.find(i => i.id === ctx.itinerary_id)
      if (itinerary) {
        loadDailyDataFromItinerary(itinerary, index, calculateDays())
      }
    },
    [
      directLoadedItinerary,
      linkedItineraries,
      ctx.itinerary_id,
      calculateDays,
      loadDailyDataFromItinerary,
    ]
  )

  // 更新每日行程
  const updateDaySchedule = useCallback((index: number, field: string, value: string | boolean) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      if (field === 'route' || field === 'accommodation') {
        newSchedule[index] = { ...newSchedule[index], [field]: value }
      } else if (
        field === 'sameAsPrevious' ||
        field === 'hotelBreakfast' ||
        field === 'lunchSelf' ||
        field === 'dinnerSelf'
      ) {
        newSchedule[index] = { ...newSchedule[index], [field]: value as boolean }
      } else if (field.startsWith('meals.')) {
        const mealType = field.split('.')[1] as 'breakfast' | 'lunch' | 'dinner'
        newSchedule[index] = {
          ...newSchedule[index],
          meals: { ...newSchedule[index].meals, [mealType]: value as string },
        }
      }
      return newSchedule
    })
  }, [])

  // 時間軸活動操作
  const addActivity = useCallback((dayIndex: number) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const activities = newSchedule[dayIndex].activities || []
      const newActivity: SimpleActivity = {
        id: `activity-${dayIndex}-${Date.now()}`,
        title: '',
        startTime: '',
        endTime: '',
      }
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        activities: [...activities, newActivity],
      }
      return newSchedule
    })
  }, [])

  const removeActivity = useCallback((dayIndex: number, activityIndex: number) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const activities = [...(newSchedule[dayIndex].activities || [])]
      activities.splice(activityIndex, 1)
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        activities: activities.length > 0 ? activities : undefined,
      }
      return newSchedule
    })
  }, [])

  // 從景點庫批次新增活動
  const addActivitiesFromAttractions = useCallback(
    (dayIndex: number, attractions: { name: string; id?: string }[]) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const existing = newSchedule[dayIndex].activities || []
        const newActivities: SimpleActivity[] = attractions.map((attr, i) => ({
          id: `activity-${dayIndex}-${Date.now()}-${i}`,
          title: attr.name,
          startTime: '',
          endTime: '',
          attractionId: attr.id,
        }))
        newSchedule[dayIndex] = {
          ...newSchedule[dayIndex],
          activities: [...existing, ...newActivities],
        }
        return newSchedule
      })
    },
    []
  )

  const updateActivity = useCallback(
    (dayIndex: number, activityIndex: number, field: keyof SimpleActivity, value: string) => {
      setDailySchedule(prev => {
        const newSchedule = [...prev]
        const activities = [...(newSchedule[dayIndex].activities || [])]
        activities[activityIndex] = { ...activities[activityIndex], [field]: value }
        newSchedule[dayIndex] = {
          ...newSchedule[dayIndex],
          activities,
        }
        return newSchedule
      })
    },
    []
  )

  // 取得前一天住宿
  const getPreviousAccommodation = useCallback(
    (index: number): string => {
      if (index === 0) return ''
      for (let i = index - 1; i >= 0; i--) {
        if (!dailySchedule[i].sameAsPrevious && dailySchedule[i].accommodation) {
          return dailySchedule[i].accommodation
        }
      }
      return ''
    },
    [dailySchedule]
  )

  // 住宿狀態
  const getAccommodationStatus = useCallback((): AccommodationStatus => {
    const requiredDays = dailySchedule.length - 1
    let filledCount = 0
    const accommodations: string[] = []

    for (let i = 0; i < requiredDays; i++) {
      const day = dailySchedule[i]
      if (day.accommodation || day.sameAsPrevious) {
        filledCount++
        if (day.sameAsPrevious) {
          accommodations.push(accommodations[accommodations.length - 1] || '')
        } else {
          accommodations.push(day.accommodation)
        }
      } else {
        accommodations.push('')
      }
    }

    return {
      isComplete: filledCount >= requiredDays,
      filledCount,
      requiredDays,
      accommodations,
    }
  }, [dailySchedule])

  // 當前版本名稱
  const getCurrentVersionName = useCallback(() => {
    if (selectedVersionIndex === -1) {
      const firstVersion = versionRecords[0]
      return firstVersion?.note || stripHtml(existingItinerary?.title) || '主版本'
    }
    const record = versionRecords[selectedVersionIndex]
    return (
      record?.note ||
      ITINERARY_EDITOR_LABELS.brochurePreview.versionLabel(
        record?.version || selectedVersionIndex + 1
      )
    )
  }, [selectedVersionIndex, versionRecords, existingItinerary])

  // 產生預覽資料
  const getPreviewDailyData = useCallback((): PreviewDayData[] => {
    return getPreviewData(dailySchedule, ctx.start_date || null)
  }, [dailySchedule, ctx.start_date])

  // 列印預覽
  const handlePrintPreview = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dailyData = getPreviewDailyData()
    const printContent = generatePrintHtml({
      title: formData.title,
      companyName: currentUser?.workspace_code || '旅行社',
      destination: ctx.destination || ctx.country_id || '',
      startDate: ctx.start_date || null,
      isDomestic,
      outboundFlight: formData.outboundFlight,
      returnFlight: formData.returnFlight,
      dailyData,
    })

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }, [
    getPreviewDailyData,
    formData.title,
    formData.outboundFlight,
    formData.returnFlight,
    ctx.start_date,
    ctx.destination,
    ctx.country_id,
    currentUser?.workspace_code,
    isDomestic,
  ])

  // 打開 AI 對話框
  const openAiDialog = useCallback(() => {
    if (formData.outboundFlight?.arrivalTime) {
      setAiArrivalTime(formData.outboundFlight.arrivalTime)
    }
    if (formData.returnFlight?.departureTime) {
      setAiDepartureTime(formData.returnFlight.departureTime)
    }
    setAiDialogOpen(true)
  }, [formData.outboundFlight?.arrivalTime, formData.returnFlight?.departureTime])

  // AI 生成
  const handleAiGenerate = useCallback(async () => {
    const destinationName = ctx.destination || ''
    const airportCode = ctx.airport_code || ''
    const countryId = ctx.country_id || ''

    if (!destinationName && !airportCode && !countryId) {
      toast.error('請先設定目的地')
      return
    }
    if (!ctx.start_date) {
      toast.error('請先設定出發日期')
      return
    }

    const status = getAccommodationStatus()

    setAiGenerating(true)
    try {
      const numDays = dailySchedule.length

      logger.log('[AI Generate] Request:', {
        destination: destinationName,
        airportCode,
        countryId,
        numDays,
        departureDate: ctx.start_date,
        theme: aiTheme,
      })

      const response = await fetch('/api/itineraries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destinationName,
          cityId: airportCode,
          countryId: countryId,
          numDays,
          departureDate: ctx.start_date,
          arrivalTime: aiArrivalTime,
          departureTime: aiDepartureTime,
          theme: aiTheme,
          accommodations: status.isComplete ? status.accommodations : undefined,
        }),
      })

      const result = await response.json()

      logger.log('[AI Generate] API Response:', result)

      if (!response.ok) {
        throw new Error(result.error || '生成失敗')
      }

      if (result.success && result.data?.dailyItinerary) {
        interface GeneratedDay {
          title: string
          meals: { breakfast?: string; lunch?: string; dinner?: string }
          activities?: Array<{ id?: string; title: string; startTime?: string; endTime?: string }>
        }
        const newSchedule = dailySchedule.map((existingDay, index) => {
          const aiDay = result.data.dailyItinerary[index] as GeneratedDay | undefined
          if (!aiDay) return existingDay

          return {
            ...existingDay,
            route: aiDay.title || existingDay.route,
            meals: {
              breakfast: aiDay.meals?.breakfast || existingDay.meals.breakfast,
              lunch: aiDay.meals?.lunch || existingDay.meals.lunch,
              dinner: aiDay.meals?.dinner || existingDay.meals.dinner,
            },
            hotelBreakfast: aiDay.meals?.breakfast === '飯店早餐',
            activities:
              aiDay.activities?.map((act, actIdx) => ({
                id: act.id || `ai-${index}-${actIdx}-${Date.now()}`,
                title: act.title,
                startTime: act.startTime || '',
                endTime: act.endTime || '',
              })) || existingDay.activities,
          }
        })

        setDailySchedule(newSchedule)
        toast.success(`成功生成 ${newSchedule.length} 天行程！`)
        setAiDialogOpen(false)
      } else {
        throw new Error('生成失敗')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失敗，請稍後再試')
    } finally {
      setAiGenerating(false)
    }
  }, [
    ctx.destination,
    ctx.start_date,
    ctx.airport_code,
    ctx.country_id,
    aiArrivalTime,
    aiDepartureTime,
    aiTheme,
    dailySchedule,
    getAccommodationStatus,
  ])

  // 提交表單
  const handleSubmit = useCallback(async () => {
    try {
      setIsCreating(true)
      setCreateError(null)

      const formattedDailyItinerary = formatDailyItinerary({
        dailySchedule,
        startDate: ctx.start_date || null,
        getPreviousAccommodation,
      })

      const authorName = currentUser?.display_name || currentUser?.chinese_name || ''

      if (isEditMode && existingItinerary) {
        logger.log('更新行程表資料:', { id: existingItinerary.id, title: formData.title })

        const { error: updateError } = await supabase
          .from('itineraries')
          .update({
            title: formData.title,
            daily_itinerary: formattedDailyItinerary,
            country: ctx.country_id || '',
            city: ctx.airport_code || '',
            outbound_flight: formData.outboundFlight
              ? {
                  airline: formData.outboundFlight.airline,
                  flightNumber: formData.outboundFlight.flightNumber,
                  departureAirport: formData.outboundFlight.departureAirport,
                  departureTime: formData.outboundFlight.departureTime,
                  departureDate: '',
                  arrivalAirport: formData.outboundFlight.arrivalAirport,
                  arrivalTime: formData.outboundFlight.arrivalTime,
                  duration: '',
                }
              : null,
            return_flight: formData.returnFlight
              ? {
                  airline: formData.returnFlight.airline,
                  flightNumber: formData.returnFlight.flightNumber,
                  departureAirport: formData.returnFlight.departureAirport,
                  departureTime: formData.returnFlight.departureTime,
                  departureDate: '',
                  arrivalAirport: formData.returnFlight.arrivalAirport,
                  arrivalTime: formData.returnFlight.arrivalTime,
                  duration: '',
                }
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingItinerary.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        logger.log('行程表更新成功')
        // syncItineraryToQuote 已移除 — 報價單直接讀核心表

        // 同步到核心表
        syncToCore({
          itinerary_id: existingItinerary.id,
          tour_id: null,
          daily_itinerary: formattedDailyItinerary,
        }).catch(err => logger.warn('核心表同步失敗（不影響儲存）:', err))

        const { data: refreshedData } = await supabase
          .from('itineraries')
          .select(
            'id, tour_id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary, version_records, workspace_id, created_at, updated_at'
          )
          .eq('id', existingItinerary.id)
          .single()
        if (refreshedData) {
          setDirectLoadedItinerary(refreshedData as unknown as Itinerary)
        }

        toast.success('行程表更新成功')
        onItineraryCreated?.(existingItinerary.id)
      } else {
        const workspaceId = currentUser?.workspace_id
        if (!workspaceId) {
          throw new Error('無法取得 workspace_id，請重新登入')
        }

        const createData = {
          title: formData.title,
          tour_id: null,
          tour_code: '',
          status: '開團',
          author_name: authorName,
          departure_date: ctx.start_date || '',
          country: ctx.country_id || '',
          city: ctx.airport_code || '',
          daily_itinerary: formattedDailyItinerary,
          description: formData.description,
          cover_image: '',
          features: [],
          focus_cards: [],
          workspace_id: workspaceId,
          outbound_flight: formData.outboundFlight
            ? {
                airline: formData.outboundFlight.airline,
                flightNumber: formData.outboundFlight.flightNumber,
                departureAirport: formData.outboundFlight.departureAirport,
                departureTime: formData.outboundFlight.departureTime,
                departureDate: '',
                arrivalAirport: formData.outboundFlight.arrivalAirport,
                arrivalTime: formData.outboundFlight.arrivalTime,
                duration: '',
              }
            : null,
          return_flight: formData.returnFlight
            ? {
                airline: formData.returnFlight.airline,
                flightNumber: formData.returnFlight.flightNumber,
                departureAirport: formData.returnFlight.departureAirport,
                departureTime: formData.returnFlight.departureTime,
                departureDate: '',
                arrivalAirport: formData.returnFlight.arrivalAirport,
                arrivalTime: formData.returnFlight.arrivalTime,
                duration: '',
              }
            : null,
        }

        logger.log('建立行程表資料:', JSON.stringify(createData, null, 2))

        const newItinerary = await create(
          createData as unknown as Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>
        )

        if (newItinerary?.id) {
          logger.log('行程表建立成功:', newItinerary.id)

          // 同步到核心表
          syncToCore({
            itinerary_id: newItinerary.id,
            tour_id: null,
            daily_itinerary: formattedDailyItinerary,
          }).catch(err => logger.warn('核心表同步失敗（不影響儲存）:', err))

          await alert('行程表建立成功', 'success')
          onItineraryCreated?.(newItinerary.id)
          onClose()
        } else {
          setCreateError('建立失敗：未取得行程表 ID')
        }
      }
    } catch (error) {
      let errorMessage = '未知錯誤'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        const supabaseError = error as { message?: string; code?: string; details?: string }
        errorMessage =
          supabaseError.message ||
          supabaseError.code ||
          supabaseError.details ||
          JSON.stringify(error)
      }
      logger.error('建立行程表失敗:', JSON.stringify(error, null, 2))
      setCreateError(errorMessage)
      void alert(`建立失敗: ${errorMessage}`, 'error')
    } finally {
      setIsCreating(false)
    }
  }, [
    dailySchedule,
    ctx,
    formData,
    isEditMode,
    existingItinerary,
    currentUser,
    getPreviousAccommodation,
    onItineraryCreated,
    onClose,
    create,
    syncToCore,
  ])

  // 另存新版本
  const handleSaveAsNewVersion = useCallback(async () => {
    if (!existingItinerary?.id) {
      await alert('請先儲存行程表才能另存新版本', 'warning')
      return
    }

    setIsCreating(true)
    try {
      const formattedDailyItinerary = formatDailyItinerary({
        dailySchedule,
        startDate: ctx.start_date || null,
        getPreviousAccommodation,
        includeSameAccommodation: true,
      })

      const newVersion: ItineraryVersionRecord = {
        id: crypto.randomUUID(),
        version: versionRecords.length + 1,
        note: ITINERARY_EDITOR_LABELS.brochurePreview.versionLabel(versionRecords.length + 1),
        daily_itinerary: formattedDailyItinerary,
        features: existingItinerary.features || [],
        focus_cards: existingItinerary.focus_cards || [],
        leader: existingItinerary.leader,
        meeting_info: existingItinerary.meeting_info,
        hotels: existingItinerary.hotels,
        created_at: new Date().toISOString(),
      }

      const updatedRecords = [...versionRecords, newVersion]

      const { error } = await supabase
        .from('itineraries')
        .update({
          version_records: updatedRecords as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItinerary.id)

      if (error) throw error

      setDirectLoadedItinerary(prev => (prev ? { ...prev, version_records: updatedRecords } : null))
      setSelectedVersionIndex(updatedRecords.length - 1)

      toast.success('已另存為新版本')
      onItineraryCreated?.(existingItinerary.id)
    } catch (error) {
      logger.error('另存新版本失敗:', error)
      toast.error('另存新版本失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsCreating(false)
    }
  }, [
    existingItinerary,
    dailySchedule,
    versionRecords,
    ctx.start_date,
    getPreviousAccommodation,
    onItineraryCreated,
  ])

  return {
    // 狀態
    isDataLoading,
    isCreating,
    createError,
    formData,
    setFormData,
    viewMode,
    setViewMode,
    isDomestic,
    isEditMode,
    existingItinerary,
    currentUser,

    // 航班相關
    outboundFlightNumber,
    setOutboundFlightNumber,
    outboundFlightDate,
    setOutboundFlightDate,
    returnFlightNumber,
    setReturnFlightNumber,
    returnFlightDate,
    setReturnFlightDate,
    flightSearch,

    // 版本控制
    selectedVersionIndex,
    versionRecords,
    handleVersionChange,
    getCurrentVersionName,

    // 每日行程
    dailySchedule,
    updateDaySchedule,
    calculateDays,
    getPreviousAccommodation,

    // 時間軸
    isTimelineMode,
    setIsTimelineMode,
    selectedDayIndex,
    setSelectedDayIndex,
    addActivity,
    addActivitiesFromAttractions,
    removeActivity,
    updateActivity,

    // AI 相關
    showAiGenerate,
    aiDialogOpen,
    setAiDialogOpen,
    aiGenerating,
    aiArrivalTime,
    setAiArrivalTime,
    aiDepartureTime,
    setAiDepartureTime,
    aiTheme,
    setAiTheme,
    openAiDialog,
    handleAiGenerate,
    getAccommodationStatus,

    // 預覽
    getPreviewDailyData,
    handlePrintPreview,

    // 提交
    handleSubmit,
    handleSaveAsNewVersion,
  }
}
