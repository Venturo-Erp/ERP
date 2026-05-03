'use client'

/**
 * 展示行程分頁 - 旅遊團詳情內的展示行程編輯器
 *
 * 將原本 /itinerary/new 頁面的 TourForm + TourPreview 雙欄編輯器
 * 整合為旅遊團詳情的一個分頁，自動從團資料帶入基本資訊。
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { TourForm } from '@/components/editor/TourForm'
import { TourPreview } from '@/components/editor/TourPreview'
import { PublishButton } from '@/components/editor/PublishButton'
import { PrintItineraryForm } from '@/features/itinerary/components/PrintItineraryForm'
import { PrintItineraryPreview } from '@/features/itinerary/components/PrintItineraryPreview'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useItineraries, updateTour, useCountries, useTourItineraryItems } from '@/data'
import type {
  FlightInfo,
  Feature,
  FocusCard,
  DailyItinerary,
  Activity,
  MeetingPoint,
  TourFormData,
} from '@/components/editor/tour-form/types'
import type { Tour } from '@/stores/types'
import type { ItineraryVersionRecord } from '@/stores/types'
import { COMP_TOURS_LABELS } from '@/features/tours/constants/labels'
import {
  Building2,
  UtensilsCrossed,
  Sparkles,
  Calendar,
  Plane,
  MapPin,
  Printer,
  Monitor,
  Smartphone,
  Plus,
  FileText,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// Icon mapping for preview
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  IconBuilding: Building2,
  IconToolsKitchen2: UtensilsCrossed,
  IconSparkles: Sparkles,
  IconCalendar: Calendar,
  IconPlane: Plane,
  IconMapPin: MapPin,
}

interface TourDisplayItineraryTabProps {
  tour: Tour
}

type EditorMode = 'web' | 'print'

/**
 * 從團資料建立預設的展示行程資料
 */
function buildDefaultFromTour(tour: Tour, countryName = ''): TourFormData {
  const departureDate = tour.departure_date ? new Date(tour.departure_date) : new Date()
  const returnDate = tour.return_date ? new Date(tour.return_date) : new Date()
  const days =
    Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const airportCode = tour.airport_code || ''

  return {
    tagline: 'Corner Travel',
    title: tour.name || '',
    subtitle: '精緻旅遊',
    // 注意：tours.description 是內部備註，不該被展示行程當對客描述用
    description: '',
    departureDate: departureDate.toLocaleDateString('zh-TW'),
    tourCode: tour.code || '',
    coverImage: '',
    // SSOT：country/city 的真相是 tours.country_id / airport_code，永遠以 tour 為準
    country: countryName,
    city: airportCode,
    outboundFlight: {
      airline: '',
      flightNumber: '',
      departureAirport: 'TPE',
      departureTime: '',
      departureDate: departureDate.toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
      }),
      arrivalAirport: airportCode,
      arrivalTime: '',
      duration: '',
    },
    returnFlight: {
      airline: '',
      flightNumber: '',
      departureAirport: airportCode,
      departureTime: '',
      departureDate: returnDate.toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
      }),
      arrivalAirport: 'TPE',
      arrivalTime: '',
      duration: '',
    },
    features: [],
    focusCards: [],
    leader: { name: '', domesticPhone: '', overseasPhone: '' },
    meetingPoints: [{ time: '', location: '' }],
    hotels: [],
    showFeatures: true,
    showLeaderMeeting: true,
    showHotels: false,
    itinerarySubtitle: days > 1 ? `${days}天${days - 1}夜精彩旅程規劃` : '',
    dailyItinerary: [],
  }
}

/**
 * 從 DB itinerary 資料轉換為 TourFormData
 *
 * @param overrideDailyItinerary 若核心表（tour_itinerary_items 含 day_meta + 內容 row）有資料，
 *   從 primary 路徑帶入；否則為 undefined，fallback 讀 JSONB `daily_itinerary`
 */
function itineraryToFormData(
  itinerary: Record<string, unknown>,
  tour?: Tour,
  countryName = '',
  overrideDailyItinerary?: DailyItinerary[]
): TourFormData {
  // SSOT：永遠以 tour 為準，無視 itineraries.country/city（歷史包袱，可能含髒資料）
  const ssotCity = tour?.airport_code || ''
  const rawOutbound = itinerary.outbound_flight
  const rawReturn = itinerary.return_flight
  const outbound = (Array.isArray(rawOutbound) ? rawOutbound[0] : rawOutbound) as
    | FlightInfo
    | undefined
  const ret = (Array.isArray(rawReturn) ? rawReturn[0] : rawReturn) as FlightInfo | undefined
  const meetingInfo = itinerary.meeting_info as MeetingPoint | undefined

  return {
    tagline: (itinerary.tagline as string) || '',
    title: (itinerary.title as string) || '',
    subtitle: (itinerary.subtitle as string) || '',
    description: (itinerary.description as string) || '',
    departureDate: (itinerary.departure_date as string) || '',
    tourCode: (itinerary.tour_code as string) || '',
    coverImage: (itinerary.cover_image as string) || '',
    coverStyle: itinerary.cover_style as TourFormData['coverStyle'],
    flightStyle: itinerary.flight_style as TourFormData['flightStyle'],
    itineraryStyle: itinerary.itinerary_style as TourFormData['itineraryStyle'],
    country: countryName,
    city: ssotCity,
    outboundFlight: outbound || {
      airline: '',
      flightNumber: '',
      departureAirport: 'TPE',
      departureTime: '',
      arrivalAirport: '',
      arrivalTime: '',
    },
    returnFlight: ret || {
      airline: '',
      flightNumber: '',
      departureAirport: '',
      departureTime: '',
      arrivalAirport: 'TPE',
      arrivalTime: '',
    },
    features: (itinerary.features as Feature[]) || [],
    focusCards: (itinerary.focus_cards as FocusCard[]) || [],
    leader: (itinerary.leader as TourFormData['leader']) || {
      name: '',
      domesticPhone: '',
      overseasPhone: '',
    },
    meetingPoints: meetingInfo ? [meetingInfo] : [{ time: '', location: '' }],
    hotels: (itinerary.hotels as TourFormData['hotels']) || [],
    showFeatures: itinerary.show_features !== false,
    showLeaderMeeting: itinerary.show_leader_meeting !== false,
    showHotels: itinerary.show_hotels === true,
    showPricingDetails: itinerary.show_pricing_details === true,
    showPriceTiers: itinerary.show_price_tiers === true,
    priceTiers: (itinerary.price_tiers as TourFormData['priceTiers']) || null,
    showFaqs: itinerary.show_faqs === true,
    showNotices: itinerary.show_notices === true,
    showCancellationPolicy: itinerary.show_cancellation_policy === true,
    faqs: itinerary.faqs as TourFormData['faqs'],
    notices: itinerary.notices as TourFormData['notices'],
    cancellationPolicy: itinerary.cancellation_policy as TourFormData['cancellationPolicy'],
    itinerarySubtitle: (itinerary.itinerary_subtitle as string) || '',
    // Primary：核心表（tour_itinerary_items 含 day_meta + 內容 row）組出來的版本
    // Fallback：JSONB `daily_itinerary`（若核心表對這個 tour 沒 rows）
    dailyItinerary: overrideDailyItinerary ?? (itinerary.daily_itinerary as DailyItinerary[]) ?? [],
    price: itinerary.price as string | null,
    priceNote: itinerary.price_note as string | null,
  }
}

export function TourDisplayItineraryTab({ tour }: TourDisplayItineraryTabProps) {
  const { items: itineraries } = useItineraries()
  const { items: countries } = useCountries()
  // 展示資料讀核心表（tour_itinerary_items；day_meta anchor row 帶 day-level metadata）
  const { items: allItineraryItems } = useTourItineraryItems()
  const allItineraryDays = useMemo(
    () => allItineraryItems.filter(i => i.category === 'day_meta'),
    [allItineraryItems]
  )

  // 解析 country_id → 國家名稱（與 useTourEdit 相同邏輯，避免依賴已廢棄的 tour.location）
  const countryName = useMemo(() => {
    if (!tour.country_id) return ''
    return countries.find(c => c.id === tour.country_id)?.name || ''
  }, [countries, tour.country_id])

  // 找到該團關聯的展示行程
  const linkedItinerary = useMemo(
    () => itineraries.find(it => it.tour_id === tour.id),
    [itineraries, tour.id]
  )

  // Phase 5a: 從新表組 DailyItinerary[]（相容 JSONB 結構給下游元件）
  // 若新表對這個 tour 沒任何 row，回傳 undefined → 觸發 JSONB fallback
  const composedDailyItinerary = useMemo<DailyItinerary[] | undefined>(() => {
    const dayRows = allItineraryDays.filter(d => d.tour_id === tour.id)
    if (dayRows.length === 0) return undefined // fallback 到 JSONB

    const itemRows = allItineraryItems.filter(i => i.tour_id === tour.id)
    const departureDate = tour.departure_date ? new Date(tour.departure_date) : null

    // day_number → date 字串（YYYY-MM-DD）
    const dateForDay = (dayNumber: number): string => {
      if (!departureDate) return ''
      const d = new Date(departureDate)
      d.setDate(d.getDate() + (dayNumber - 1))
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    // meal preset → 顯示字串
    const presetToMealText = (preset: string | null): string => {
      if (preset === 'hotel') return COMP_TOURS_LABELS.飯店早餐
      if (preset === 'self') return COMP_TOURS_LABELS.敬請自理
      if (preset === 'airline') return COMP_TOURS_LABELS.機上簡餐
      return ''
    }

    // 依 day_number 排序
    const sortedDays = [...dayRows].sort((a, b) => (a.day_number || 0) - (b.day_number || 0))

    return sortedDays.map(dayRow => {
      const dn = dayRow.day_number ?? 0
      const dayItems = itemRows
        .filter(i => i.day_number === dn && i.category !== 'day_meta')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      // Activities：category='activities'
      const activities: Activity[] = dayItems
        .filter(i => i.category === 'activities')
        .map(i => ({
          icon: '📍',
          title: i.title || '',
          description: i.description || '',
          attraction_id: i.resource_id || undefined,
        }))

      // Meals：優先用 preset 推字串，preset 為 null 時從 items 抓 title
      const mealItems = dayItems.filter(i => i.category === 'meals')
      const mealByType = (sub: 'breakfast' | 'lunch' | 'dinner') =>
        mealItems.find(i => i.sub_category === sub)

      const resolveMeal = (preset: string | null, sub: 'breakfast' | 'lunch' | 'dinner') => {
        const presetText = presetToMealText(preset)
        if (presetText) return presetText
        return mealByType(sub)?.title || mealByType(sub)?.resource_name || ''
      }

      const breakfast = resolveMeal(dayRow.breakfast_preset ?? null, 'breakfast')
      const lunch = resolveMeal(dayRow.lunch_preset ?? null, 'lunch')
      const dinner = resolveMeal(dayRow.dinner_preset ?? null, 'dinner')

      // meal_ids（給下游 syncToCore 用，這裡保留但展示不直接使用）
      const mealIds = {
        breakfast: mealByType('breakfast')?.resource_id || undefined,
        lunch: mealByType('lunch')?.resource_id || undefined,
        dinner: mealByType('dinner')?.resource_id || undefined,
      }

      // Accommodation
      const accommodationItem = dayItems.find(i => i.category === 'accommodation')
      const accommodation = accommodationItem?.resource_name || accommodationItem?.title || ''
      const accommodationId = accommodationItem?.resource_id || undefined

      const dayDate = dateForDay(dn)

      // 相容 JSONB 結構；額外保留 accommodation_id / meal_ids 於物件上（現欄位型別未宣告，
      // 下游 sync 透過 `as Record<string, unknown>` 讀取）
      const daily: DailyItinerary & {
        accommodation_id?: string
        meal_ids?: { breakfast?: string; lunch?: string; dinner?: string }
      } = {
        dayLabel: `Day ${dn}`,
        date: dayDate,
        title: dayRow.day_title || '',
        highlight: '', // 核心表沒這欄位 → 空字串
        description: dayRow.day_note || '',
        activities,
        recommendations: [], // 核心表沒這欄位 → 空陣列
        meals: { breakfast, lunch, dinner },
        accommodation,
        isSameAccommodation: dayRow.is_same_accommodation || false,
        images: [], // 核心表沒這欄位 → 空陣列
        accommodation_id: accommodationId,
        meal_ids: mealIds,
      }
      // route 不在 DailyItinerary interface 裡，但 JSONB 原格式有、下游有讀
      ;(daily as unknown as { route?: string }).route = dayRow.day_route || ''

      return daily
    })
  }, [allItineraryDays, allItineraryItems, tour.id, tour.departure_date])
  // allItineraryDays 是從 allItineraryItems 派生的、deps 留兩者並列以保 effect 重算精準

  const [mode, setMode] = useState<EditorMode>('web')
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [scale, setScale] = useState(1)
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileContentRef = useRef<HTMLDivElement>(null)

  // Tour form data state
  const [tourData, setTourData] = useState<TourFormData>(() => {
    if (linkedItinerary) {
      return itineraryToFormData(
        linkedItinerary as unknown as Record<string, unknown>,
        tour,
        countryName,
        composedDailyItinerary
      )
    }
    // 沒 linkedItinerary 但新表有資料 → 以預設 + 新表 dailyItinerary 開場
    const base = buildDefaultFromTour(tour, countryName)
    if (composedDailyItinerary) {
      return { ...base, dailyItinerary: composedDailyItinerary }
    }
    return base
  })

  // 當找到已有的展示行程、countryName 解析完成、或新表資料更新時重算
  useEffect(() => {
    if (linkedItinerary) {
      setTourData(
        itineraryToFormData(
          linkedItinerary as unknown as Record<string, unknown>,
          tour,
          countryName,
          composedDailyItinerary
        )
      )
    } else {
      const base = buildDefaultFromTour(tour, countryName)
      setTourData(
        composedDailyItinerary ? { ...base, dailyItinerary: composedDailyItinerary } : base
      )
    }
  }, [linkedItinerary?.id, tour, countryName, composedDailyItinerary])

  // Print data state
  const [printData, setPrintData] = useState({
    coverImage: '',
    tagline: '角落嚴選行程',
    taglineEn: 'EXPLORE EVERY CORNER OF THE WORLD',
    title: tour.name || '',
    subtitle: '',
    price: '',
    priceNote: '',
    country: '',
    city: '',
    dailySchedule: [] as {
      day: string
      route: string
      meals: { breakfast: string; lunch: string; dinner: string }
      accommodation: string
    }[],
    flightOptions: [] as {
      airline: string
      outbound: {
        code: string
        from: string
        fromCode: string
        time: string
        to: string
        toCode: string
        arrivalTime: string
      }
      return: {
        code: string
        from: string
        fromCode: string
        time: string
        to: string
        toCode: string
        arrivalTime: string
      }
    }[],
    highlightImages: ['', '', ''],
    highlightSpots: [] as {
      name: string
      nameEn: string
      tags: string[]
      description: string
    }[],
    sights: [] as {
      name: string
      nameEn: string
      description: string
      note?: string
    }[],
  })

  // 計算預覽縮放
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const targetWidth = viewMode === 'mobile' ? 410 : 1200
      const targetHeight = viewMode === 'mobile' ? 880 : 800
      const scaleX = (containerWidth - 40) / targetWidth
      const scaleY = (containerHeight - 40) / targetHeight
      setScale(Math.min(scaleX, scaleY, 0.9))
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [viewMode])

  // 手機模式滾動
  useEffect(() => {
    if (viewMode === 'mobile' && mobileContentRef.current) {
      setTimeout(() => {
        if (mobileContentRef.current) {
          const heroHeight = window.innerHeight * 0.7
          mobileContentRef.current.scrollTop = heroHeight - 400
        }
      }, 100)
    }
  }, [viewMode])

  // Preview data with icon components
  const processedData = useMemo(
    () => ({
      ...tourData,
      features: (tourData.features || []).map(f => ({
        ...f,
        iconComponent: iconMap[f.icon] || Sparkles,
      })),
    }),
    [tourData]
  )

  const handleVersionChange = useCallback((index: number, versionData?: ItineraryVersionRecord) => {
    setCurrentVersionIndex(index)
    if (versionData) {
      setTourData(prev => ({
        ...prev,
        dailyItinerary: (versionData.daily_itinerary || []) as unknown as DailyItinerary[],
        features: (versionData.features || prev.features) as unknown as Feature[],
        focusCards: (versionData.focus_cards || prev.focusCards) as unknown as FocusCard[],
      }))
    }
  }, [])

  const handleVersionRecordsChange = useCallback((records: ItineraryVersionRecord[]) => {
    // version records are managed by PublishButton
  }, [])

  // 建立新展示行程
  const handleCreate = async (type: EditorMode) => {
    setMode(type)
    if (!linkedItinerary) {
      setTourData(buildDefaultFromTour(tour))
    }
  }

  // 如果沒有展示行程，顯示建立入口
  if (!linkedItinerary && mode !== 'web' && mode !== 'print') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="text-center space-y-2">
          <Globe className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-muted-foreground">尚未建立展示行程</h3>
          <p className="text-sm text-muted-foreground">
            展示行程是給客人看的精美行程頁面，可分享連結或列印
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handleCreate('web')} className="gap-2">
            <Monitor className="w-4 h-4" />
            建立網頁版行程
          </Button>
          <Button variant="soft-gold" onClick={() => handleCreate('print')} className="gap-2">
            <Printer className="w-4 h-4" />
            建立紙本行程
          </Button>
        </div>
      </div>
    )
  }

  // 紙本行程編輯器
  if (mode === 'print') {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* 工具列 */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('web')} className="gap-1">
              <Monitor className="w-4 h-4" />
              網頁版
            </Button>
            <Button variant="secondary" size="sm" className="gap-1">
              <Printer className="w-4 h-4" />
              紙本版
            </Button>
          </div>
          <Button size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="w-4 h-4" />
            列印
          </Button>
        </div>

        {/* 雙欄編輯器 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側：表單 */}
          <div className="w-1/2 border-r flex flex-col print:hidden">
            <div className="h-12 bg-morandi-green/90 text-white px-6 flex items-center">
              <h2 className="text-sm font-semibold">編輯表單</h2>
            </div>
            <div className="flex-1 overflow-y-auto bg-card">
              <PrintItineraryForm data={printData} onChange={setPrintData} />
            </div>
          </div>

          {/* 右側：預覽 */}
          <div className="w-1/2 bg-morandi-container flex flex-col print:w-full">
            <div className="h-12 bg-card border-b px-6 flex items-center justify-between print:hidden">
              <h2 className="text-sm font-semibold text-muted-foreground">列印預覽</h2>
              <span className="text-xs text-muted-foreground">A4 (210mm x 297mm)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-8 print:p-0">
              <PrintItineraryPreview data={printData} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 網頁版行程編輯器
  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* 工具列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          {/* 模式切換 */}
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" className="gap-1">
              <Monitor className="w-4 h-4" />
              網頁版
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('print')} className="gap-1">
              <Printer className="w-4 h-4" />
              紙本版
            </Button>
          </div>

          {/* 狀態 */}
          {linkedItinerary && (
            <Badge
              variant={linkedItinerary.status === TOUR_STATUS.UPCOMING ? 'default' : 'secondary'}
            >
              {linkedItinerary.status || '草稿'}
            </Badge>
          )}
        </div>

        {/* 發布按鈕 */}
        <PublishButton
          data={{
            ...tourData,
            id: linkedItinerary?.id,
            status: linkedItinerary?.status || '草稿',
            tourId: tour.id,
            version_records: linkedItinerary?.version_records as
              | ItineraryVersionRecord[]
              | undefined,
          }}
          currentVersionIndex={currentVersionIndex}
          onVersionChange={handleVersionChange}
          onVersionRecordsChange={handleVersionRecordsChange}
          onCreated={async newId => {
            // 嵌入在 tour 分頁時不能被 router.replace 導走；改成回寫 tours.itinerary_id
            try {
              await updateTour(tour.id, { itinerary_id: newId })
              toast.success('展示行程已建立')
            } catch (error) {
              logger.error('展示行程建立後回寫 tours.itinerary_id 失敗:', error)
            }
          }}
        />
      </div>

      {/* 雙欄編輯器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：表單 */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="h-12 bg-morandi-gold/90 text-white px-6 flex items-center">
            <h2 className="text-sm font-semibold">編輯表單</h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-card">
            <TourForm
              data={{
                ...tourData,
                // SSOT：每次 render 都用 tour 真值蓋掉，無視 tourData/itinerary 內的副本
                country: countryName,
                city: tour.airport_code || '',
                meetingPoints: tourData.meetingPoints || [{ time: '', location: '' }],
                hotels: tourData.hotels || [],
                showFeatures: tourData.showFeatures !== false,
                showLeaderMeeting: tourData.showLeaderMeeting !== false,
                showHotels: tourData.showHotels || false,
              }}
              onChange={newData => {
                const {
                  // SSOT：忽略 country/city 的回寫，避免污染 tourData
                  country: _ctry,
                  city: _city,
                  meetingPoints: _mp,
                  hotels: _h,
                  showFeatures: _sf,
                  showLeaderMeeting: _sl,
                  showHotels: _sh,
                  ...restData
                } = newData
                setTourData(prev => ({
                  ...prev,
                  ...restData,
                  meetingPoints: newData.meetingPoints,
                  hotels: newData.hotels,
                  showFeatures: newData.showFeatures,
                  showLeaderMeeting: newData.showLeaderMeeting,
                  showHotels: newData.showHotels,
                }))
              }}
            />
          </div>
        </div>

        {/* 右側：預覽 */}
        <div className="w-1/2 bg-card flex flex-col">
          {/* 預覽工具列 */}
          <div className="h-12 bg-card border-b px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">即時預覽</h2>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                    viewMode === 'desktop'
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  電腦
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                    viewMode === 'mobile'
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  手機
                </button>
              </div>
            </div>
          </div>

          {/* 預覽區 */}
          <div className="flex-1 overflow-hidden p-4" ref={containerRef}>
            <div className="w-full h-full flex items-center justify-center">
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
              >
                {viewMode === 'mobile' ? (
                  <div className="relative">
                    <div className="bg-black rounded-[45px] p-[8px] shadow-2xl">
                      <div className="absolute top-[20px] left-1/2 -translate-x-1/2 z-10">
                        <div className="bg-black w-[120px] h-[34px] rounded-full" />
                      </div>
                      <div
                        className="bg-card rounded-[37px] overflow-hidden relative"
                        style={{ width: '390px', height: '844px' }}
                      >
                        <div
                          className="w-full h-full overflow-y-auto"
                          ref={mobileContentRef}
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          <TourPreview data={processedData} viewMode="mobile" />
                        </div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                          <div className="w-32 h-1 bg-morandi-muted rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-card shadow-2xl rounded-lg overflow-hidden"
                    style={{ width: '1200px', height: '800px' }}
                  >
                    <div className="w-full h-full overflow-y-auto">
                      <TourPreview data={processedData} viewMode="desktop" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
