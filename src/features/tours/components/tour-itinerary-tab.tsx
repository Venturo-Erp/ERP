'use client'

/**
 * TourItineraryTab - 旅遊團簡易行程表分頁
 *
 * 上下分欄設計：
 * - 上半部：團層級資料（標題、天數、航班、住宿按鈕）
 * - 下半部：每日分頁 tab（Day 1 | Day 2 | ...）
 */

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import {
  Loader2,
  FileText,
  Save,
  Eye,
  Edit2,
  Printer,
  Plane,
  Search,
  Trash2,
  Plus,
  MapPin,
  Map,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores'
import { useItineraries, createItinerary, updateItinerary } from '@/data'
import { updateTour } from '@/data/entities/tours'
import { useFlightSearch } from '@/hooks'
// syncItineraryToQuote 已移除 — 報價單直接讀核心表，不需要同步
import { useSyncItineraryToCore, useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import type { DailyItinerary } from '@/components/editor/tour-form/types'
import type { Tour } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import { COMP_TOURS_LABELS, TOUR_ITINERARY_TAB_LABELS } from '../constants/labels'
import { getPreviewDailyData as computePreviewData } from '@/features/tours/components/itinerary-editor/format-itinerary'
import { ResourcePanel } from '@/components/resource-panel/ResourcePanel'
import { type MentionInputHandle } from './mention-input'
import { DayRow, type DailyScheduleItem } from './itinerary/DayRow'
import { useItineraryDrag } from '../hooks/useItineraryDrag'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface TourItineraryTabProps {
  tour: Tour
}

// ============================================================
// Main Component
// ============================================================
export function TourItineraryTab({ tour }: TourItineraryTabProps) {
  const { user: currentUser } = useAuthStore()
  const { items: itineraries, refresh } = useItineraries()
  const { syncToCore } = useSyncItineraryToCore()
  const { items: coreItems, refresh: refreshCoreItems } = useTourItineraryItemsByTour(tour.id)

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const mentionInputRefs = useRef<Record<number, MentionInputHandle | null>>({})

  // Form data
  const [title, setTitle] = useState('')
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([])
  const [numDays, setNumDays] = useState(5)

  // Flight info - 支援多航段（轉機）
  const defaultEmptyFlight: FlightInfo = {
    airline: '',
    flightNumber: '',
    departureAirport: '',
    departureTime: '',
    arrivalAirport: '',
    arrivalTime: '',
  }
  const [outboundFlights, setOutboundFlights] = useState<FlightInfo[]>([{ ...defaultEmptyFlight }])
  const [returnFlights, setReturnFlights] = useState<FlightInfo[]>([{ ...defaultEmptyFlight }])
  const [outboundFlightNumber, setOutboundFlightNumber] = useState('')
  const [outboundFlightDate, setOutboundFlightDate] = useState('')
  const [returnFlightNumber, setReturnFlightNumber] = useState('')
  const [returnFlightDate, setReturnFlightDate] = useState('')

  // Search flight state
  const [searchOutboundFlight, setSearchOutboundFlight] = useState<FlightInfo | null>(null)
  const [searchReturnFlight, setSearchReturnFlight] = useState<FlightInfo | null>(null)

  useEffect(() => {
    setSearchOutboundFlight(
      outboundFlightNumber ? ({ flightNumber: outboundFlightNumber } as FlightInfo) : null
    )
  }, [outboundFlightNumber])

  useEffect(() => {
    setSearchReturnFlight(
      returnFlightNumber ? ({ flightNumber: returnFlightNumber } as FlightInfo) : null
    )
  }, [returnFlightNumber])

  // Domestic check
  const isDomestic = useMemo(() => {
    const dest = (tour.location || '').toLowerCase()
    return (
      dest.includes(TOUR_ITINERARY_TAB_LABELS.TAIWAN) || dest.includes('taiwan') || dest === 'tw'
    )
  }, [tour.location])

  // Calculate days: 日期差 > days_count > 預設 5
  const calculateDays = useCallback(() => {
    if (tour.departure_date && tour.return_date) {
      const start = new Date(tour.departure_date)
      const end = new Date(tour.return_date)
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }
    if (tour.days_count && tour.days_count > 0) {
      return tour.days_count
    }
    return 5
  }, [tour.departure_date, tour.return_date, tour.days_count])

  // Flight search hook
  const {
    loadingOutboundFlight: searchingOutbound,
    loadingReturnFlight: searchingReturn,
    outboundSegments,
    returnSegments,
    handleSearchOutboundFlight,
    handleSearchReturnFlight,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  } = useFlightSearch({
    outboundFlight: searchOutboundFlight,
    setOutboundFlight: flight => {
      if (flight) {
        setOutboundFlights(prev => {
          const emptyIdx = prev.findIndex(f => !f.flightNumber && !f.airline)
          if (emptyIdx !== -1) {
            return prev.map((f, i) => (i === emptyIdx ? flight : f))
          }
          return [...prev, flight]
        })
      }
      setOutboundFlightNumber('')
    },
    returnFlight: searchReturnFlight,
    setReturnFlight: flight => {
      if (flight) {
        setReturnFlights(prev => {
          const emptyIdx = prev.findIndex(f => !f.flightNumber && !f.airline)
          if (emptyIdx !== -1) {
            return prev.map((f, i) => (i === emptyIdx ? flight : f))
          }
          return [...prev, flight]
        })
      }
      setReturnFlightNumber('')
    },
    departureDate: outboundFlightDate || tour.departure_date || '',
    days: String(numDays),
  })

  // Initialize daily schedule
  const initializeDailySchedule = useCallback((days: number) => {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      route: '',
      meals: { breakfast: '', lunch: '', dinner: '' },
      accommodation: '',
      hotelBreakfast: false,
      lunchSelf: false,
      dinnerSelf: false,
      sameAsPrevious: false,
    }))
  }, [])

  // Adjust daily schedule when numDays changes
  useEffect(() => {
    setDailySchedule(prev => {
      if (prev.length === numDays) return prev
      if (numDays > prev.length) {
        const extra = Array.from({ length: numDays - prev.length }, (_, i) => ({
          day: prev.length + i + 1,
          route: '',
          meals: { breakfast: '', lunch: '', dinner: '' },
          accommodation: '',
          hotelBreakfast: false,
          lunchSelf: false,
          dinnerSelf: false,
          sameAsPrevious: false,
        }))
        return [...prev, ...extra]
      }
      return prev.slice(0, numDays).map((d, i) => ({ ...d, day: i + 1 }))
    })
  }, [numDays])

  // Load itinerary
  useEffect(() => {
    const loadItinerary = async () => {
      setLoading(true)
      try {
        const itinerary = itineraries.find(i => i.tour_id === tour.id)

        if (itinerary) {
          setCurrentItineraryId(itinerary.id)
          setTitle(itinerary.title || tour.name || '')

          // 載入航班資料（兼容舊格式：單一物件 / 新格式：陣列）
          const emptyFlight: FlightInfo = {
            airline: '',
            flightNumber: '',
            departureAirport: '',
            departureTime: '',
            arrivalAirport: '',
            arrivalTime: '',
          }
          if (itinerary.outbound_flight) {
            const outbound = itinerary.outbound_flight
            if (Array.isArray(outbound)) {
              setOutboundFlights(outbound as FlightInfo[])
            } else {
              setOutboundFlights([outbound as FlightInfo])
            }
          } else {
            setOutboundFlights([{ ...emptyFlight }])
          }
          if (itinerary.return_flight) {
            const returnFlt = itinerary.return_flight
            if (Array.isArray(returnFlt)) {
              setReturnFlights(returnFlt as FlightInfo[])
            } else {
              setReturnFlights([returnFlt as FlightInfo])
            }
          } else {
            setReturnFlights([{ ...emptyFlight }])
          }

          if (itinerary.daily_itinerary && Array.isArray(itinerary.daily_itinerary)) {
            // 從核心表建立 day→meals/accommodation/activities 對應
            const coreMealsByDay: Record<number, { breakfast: string; lunch: string; dinner: string }> = {}
            const coreAccomByDay: Record<number, string> = {}
            const coreAccomIdByDay: Record<number, string> = {}
            const coreMealIdsByDay: Record<number, { breakfast?: string; lunch?: string; dinner?: string }> = {}
            const coreActivitiesByDay: Record<number, Array<{ title: string; attraction_id?: string; verified?: boolean }>> = {}
            for (const item of coreItems) {
              const dn = item.day_number
              if (!dn) continue
              if (item.category === 'meals' && item.sub_category) {
                if (!coreMealsByDay[dn]) coreMealsByDay[dn] = { breakfast: '', lunch: '', dinner: '' }
                if (!coreMealIdsByDay[dn]) coreMealIdsByDay[dn] = {}
                const key = item.sub_category === 'breakfast' ? 'breakfast' : item.sub_category === 'lunch' ? 'lunch' : 'dinner'
                coreMealsByDay[dn][key] = item.title || ''
                if (item.resource_id) {
                  coreMealIdsByDay[dn][key] = item.resource_id
                }
              } else if (item.category === 'accommodation') {
                coreAccomByDay[dn] = item.title || ''
                if (item.resource_id) {
                  coreAccomIdByDay[dn] = item.resource_id
                }
              } else if (item.category === 'activities') {
                if (!coreActivitiesByDay[dn]) coreActivitiesByDay[dn] = []
                coreActivitiesByDay[dn].push({ title: item.title || '', attraction_id: item.resource_id || undefined })
              }
            }

            // 查詢所有景點的驗證狀態
            const allAttractionIds = Object.values(coreActivitiesByDay)
              .flat()
              .filter(a => a.attraction_id)
              .map(a => a.attraction_id!)
            const verifiedMap: Record<string, boolean> = {}
            if (allAttractionIds.length > 0) {
              const sb = createSupabaseBrowserClient()
              const { data: verifiedData } = await sb
                .from('attractions')
                .select('id, data_verified')
                .in('id', allAttractionIds)
              for (const v of verifiedData || []) {
                verifiedMap[v.id] = v.data_verified ?? true
              }
            }

            const schedule = (
              itinerary.daily_itinerary as Array<{
                title?: string
                description?: string
                meals?: { breakfast?: string; lunch?: string; dinner?: string }
                accommodation?: string
                isSameAccommodation?: boolean
                activities?: Array<{ title?: string; attraction_id?: string }>
              }>
            ).map((day, idx) => {
              const dayNum = idx + 1
              const coreMeals = coreMealsByDay[dayNum]
              const coreAccom = coreAccomByDay[dayNum]
              const coreActs = coreActivitiesByDay[dayNum]

              const breakfast = coreMeals?.breakfast || day.meals?.breakfast || ''
              const lunch = coreMeals?.lunch || day.meals?.lunch || ''
              const dinner = coreMeals?.dinner || day.meals?.dinner || ''
              const accommodation = coreAccom || day.accommodation || ''

              const activities = coreActs || day.activities || []
              const attractions = activities
                .filter(a => a.attraction_id)
                .map(a => ({ id: a.attraction_id!, name: a.title || '', verified: verifiedMap[a.attraction_id!] ?? true }))

              // 🔧 route 只保留手動備註，過濾掉預設文字和景點名稱
              let routeText = day.title || ''
              
              // 過濾預設文字（這些只是 placeholder，不是真正的 route）
              const defaultTexts = ['抵達目的地', '返回台灣']
              const defaultPattern = /^第\s*\d+\s*天行程$/
              if (defaultTexts.includes(routeText) || defaultPattern.test(routeText)) {
                routeText = ''
              }

              if (attractions.length > 0 && routeText) {
                const attractionNames = attractions.map(a => a.name).filter(Boolean)
                let cleaned = routeText
                for (const name of attractionNames) {
                  cleaned = cleaned.replace(name, '')
                }
                cleaned = cleaned.replace(/^[\s→]+|[\s→]+$/g, '').replace(/→\s*→/g, '→').trim()
                routeText = cleaned
              }

              return {
                day: dayNum,
                route: routeText,
                meals: { breakfast, lunch, dinner },
                accommodation,
                hotelBreakfast: breakfast === COMP_TOURS_LABELS.飯店早餐,
                lunchSelf: lunch === COMP_TOURS_LABELS.敬請自理,
                dinnerSelf: dinner === COMP_TOURS_LABELS.敬請自理,
                sameAsPrevious: day.isSameAccommodation || false,
                attractions: attractions.length > 0 ? attractions : undefined,
                note: day.description || undefined,
                accommodationId: coreAccomIdByDay[dayNum] || undefined,
                mealIds: coreMealIdsByDay[dayNum] || undefined,
              }
            })
            setDailySchedule(schedule)
            setNumDays(schedule.length)
          } else {
            const days = calculateDays()
            setNumDays(days)
            setDailySchedule(initializeDailySchedule(days))
          }
        } else {
          const days = calculateDays()
          setTitle(tour.name || '')
          setNumDays(days)
          setDailySchedule(initializeDailySchedule(days))
          setOutboundFlightDate(tour.departure_date || '')
          setReturnFlightDate(tour.return_date || '')
        }
      } catch (err) {
        logger.error(TOUR_ITINERARY_TAB_LABELS.載入行程表失敗, err)
      } finally {
        setLoading(false)
      }
    }

    loadItinerary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id, tour.name, tour.departure_date, tour.return_date, itineraries.length, coreItems.length])

  // Update day schedule (with ID clearing for accommodation/meals)
  const updateDaySchedule = useCallback((index: number, field: string, value: string | boolean | undefined) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      if (field === 'accommodation' && value === '') {
        newSchedule[index] = { ...newSchedule[index], accommodation: '', accommodationId: undefined }
        return newSchedule
      }
      if (field === 'meals.breakfast' && value === '') {
        newSchedule[index] = { ...newSchedule[index], meals: { ...newSchedule[index].meals, breakfast: '' }, mealIds: { ...newSchedule[index].mealIds, breakfast: undefined } }
        return newSchedule
      }
      if (field === 'meals.lunch' && value === '') {
        newSchedule[index] = { ...newSchedule[index], meals: { ...newSchedule[index].meals, lunch: '' }, mealIds: { ...newSchedule[index].mealIds, lunch: undefined } }
        return newSchedule
      }
      if (field === 'meals.dinner' && value === '') {
        newSchedule[index] = { ...newSchedule[index], meals: { ...newSchedule[index].meals, dinner: '' }, mealIds: { ...newSchedule[index].mealIds, dinner: undefined } }
        return newSchedule
      }
      if (field.startsWith('meals.')) {
        const mealType = field.split('.')[1] as 'breakfast' | 'lunch' | 'dinner'
        newSchedule[index] = {
          ...newSchedule[index],
          meals: { ...newSchedule[index].meals, [mealType]: value as string },
        }
      } else {
        newSchedule[index] = { ...newSchedule[index], [field]: value }
      }
      return newSchedule
    })
  }, [])

  // Get previous accommodation
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

  // Remove an attraction from a day
  const removeAttraction = useCallback((dayIdx: number, attractionId: string) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const day = newSchedule[dayIdx]
      if (!day) return prev
      const updated = (day.attractions || []).filter(a => a.id !== attractionId)
      newSchedule[dayIdx] = { ...day, attractions: updated }
      return newSchedule
    })
  }, [])

  const reorderAttractions = useCallback((dayIdx: number, newOrder: { id: string; name: string }[]) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const day = newSchedule[dayIdx]
      if (!day) return prev
      newSchedule[dayIdx] = { ...day, attractions: newOrder }
      return newSchedule
    })
  }, [])

  // Drag hook (extracted)
  const { activeDragName, handleDragStart, handleDragEnd } = useItineraryDrag(setDailySchedule)

  // Handle mention (@) attraction selection
  const handleMentionSelect = useCallback((dayIdx: number, attraction: { id: string; name: string }) => {
    setDailySchedule(prev => {
      const newSchedule = [...prev]
      const day = newSchedule[dayIdx]
      if (!day) return prev
      const existing = day.attractions || []
      if (existing.some(a => a.id === attraction.id)) return prev
      newSchedule[dayIdx] = { ...day, attractions: [...existing, attraction] }
      return newSchedule
    })
  }, [])

  // Preview data
  const getPreviewDailyData = useCallback(() => {
    const scheduleForPreview = dailySchedule.map(day => ({
      ...day,
      sameAsPrevious: day.sameAsPrevious || false,
      hotelBreakfast: day.hotelBreakfast || false,
      lunchSelf: day.lunchSelf || false,
      dinnerSelf: day.dinnerSelf || false,
    }))
    return computePreviewData(scheduleForPreview, tour.departure_date || null)
  }, [dailySchedule, tour.departure_date])

  // Save (with async optimization for background sync)
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(TOUR_ITINERARY_TAB_LABELS.請輸入行程標題)
      return
    }

    setSaving(true)
    try {
      // 建立完整資料（給 syncToCore 用）
      const fullDailyItinerary = dailySchedule.map((day, idx) => {
        let dateLabel = ''
        if (tour.departure_date) {
          const date = new Date(tour.departure_date)
          date.setDate(date.getDate() + idx)
          const weekdays = TOUR_ITINERARY_TAB_LABELS.WEEKDAYS
          dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
        }

        const isFirst = idx === 0
        const isLast = idx === dailySchedule.length - 1
        const defaultTitle = isFirst
          ? COMP_TOURS_LABELS.抵達目的地
          : isLast
            ? COMP_TOURS_LABELS.返回台灣
            : `${TOUR_ITINERARY_TAB_LABELS.第(day.day)} 天行程`
        // 組合路線標題：景點名稱 → 連接 + 手動輸入的文字
        const attractionNames = (day.attractions || []).map(a => a.name).join(' → ')
        const manualRoute = day.route?.trim() || ''
        const combinedRoute = [attractionNames, manualRoute].filter(Boolean).join(' → ')
        const dayTitle = combinedRoute || defaultTitle
        const breakfast = day.hotelBreakfast ? COMP_TOURS_LABELS.飯店早餐 : day.meals.breakfast
        const lunch = day.lunchSelf ? COMP_TOURS_LABELS.敬請自理 : day.meals.lunch
        const dinner = day.dinnerSelf ? COMP_TOURS_LABELS.敬請自理 : day.meals.dinner
        let accommodation = day.accommodation || ''
        if (day.sameAsPrevious) {
          accommodation = getPreviousAccommodation(idx) || COMP_TOURS_LABELS.續住
        }

        return {
          dayLabel: `Day ${day.day}`,
          date: dateLabel,
          title: dayTitle,
          highlight: '',
          description: day.note || '',
          activities: (day.attractions || []).map(a => ({
            icon: '📍',
            title: a.name,
            description: '',
            attraction_id: a.id,
          })),
          recommendations: [],
          meals: { breakfast, lunch, dinner },
          accommodation: day.sameAsPrevious
            ? `續住 (${getPreviousAccommodation(idx) || ''})`
            : accommodation,
          isSameAccommodation: day.sameAsPrevious || false,
          images: [],
          accommodation_id: day.accommodationId || undefined,
          meal_ids: day.mealIds || undefined,
        }
      })

      // 🔧 修復：daily_itinerary 必須保留完整資料（activities, meals, accommodation）
      // 否則重新載入時景點/住宿/餐食全部消失
      const displayDailyItinerary = fullDailyItinerary.map(day => ({
        dayLabel: day.dayLabel,
        date: day.date,
        title: day.title,
        highlight: day.highlight || '',
        description: day.description || '',
        activities: day.activities || [],
        meals: day.meals,
        accommodation: day.accommodation || '',
        images: day.images || [],
        isSameAccommodation: day.isSameAccommodation || false,
        accommodation_id: day.accommodation_id || undefined,
        meal_ids: day.meal_ids || undefined,
      }))

      const itineraryData = {
        tour_id: tour.id,
        title,
        tagline: '',
        subtitle: '',
        description: '',
        departure_date: tour.departure_date || '',
        tour_code: tour.code || '',
        cover_image: '',
        country: tour.location || '',
        city: '',
        status: '開團' as const,
        features: [],
        focus_cards: [],
        daily_itinerary: displayDailyItinerary,
        outbound_flight:
          outboundFlights.length > 0
            ? outboundFlights.map(f => ({
                airline: f.airline || '',
                flightNumber: f.flightNumber || '',
                departureAirport: f.departureAirport || '',
                departureTime: f.departureTime || '',
                departureDate: '',
                arrivalAirport: f.arrivalAirport || '',
                arrivalTime: f.arrivalTime || '',
                duration: '',
              }))
            : undefined,
        return_flight:
          returnFlights.length > 0
            ? returnFlights.map(f => ({
                airline: f.airline || '',
                flightNumber: f.flightNumber || '',
                departureAirport: f.departureAirport || '',
                departureTime: f.departureTime || '',
                departureDate: '',
                arrivalAirport: f.arrivalAirport || '',
                arrivalTime: f.arrivalTime || '',
                duration: '',
              }))
            : undefined,
      }

      let savedItineraryId = currentItineraryId

      // Main save (must succeed)
      if (currentItineraryId) {
        await updateItinerary(currentItineraryId, itineraryData)
        toast.success(TOUR_ITINERARY_TAB_LABELS.行程表已更新)
      } else {
        const newItinerary = await createItinerary({
          ...itineraryData,
          created_by: currentUser?.id || undefined,
        } as Parameters<typeof createItinerary>[0])
        if (newItinerary?.id) {
          savedItineraryId = newItinerary.id
          setCurrentItineraryId(newItinerary.id)
          toast.success(TOUR_ITINERARY_TAB_LABELS.行程表已建立)
        }
      }

      // Background sync: 只寫核心表（報價單/需求單直接讀核心表，不需要同步）
      if (savedItineraryId) {
        syncToCore({
          itinerary_id: savedItineraryId,
          tour_id: tour.id,
          daily_itinerary: fullDailyItinerary as DailyItinerary[],
        }).then((result) => {
          if (result && 'success' in result && !result.success) {
            logger.error('syncToCore failed:', result.message)
            toast.error(`核心表同步失敗：${result.message}`)
          } else {
            refreshCoreItems()
          }
        }).catch(err => {
          logger.error('syncToCore error (background):', err)
          toast.error('核心表同步失敗')
        })
      }

      refresh()
    } catch (error) {
      logger.error(TOUR_ITINERARY_TAB_LABELS.儲存行程表失敗, error)
      toast.error(COMP_TOURS_LABELS.儲存失敗)
    } finally {
      setSaving(false)
    }
  }

  // Print ref
  const printContentRef = useRef<HTMLDivElement>(null)

  // Print（iframe 方式，與快速報價單同邏輯）
  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    const originalTitle = document.title
    const printTitle = `${title || tour.name || TOUR_ITINERARY_TAB_LABELS.行程表}`
    document.title = printTitle

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      document.title = originalTitle
      return
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${printTitle}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-container { padding: 16px; }
          h1 { font-size: 20px; font-weight: bold; color: #4a4a4a; }
          .header-bar { border-bottom: 2px solid #B8A99A; padding-bottom: 12px; margin-bottom: 20px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
          .workspace-code { font-size: 14px; font-weight: 600; color: #B8A99A; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 13px; }
          .meta-label { color: #999; }
          .flight-section { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
          .flight-title { font-weight: 600; color: #B8A99A; margin-bottom: 6px; }
          .flight-info { color: #666; }
          .flight-info span.bold { font-weight: 500; color: #4a4a4a; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead tr { background-color: #B8A99A !important; color: white; }
          th { padding: 8px 10px; text-align: left; border: 1px solid rgba(184,169,154,0.5); font-weight: 600; }
          th.center { text-align: center; }
          td { padding: 8px 10px; border: 1px solid #e5e5e5; }
          td.center { text-align: center; }
          tr:nth-child(even) { background-color: #fafafa; }
          .day-label { font-weight: 600; color: #B8A99A; }
          .day-date { font-size: 11px; color: #999; }
          .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #ccc; border-top: 1px solid #eee; padding-top: 12px; }
          svg { display: none; }
        </style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
        document.title = originalTitle
      }, 1000)
    }, 100)
  }, [title, tour.name])

  // Compute date label for a given day index
  const getDateLabel = useCallback(
    (idx: number) => {
      if (!tour.departure_date) return ''
      const date = new Date(tour.departure_date)
      date.setDate(date.getDate() + idx)
      return `${date.getMonth() + 1}/${date.getDate()}`
    },
    [tour.departure_date]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  // Preview mode
  if (viewMode === 'preview') {
    const dailyData = getPreviewDailyData()
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-medium">
            <Eye className="w-5 h-5 text-morandi-gold" />
            {TOUR_ITINERARY_TAB_LABELS.簡易行程表預覽}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode('edit')}>
              <Edit2 className="w-4 h-4 mr-1" />
              {TOUR_ITINERARY_TAB_LABELS.編輯}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Printer className="w-4 h-4 mr-1" />
              {TOUR_ITINERARY_TAB_LABELS.列印}
            </Button>
          </div>
        </div>

        <div ref={printContentRef} className="border rounded-lg p-6 bg-card print-container">
          <div className="header-bar border-b-2 border-morandi-gold pb-4 mb-6">
            <div className="header-top flex items-start justify-between">
              <h1 className="text-xl font-bold text-morandi-primary">
                {title || TOUR_ITINERARY_TAB_LABELS.行程表}
              </h1>
              <span className="workspace-code text-sm font-semibold text-morandi-gold">
                {currentUser?.workspace_code || TOUR_ITINERARY_TAB_LABELS.TRAVEL_AGENCY}
              </span>
            </div>
            <div className="meta-grid mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="meta-label text-muted-foreground">
                  {TOUR_ITINERARY_TAB_LABELS.目的地_冒號}
                </span>
                {tour.location || '-'}
              </div>
              <div>
                <span className="meta-label text-muted-foreground">
                  {TOUR_ITINERARY_TAB_LABELS.出發日期}：
                </span>
                {tour.departure_date || '-'}
              </div>
              <div>
                <span className="meta-label text-muted-foreground">
                  {TOUR_ITINERARY_TAB_LABELS.行程天數_冒號}
                </span>
                {dailyData.length} {TOUR_ITINERARY_TAB_LABELS.天}
              </div>
            </div>
          </div>

          {/* 航班資訊 */}
          {outboundFlights.some(f => f.flightNumber) || returnFlights.some(f => f.flightNumber) ? (
            <div className="flight-section mb-6 grid grid-cols-2 gap-4 text-sm">
              {outboundFlights.some(f => f.flightNumber) && (
                <div>
                  <h4 className="flight-title font-semibold text-morandi-gold mb-2 flex items-center gap-1">
                    <Plane className="w-4 h-4" />
                    去程
                  </h4>
                  {outboundFlights.filter(f => f.flightNumber).map((f, i) => (
                    <div key={i} className="flight-info flex items-center gap-2 text-muted-foreground">
                      <span className="bold font-medium text-morandi-primary">{f.airline} {f.flightNumber}</span>
                      <span>{f.departureAirport} {f.departureTime}</span>
                      <span>→</span>
                      <span>{f.arrivalAirport} {f.arrivalTime}</span>
                    </div>
                  ))}
                </div>
              )}
              {returnFlights.some(f => f.flightNumber) && (
                <div>
                  <h4 className="flight-title font-semibold text-morandi-gold mb-2 flex items-center gap-1">
                    <Plane className="w-4 h-4" />
                    回程
                  </h4>
                  {returnFlights.filter(f => f.flightNumber).map((f, i) => (
                    <div key={i} className="flight-info flex items-center gap-2 text-muted-foreground">
                      <span className="bold font-medium text-morandi-primary">{f.airline} {f.flightNumber}</span>
                      <span>{f.departureAirport} {f.departureTime}</span>
                      <span>→</span>
                      <span>{f.arrivalAirport} {f.arrivalTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-morandi-gold text-white">
                <th className="border border-morandi-gold/50 px-3 py-2 text-left w-16">
                  {TOUR_ITINERARY_TAB_LABELS.日期_表頭}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-left">
                  {TOUR_ITINERARY_TAB_LABELS.行程內容}
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((day, index) => {
                const rowCount = 2 + (day.note ? 1 : 0) + (day.accommodation ? 1 : 0)
                return (
                  <Fragment key={index}>
                    <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <td className="border border-muted px-3 py-2 align-middle text-center font-semibold text-morandi-gold" rowSpan={rowCount}>
                        {day.date || day.dayLabel}
                      </td>
                      <td className="border border-muted px-3 py-2 font-medium">
                        {day.title}
                      </td>
                    </tr>
                    {day.note && (
                      <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                        <td className="border border-muted px-3 py-1.5">
                          <span className="text-morandi-gold text-[12px]">※{day.note}</span>
                        </td>
                      </tr>
                    )}
                    <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <td className="border border-muted px-0 py-1.5">
                        <div className="grid grid-cols-3 text-[12px]">
                          <div className="flex items-center gap-2 px-3">
                            <span className="font-medium text-muted-foreground shrink-0">{TOUR_ITINERARY_TAB_LABELS.早餐_表頭}</span>
                            <span>{day.meals.breakfast || 'X'}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 border-l border-muted">
                            <span className="font-medium text-muted-foreground shrink-0">{TOUR_ITINERARY_TAB_LABELS.午餐_表頭}</span>
                            <span>{day.meals.lunch || 'X'}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 border-l border-muted">
                            <span className="font-medium text-muted-foreground shrink-0">{TOUR_ITINERARY_TAB_LABELS.晚餐_表頭}</span>
                            <span>{day.meals.dinner || 'X'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {day.accommodation && (
                      <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                        <td className="border border-muted px-3 py-1.5 text-[12px]">
                          <span className="font-medium text-muted-foreground mr-2">{TOUR_ITINERARY_TAB_LABELS.住宿_表頭}</span>
                          <span>{day.accommodation}</span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ============================================================
  // Edit mode — 左右分割佈局（左 60% 行程編輯，右 40% 資源庫+地圖）
  // ============================================================
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="flex flex-col h-full overflow-hidden">
      {/* -- Header -- */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-morandi-primary">
          <FileText className="w-4 h-4 text-morandi-gold" />
          {currentItineraryId ? COMP_TOURS_LABELS.編輯行程表 : COMP_TOURS_LABELS.建立行程表}
          <span className="font-normal text-xs text-muted-foreground ml-1">
            — {tour.name || COMP_TOURS_LABELS.未設定}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('preview')}
            className="h-7 px-2 text-xs gap-1"
          >
            <Eye size={12} />
            {TOUR_ITINERARY_TAB_LABELS.預覽}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="h-7 px-3 text-xs bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {currentItineraryId ? COMP_TOURS_LABELS.更新行程 : COMP_TOURS_LABELS.建立行程}
          </Button>
        </div>
      </div>

      {/* -- 左右分割主內容區 -- */}
      <div className="flex-1 flex overflow-hidden">

      {/* -- 左側：行程編輯（60%）-- */}
      <div className="w-[60%] overflow-y-auto px-4 pb-4">
        {/* Info row: title + days + accommodation */}
        <div className="flex items-end gap-3 mb-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">
              {TOUR_ITINERARY_TAB_LABELS.行程標題_必填}
            </Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={TOUR_ITINERARY_TAB_LABELS.行程表標題}
              className="h-8 text-sm"
            />
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs text-muted-foreground">
              {TOUR_ITINERARY_TAB_LABELS.調整天數}
            </Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={numDays}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                if (v >= 1 && v <= 30) {
                  setNumDays(v)
                  if (tour.departure_date && tour.id) {
                    const start = new Date(tour.departure_date)
                    const newReturnDate = new Date(start)
                    newReturnDate.setDate(start.getDate() + v - 1)
                    const returnDateStr = newReturnDate.toISOString().split('T')[0]

                    updateTour(tour.id, { return_date: returnDateStr })
                      .then(() => {
                        toast.success(`已同步更新团的回程日期为 ${returnDateStr}`)
                      })
                      .catch(err => {
                        logger.error('更新团回程日期失败', err)
                        toast.error('更新回程日期失败')
                      })
                  }
                }
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Flights row (hidden for domestic) */}
        {!isDomestic && (
          <div className="flex flex-col gap-3 mb-3">
            {/* Outbound flights */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs mb-1.5">
                <Plane size={12} className="text-morandi-gold" />
                <span className="text-muted-foreground font-medium">
                  {TOUR_ITINERARY_TAB_LABELS.去程}
                </span>
              </div>
              <div className="border border-border/50 rounded overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1.5 border-b border-border/30">
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.LABEL_5176}</span>
                  <span className="w-20">{TOUR_ITINERARY_TAB_LABELS.LABEL_3349}</span>
                  <span className="w-14">{TOUR_ITINERARY_TAB_LABELS.LABEL_7681}</span>
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.TIME}</span>
                  <span className="w-4"></span>
                  <span className="w-14">{TOUR_ITINERARY_TAB_LABELS.抵達}</span>
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.TIME}</span>
                  <span className="flex-1"></span>
                </div>
                {outboundFlights.map((flight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-sm px-2 py-1 border-b border-border/20 hover:bg-muted/10 group"
                  >
                    <Input
                      value={flight.airline || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) => (i === index ? { ...f, airline: e.target.value } : f))
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.flightNumber || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, flightNumber: e.target.value.toUpperCase() } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-20 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.departureAirport || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) =>
                            i === index
                              ? { ...f, departureAirport: e.target.value.toUpperCase() }
                              : f
                          )
                        )
                      }
                      className="h-7 text-sm w-14 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.departureTime || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, departureTime: e.target.value } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <span className="text-muted-foreground w-4 text-center text-xs">→</span>
                    <Input
                      value={flight.arrivalAirport || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, arrivalAirport: e.target.value.toUpperCase() } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-14 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.arrivalTime || ''}
                      placeholder="—"
                      onChange={e =>
                        setOutboundFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, arrivalTime: e.target.value } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    {index === 0 ? (
                      <div className="flex-1 flex items-center justify-end gap-1">
                        <Input
                          value={outboundFlightNumber}
                          onChange={e => setOutboundFlightNumber(e.target.value.toUpperCase())}
                          placeholder={TOUR_ITINERARY_TAB_LABELS.SEARCH_8458}
                          className="h-7 text-xs w-36 px-1"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && outboundFlightNumber) {
                              handleSearchOutboundFlight()
                            }
                          }}
                        />
                        <DatePicker
                          value={outboundFlightDate}
                          onChange={date => setOutboundFlightDate(date || '')}
                          placeholder={TOUR_ITINERARY_TAB_LABELS.日期_表頭}
                          className="h-7 text-xs w-24"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSearchOutboundFlight}
                          disabled={searchingOutbound || !outboundFlightNumber}
                          className="h-7 w-7 p-0 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                          title={TOUR_ITINERARY_TAB_LABELS.SEARCH_3338}
                        >
                          {searchingOutbound ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Search size={12} />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setOutboundFlights(prev => [
                              ...prev,
                              {
                                airline: '',
                                flightNumber: '',
                                departureAirport: '',
                                departureTime: '',
                                arrivalAirport: '',
                                arrivalTime: '',
                              },
                            ])
                          }
                          className="h-7 w-7 p-0"
                          title={TOUR_ITINERARY_TAB_LABELS.ADD_9636}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() =>
                            setOutboundFlights(prev => prev.filter((_, i) => i !== index))
                          }
                          className="text-destructive/60 hover:text-destructive p-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {outboundSegments.length > 0 && (
                  <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
                    <p className="text-xs text-muted-foreground">
                      {TOUR_ITINERARY_TAB_LABELS.此航班有多個航段_請選擇}
                    </p>
                    {outboundSegments.map((seg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOutboundSegment(seg)}
                        className="w-full text-left p-1 rounded hover:bg-morandi-gold/10 transition-colors text-xs"
                      >
                        {seg.departureAirport} → {seg.arrivalAirport}
                        <span className="text-muted-foreground ml-1">
                          {seg.departureTime} - {seg.arrivalTime}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={clearOutboundSegments}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {COMP_TOURS_LABELS.取消}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Return flights */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs mb-1.5">
                <Plane size={12} className="text-morandi-gold" />
                <span className="text-muted-foreground font-medium">
                  {TOUR_ITINERARY_TAB_LABELS.回程}
                </span>
              </div>
              <div className="border border-border/50 rounded overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1.5 border-b border-border/30">
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.LABEL_5176}</span>
                  <span className="w-20">{TOUR_ITINERARY_TAB_LABELS.LABEL_3349}</span>
                  <span className="w-14">{TOUR_ITINERARY_TAB_LABELS.LABEL_7681}</span>
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.TIME}</span>
                  <span className="w-4"></span>
                  <span className="w-14">{TOUR_ITINERARY_TAB_LABELS.抵達}</span>
                  <span className="w-16">{TOUR_ITINERARY_TAB_LABELS.TIME}</span>
                  <span className="flex-1"></span>
                </div>
                {returnFlights.map((flight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-sm px-2 py-1 border-b border-border/20 hover:bg-muted/10 group"
                  >
                    <Input
                      value={flight.airline || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) => (i === index ? { ...f, airline: e.target.value } : f))
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.flightNumber || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, flightNumber: e.target.value.toUpperCase() } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-20 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.departureAirport || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) =>
                            i === index
                              ? { ...f, departureAirport: e.target.value.toUpperCase() }
                              : f
                          )
                        )
                      }
                      className="h-7 text-sm w-14 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.departureTime || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, departureTime: e.target.value } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <span className="text-muted-foreground w-4 text-center text-xs">→</span>
                    <Input
                      value={flight.arrivalAirport || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, arrivalAirport: e.target.value.toUpperCase() } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-14 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    <Input
                      value={flight.arrivalTime || ''}
                      placeholder="—"
                      onChange={e =>
                        setReturnFlights(prev =>
                          prev.map((f, i) =>
                            i === index ? { ...f, arrivalTime: e.target.value } : f
                          )
                        )
                      }
                      className="h-7 text-sm w-16 px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-white focus-visible:border focus-visible:rounded"
                    />
                    {index === 0 ? (
                      <div className="flex-1 flex items-center justify-end gap-1">
                        <Input
                          value={returnFlightNumber}
                          onChange={e => setReturnFlightNumber(e.target.value.toUpperCase())}
                          placeholder={TOUR_ITINERARY_TAB_LABELS.SEARCH_8458}
                          className="h-7 text-xs w-36 px-1"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && returnFlightNumber) {
                              handleSearchReturnFlight()
                            }
                          }}
                        />
                        <DatePicker
                          value={returnFlightDate}
                          onChange={date => setReturnFlightDate(date || '')}
                          placeholder={TOUR_ITINERARY_TAB_LABELS.日期_表頭}
                          className="h-7 text-xs w-24"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSearchReturnFlight}
                          disabled={searchingReturn || !returnFlightNumber}
                          className="h-7 w-7 p-0 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                          title={TOUR_ITINERARY_TAB_LABELS.SEARCH_3338}
                        >
                          {searchingReturn ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Search size={12} />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReturnFlights(prev => [
                              ...prev,
                              {
                                airline: '',
                                flightNumber: '',
                                departureAirport: '',
                                departureTime: '',
                                arrivalAirport: '',
                                arrivalTime: '',
                              },
                            ])
                          }
                          className="h-7 w-7 p-0"
                          title={TOUR_ITINERARY_TAB_LABELS.ADD_9636}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setReturnFlights(prev => prev.filter((_, i) => i !== index))}
                          className="text-destructive/60 hover:text-destructive p-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {returnSegments.length > 0 && (
                  <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
                    <p className="text-xs text-muted-foreground">
                      {TOUR_ITINERARY_TAB_LABELS.此航班有多個航段_請選擇}
                    </p>
                    {returnSegments.map((seg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectReturnSegment(seg)}
                        className="w-full text-left p-1 rounded hover:bg-morandi-gold/10 transition-colors text-xs"
                      >
                        {seg.departureAirport} → {seg.arrivalAirport}
                        <span className="text-muted-foreground ml-1">
                          {seg.departureTime} - {seg.arrivalTime}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={clearReturnSegments}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {COMP_TOURS_LABELS.取消}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -- Daily schedule table -- */}
        <table className="w-full border-collapse text-sm border border-border/30">
          <thead className="sticky top-0 z-10">
            <tr className="bg-morandi-gold text-white text-xs">
              <th className="px-2 py-1.5 text-left w-16 font-medium border-r border-white/20">
                {TOUR_ITINERARY_TAB_LABELS.日期_表頭}
              </th>
              <th className="px-2 py-1.5 text-left font-medium border-r border-white/20">
                {TOUR_ITINERARY_TAB_LABELS.行程內容}
              </th>
              <th className="px-1 py-1.5 text-center w-24 font-medium border-r border-white/20">
                工具
              </th>
              <th className="px-1 py-1.5 text-center w-[120px] font-medium border-r border-white/20">
                {TOUR_ITINERARY_TAB_LABELS.早餐_表頭}
              </th>
              <th className="px-1 py-1.5 text-center w-[120px] font-medium border-r border-white/20">
                {TOUR_ITINERARY_TAB_LABELS.午餐_表頭}
              </th>
              <th className="px-1 py-1.5 text-center w-[120px] font-medium">
                {TOUR_ITINERARY_TAB_LABELS.晚餐_表頭}
              </th>
            </tr>
          </thead>
            {dailySchedule.map((day, idx) => (
              <DayRow
                key={idx}
                day={day}
                idx={idx}
                isFirst={idx === 0}
                isLast={idx === dailySchedule.length - 1}
                updateDaySchedule={updateDaySchedule}
                removeAttraction={removeAttraction}
                reorderAttractions={reorderAttractions}
                handleMentionSelect={handleMentionSelect}
                mentionInputRefs={mentionInputRefs}
                tourLocation={tour.location || ''}
                getDateLabel={getDateLabel}
                getPreviousAccommodation={getPreviousAccommodation}
              />
            ))}
        </table>
      </div>

      {/* -- 右側：資源庫 + 地圖（40%）-- */}
      <div className="w-[40%] flex flex-col border-l border-border overflow-hidden">
        <ResourcePanel
          className="flex-1 overflow-hidden"
          countryId={tour.country_id || ''}
          locationName={tour.location || ''}

        />
        <div className="h-48 border-t border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground">
          <Map size={24} className="mb-2 opacity-40" />
          <span className="text-xs">地圖（開發中）</span>
        </div>
      </div>

      </div>{/* 左右分割結束 */}

      {/* 拖拽覆蓋層 */}
      <DragOverlay>
        {activeDragName ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-morandi-gold bg-card shadow-lg text-sm font-medium">
            <MapPin size={14} className="text-morandi-gold" />
            {activeDragName}
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  )
}
