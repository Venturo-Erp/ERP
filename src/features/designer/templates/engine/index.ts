/**
 * 範本引擎
 *
 * 負責根據範本 ID 和行程數據生成完整的 CanvasPage
 */
import { japaneseStyleV1 } from '../definitions/japanese-style-v1'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { japaneseStyleV1Itinerary } from '../definitions/japanese-style-v1-itinerary'
import { japaneseStyleV1Daily } from '../definitions/japanese-style-v1-daily'
import { japaneseStyleV1Memo } from '../definitions/japanese-style-v1-memo'
import { japaneseStyleV1Hotel } from '../definitions/japanese-style-v1-hotel'
import { japaneseStyleV1Toc } from '../definitions/japanese-style-v1-toc'
import { japaneseStyleV1Attraction } from '../definitions/japanese-style-v1-attraction'
import { japaneseStyleV1HotelMulti } from '../definitions/japanese-style-v1-hotel-multi'
import { japaneseStyleV1Vehicle } from '../definitions/japanese-style-v1-vehicle'
import { japaneseStyleV1Table } from '../definitions/japanese-style-v1-table'
// COMPANY_NAME_EN 官方風格
import {
  cornerTravelV1BackCover,
  cornerTravelV1FrontCover,
  cornerTravelV1TocLeft,
  cornerTravelV1TocRight,
} from '../definitions/corner-travel-v1'
import {
  cornerTravelV1DailyLeft,
  cornerTravelV1DailyRight,
} from '../definitions/corner-travel-v1-daily'
import {
  cornerTravelV1MemoLeft,
  cornerTravelV1MemoRight,
} from '../definitions/corner-travel-v1-memo'
import { logger } from '@/lib/utils/logger'
import type {
  PageTemplate,
  TemplateData,
  TemplateOption,
  DailyItinerary,
  DailyDetailData,
  MemoSettings,
  CountryCode,
  HotelData,
  VehicleData,
} from '../definitions/types'
import type { CanvasPage, CanvasElement } from '@/features/designer/components/types'
import type { TimelineItineraryData, TimelineDay } from '@/types/timeline-itinerary.types'

// 備忘錄預設內容（依國家）
export {
  getMemoSettingsByCountry,
  getCountryCodeFromName,
  calculateMemoPageCount,
  getMemoItemsForPage,
  countryNames,
} from '../definitions/country-presets'
export type {
  MemoSettings,
  CountryCode,
  MemoItem,
  SeasonInfo,
  MemoInfoItem,
  HotelData,
  VehicleData,
  TemplateData,
} from '../definitions/types'

// A5 尺寸
// 設計尺寸（模板定義使用，96 DPI）
const A5_DESIGN_WIDTH = 559
const A5_DESIGN_HEIGHT = 794

// 輸出尺寸（300 DPI + 3mm 出血）
const A5_OUTPUT_WIDTH = 1819
const A5_OUTPUT_HEIGHT = 2551

// 縮放比例（輸出尺寸 / 設計尺寸）
const SCALE_FACTOR = A5_OUTPUT_WIDTH / A5_DESIGN_WIDTH // ≈ 3.254

// 範本註冊表
const templateRegistry: Record<string, PageTemplate> = {
  // 日系風格
  [japaneseStyleV1.id]: japaneseStyleV1,
  [japaneseStyleV1Toc.id]: japaneseStyleV1Toc,
  [japaneseStyleV1Itinerary.id]: japaneseStyleV1Itinerary,
  [japaneseStyleV1Daily.id]: japaneseStyleV1Daily,
  [japaneseStyleV1Memo.id]: japaneseStyleV1Memo,
  [japaneseStyleV1Hotel.id]: japaneseStyleV1Hotel,
  [japaneseStyleV1HotelMulti.id]: japaneseStyleV1HotelMulti,
  // COMPANY_NAME_EN 官方風格
  [cornerTravelV1BackCover.id]: cornerTravelV1BackCover,
  [cornerTravelV1FrontCover.id]: cornerTravelV1FrontCover,
  [cornerTravelV1TocLeft.id]: cornerTravelV1TocLeft,
  [cornerTravelV1TocRight.id]: cornerTravelV1TocRight,
  [cornerTravelV1DailyLeft.id]: cornerTravelV1DailyLeft,
  [cornerTravelV1DailyRight.id]: cornerTravelV1DailyRight,
  [cornerTravelV1MemoLeft.id]: cornerTravelV1MemoLeft,
  [cornerTravelV1MemoRight.id]: cornerTravelV1MemoRight,
  [japaneseStyleV1Attraction.id]: japaneseStyleV1Attraction,
  [japaneseStyleV1Vehicle.id]: japaneseStyleV1Vehicle,
  [japaneseStyleV1Table.id]: japaneseStyleV1Table,
  // 未來可以在此處註冊更多範本
  // [modernStyleV1.id]: modernStyleV1,
  // [elegantStyleV1.id]: elegantStyleV1,
}

// 風格系列定義（用於頁面切換）
export interface StyleSeries {
  id: string
  name: string
  templates: {
    cover: string // 封面範本 ID
    backCover?: string // 封底範本 ID（跨頁用）
    toc: string // 目錄範本 ID
    itinerary: string // 行程總覽範本 ID
    daily: string // 當日行程範本 ID
    dailyRight?: string // 當日行程右頁範本 ID（跨頁用）
    memo: string // 備忘錄範本 ID
    memoRight?: string // 備忘錄右頁範本 ID（跨頁用）
    hotel: string // 飯店介紹範本 ID（單一飯店）
    hotelMulti: string // 飯店介紹範本 ID（多飯店）
    attraction: string // 景點介紹範本 ID
    vehicle: string // 分車名單範本 ID
    table: string // 分桌名單範本 ID
  }
}

export const styleSeries: StyleSeries[] = [
  {
    id: 'japanese-style-v1',
    name: '日系風格',
    templates: {
      cover: 'japanese-style-v1',
      toc: 'japanese-style-v1-toc',
      itinerary: 'japanese-style-v1-itinerary',
      daily: 'japanese-style-v1-daily',
      memo: 'japanese-style-v1-memo',
      hotel: 'japanese-style-v1-hotel',
      hotelMulti: 'japanese-style-v1-hotel-multi',
      attraction: 'japanese-style-v1-attraction',
      vehicle: 'japanese-style-v1-vehicle',
      table: 'japanese-style-v1-table',
    },
  },
  {
    id: 'corner-travel-v1',
    name: `${COMPANY_NAME} 官方`,
    templates: {
      cover: 'corner-travel-v1-front-cover', // 封面（右頁）
      backCover: 'corner-travel-v1-back-cover', // 封底（左頁）
      toc: 'corner-travel-v1-toc-left', // 目錄（左頁）
      itinerary: 'corner-travel-v1-toc-right', // 目錄（右頁）
      daily: 'corner-travel-v1-daily-left', // 每日行程（左頁）
      dailyRight: 'corner-travel-v1-daily-right', // 每日行程（右頁）
      memo: 'corner-travel-v1-memo-left', // 注意事項（左頁）
      memoRight: 'corner-travel-v1-memo-right', // 注意事項（右頁）
      hotel: 'japanese-style-v1-hotel',
      hotelMulti: 'japanese-style-v1-hotel-multi',
      attraction: 'japanese-style-v1-attraction',
      vehicle: 'japanese-style-v1-vehicle',
      table: 'japanese-style-v1-table',
    },
  },
]

/**
 * 取得所有可用的範本選項（用於選擇器）
 */
export function getAvailableTemplates(): TemplateOption[] {
  return Object.values(templateRegistry).map(template => ({
    id: template.id,
    name: template.name,
    thumbnailUrl: template.thumbnailUrl,
    description: template.description,
    category: template.category,
  }))
}

/**
 * 根據 ID 取得範本
 */
export function getTemplateById(templateId: string): PageTemplate | null {
  return templateRegistry[templateId] || null
}

/**
 * 縮放單一元素（從設計尺寸到輸出尺寸）
 */
function scaleElement<T extends CanvasElement>(element: T): T {
  const scaled = { ...element } as Record<string, unknown>

  // 縮放位置和尺寸
  scaled.x = (element.x || 0) * SCALE_FACTOR
  scaled.y = (element.y || 0) * SCALE_FACTOR
  if (element.width !== undefined) scaled.width = element.width * SCALE_FACTOR
  if (element.height !== undefined) scaled.height = element.height * SCALE_FACTOR

  // 如果是文字元素，縮放字體大小和相關屬性
  if (element.type === 'text' && 'style' in element) {
    const textElement = element as { style?: { fontSize?: number; letterSpacing?: number } }
    if (textElement.style) {
      scaled.style = {
        ...textElement.style,
        fontSize: (textElement.style.fontSize || 12) * SCALE_FACTOR,
        letterSpacing: (textElement.style.letterSpacing || 0) * SCALE_FACTOR,
      }
    }
  }

  // 如果是形狀元素，縮放邊框寬度和圓角
  if (element.type === 'shape') {
    const shapeElement = element as { strokeWidth?: number; cornerRadius?: number }
    if (shapeElement.strokeWidth) {
      scaled.strokeWidth = shapeElement.strokeWidth * SCALE_FACTOR
    }
    if (shapeElement.cornerRadius) {
      scaled.cornerRadius = shapeElement.cornerRadius * SCALE_FACTOR
    }
  }

  return scaled as T
}

/**
 * 根據範本和行程數據生成一個完整的 CanvasPage 物件
 */
export function generatePageFromTemplate(
  templateId: string,
  itineraryData: TemplateData
): CanvasPage {
  const template = templateRegistry[templateId]

  if (!template) {
    throw new Error(`Template with id "${templateId}" not found.`)
  }

  // 使用範本的生成器函式來創建元素列表（設計尺寸）
  const designElements = template.generateElements(itineraryData)

  // 縮放所有元素到輸出尺寸
  const elements = designElements.map(el => scaleElement(el))

  return {
    id: `page-${crypto.randomUUID()}`,
    name: template.name,
    templateKey: template.category, // 用於識別頁面類型（cover, toc, itinerary 等）
    width: A5_OUTPUT_WIDTH,
    height: A5_OUTPUT_HEIGHT,
    backgroundColor: '#ffffff',
    elements,
  }
}

/**
 * 根據風格系列和行程資料，一次生成完整手冊（封面 + 目錄 + 行程總覽 + 每日行程 + 備忘錄）
 *
 * 這是給「新建手冊」時使用的，讓使用者一開始就能看到完整的模板效果。
 */
export function generateFullBrochure(style: StyleSeries, data: TemplateData): CanvasPage[] {
  const pages: CanvasPage[] = []

  // 1. 封面
  try {
    pages.push(generatePageFromTemplate(style.templates.cover, data))
  } catch (err) {
    // cover is required, but don't crash
    logger.error('[generateFullBrochure] cover failed:', err)
  }

  // 2. 目錄
  try {
    pages.push(generatePageFromTemplate(style.templates.toc, data))
  } catch {
    // optional
  }

  // 3. 行程總覽
  try {
    pages.push(generatePageFromTemplate(style.templates.itinerary, data))
  } catch {
    // optional
  }

  // 4. 每日行程（根據天數）
  const totalDays = data.dailyItineraries?.length || data.dailyDetails?.length || 0
  if (totalDays > 0 && style.templates.daily) {
    for (let i = 0; i < totalDays; i++) {
      try {
        const dayData: TemplateData = {
          ...data,
          currentDayIndex: i,
        }
        const dailyPage = generatePageFromTemplate(style.templates.daily, dayData)
        // 標記 dayIndex
        ;(dailyPage as CanvasPage & { dayIndex?: number }).dayIndex = i
        pages.push(dailyPage)
      } catch {
        // skip failed day
      }
    }
  }

  // 5. 備忘錄
  try {
    pages.push(generatePageFromTemplate(style.templates.memo, data))
  } catch {
    // optional
  }

  return pages
}

// 定義行程表中的 JSON 欄位類型
interface ItineraryLeader {
  name?: string
  domesticPhone?: string
  phone?: string
}

interface ItineraryFlight {
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
}

interface ItineraryMeetingInfo {
  time?: string
  place?: string
  location?: string // 資料庫使用 location 而非 place
}

interface ItineraryDay {
  dayLabel?: string
  title?: string
  date?: string
  meals?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
  accommodation?: string
  activities?: Array<{ title?: string; description?: string }>
}

/**
 * 從行程表資料轉換為 TemplateData
 *
 * 注意：行程表從 Supabase 取得，欄位名使用 snake_case，
 * JSON 欄位（如 daily_itinerary, leader 等）需要特別處理
 */
export function itineraryToTemplateData(itinerary: {
  title?: string
  subtitle?: string
  tour_code?: string
  code?: string // 有些地方用 code
  cover_image?: string
  country?: string
  city?: string
  departure_date?: string
  return_date?: string
  duration_days?: number | null // 行程天數
  // JSON 欄位（Supabase 返回的是 unknown/Json 類型）
  meeting_info?: ItineraryMeetingInfo | null
  leader?: ItineraryLeader | null
  outbound_flight?: ItineraryFlight | null
  return_flight?: ItineraryFlight | null
  daily_itinerary?: ItineraryDay[] | null
}): TemplateData {
  // 組合地點
  const destination = [itinerary.city, itinerary.country].filter(Boolean).join(', ')

  // 組合日期
  let travelDates = ''
  if (itinerary.departure_date) {
    travelDates = itinerary.departure_date
    if (itinerary.return_date && itinerary.return_date !== itinerary.departure_date) {
      travelDates += ` - ${itinerary.return_date}`
    }
  }

  // 解析 JSON 欄位（可能是字串或物件）
  const leader =
    typeof itinerary.leader === 'string'
      ? (JSON.parse(itinerary.leader) as ItineraryLeader)
      : itinerary.leader
  const meetingInfo =
    typeof itinerary.meeting_info === 'string'
      ? (JSON.parse(itinerary.meeting_info) as ItineraryMeetingInfo)
      : itinerary.meeting_info
  const outboundFlightData =
    typeof itinerary.outbound_flight === 'string'
      ? (JSON.parse(itinerary.outbound_flight) as ItineraryFlight)
      : itinerary.outbound_flight
  const returnFlightData =
    typeof itinerary.return_flight === 'string'
      ? (JSON.parse(itinerary.return_flight) as ItineraryFlight)
      : itinerary.return_flight
  const dailyItineraryData =
    typeof itinerary.daily_itinerary === 'string'
      ? (JSON.parse(itinerary.daily_itinerary) as ItineraryDay[])
      : itinerary.daily_itinerary

  // 組合航班資訊
  let outboundFlight = ''
  if (outboundFlightData?.flightNumber) {
    outboundFlight = outboundFlightData.flightNumber
    if (outboundFlightData.departureTime) {
      outboundFlight += ` ${outboundFlightData.departureTime}`
      if (outboundFlightData.departureAirport) {
        outboundFlight += ` (${outboundFlightData.departureAirport})`
      }
    }
    if (outboundFlightData.arrivalTime) {
      outboundFlight += ` ▶ ${outboundFlightData.arrivalTime}`
      if (outboundFlightData.arrivalAirport) {
        outboundFlight += ` (${outboundFlightData.arrivalAirport})`
      }
    }
  }

  let returnFlight = ''
  if (returnFlightData?.flightNumber) {
    returnFlight = returnFlightData.flightNumber
    if (returnFlightData.departureTime) {
      returnFlight += ` ${returnFlightData.departureTime}`
      if (returnFlightData.departureAirport) {
        returnFlight += ` (${returnFlightData.departureAirport})`
      }
    }
    if (returnFlightData.arrivalTime) {
      returnFlight += ` ▶ ${returnFlightData.arrivalTime}`
      if (returnFlightData.arrivalAirport) {
        returnFlight += ` (${returnFlightData.arrivalAirport})`
      }
    }
  }

  // 計算旅遊天數（優先使用 duration_days，必須有行程資料）
  const calculateTotalDays = (): number => {
    // 優先使用 duration_days 欄位
    if (itinerary.duration_days && itinerary.duration_days > 0) {
      return itinerary.duration_days
    }
    // 其次從出發日到回程日計算
    if (itinerary.departure_date && itinerary.return_date) {
      try {
        const startDate = new Date(itinerary.departure_date)
        const endDate = new Date(itinerary.return_date)
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const diffTime = endDate.getTime() - startDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含最後一天
          return Math.max(1, diffDays)
        }
      } catch {
        // 日期解析失敗，繼續往下
      }
    }
    // 沒有天數資料，返回 0（不應該發生，行程應該都有天數）
    return 0
  }

  const totalDays = calculateTotalDays()

  // 轉換每日行程（給行程總覽頁用）
  // 以 duration_days 為準，用現有資料填充，不足的天數補空白
  let dailyItineraries: DailyItinerary[] = []

  if (totalDays > 0) {
    // 先將現有資料轉換成 map，方便查找
    const existingDays = (dailyItineraryData || []).filter(
      (day): day is ItineraryDay => day != null
    )

    // 根據總天數建立每日行程
    dailyItineraries = Array.from({ length: totalDays }, (_, index) => {
      const existingDay = existingDays[index]
      if (existingDay) {
        // 有現有資料就用現有的
        return {
          dayNumber: index + 1,
          title: existingDay.title || `第 ${index + 1} 天`,
          meals: existingDay.meals || { breakfast: '', lunch: '', dinner: '' },
          accommodation: existingDay.accommodation || '',
        }
      } else {
        // 沒有就建立空白
        return {
          dayNumber: index + 1,
          title: `第 ${index + 1} 天`,
          meals: { breakfast: '', lunch: '', dinner: '' },
          accommodation: '',
        }
      }
    })
  } else if (dailyItineraryData && dailyItineraryData.length > 0) {
    // 如果沒有天數但有現有資料，就用現有的
    dailyItineraries = dailyItineraryData
      .filter((day): day is ItineraryDay => day != null)
      .map((day, index) => ({
        dayNumber: index + 1,
        title: day.title || '',
        meals: day.meals,
        accommodation: day.accommodation,
      }))
  }

  // 轉換每日詳細資料（給每日行程頁用）
  // 計算每天的日期
  const calculateDate = (dayIndex: number): string => {
    if (!itinerary.departure_date) return ''
    try {
      const startDate = new Date(itinerary.departure_date)
      if (isNaN(startDate.getTime())) return ''
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + dayIndex)
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const dailyDetails: DailyDetailData[] = (dailyItineraryData || [])
    .filter((day): day is ItineraryDay => day != null)
    .map((day, index) => {
      // 建立時間軸項目（含餐食）
      const timelineItems: Array<{ time: string; activity: string; isHighlight: boolean }> = []
      const activities = day.activities || []
      const meals = day.meals || {}

      // 早餐（如果有）
      if (meals.breakfast) {
        timelineItems.push({
          time: '',
          activity: `[早餐] ${meals.breakfast}`,
          isHighlight: false,
        })
      }

      // 計算午餐插入位置（約在活動的 1/3 處）
      const lunchInsertIndex = Math.ceil(activities.length / 3)

      // 插入活動和午餐
      activities.forEach((activity, actIdx) => {
        // 在適當位置插入午餐
        if (actIdx === lunchInsertIndex && meals.lunch) {
          timelineItems.push({
            time: '',
            activity: `[午餐] ${meals.lunch}`,
            isHighlight: false,
          })
        }

        // 插入活動
        const activityText = activity.title || activity.description || ''
        if (activityText) {
          timelineItems.push({
            time: '',
            activity: activityText,
            isHighlight: false,
          })
        }
      })

      // 如果沒有活動但有午餐，直接加入
      if (activities.length === 0 && meals.lunch) {
        timelineItems.push({
          time: '',
          activity: `[午餐] ${meals.lunch}`,
          isHighlight: false,
        })
      }

      // 晚餐（如果有）
      if (meals.dinner) {
        timelineItems.push({
          time: '',
          activity: `[晚餐] ${meals.dinner}`,
          isHighlight: false,
        })
      }

      return {
        dayNumber: index + 1,
        date: day.date || calculateDate(index),
        title: day.title || '',
        coverImage: undefined, // 需要使用者手動上傳
        timeline: timelineItems,
        meals: {
          breakfast: meals.breakfast || '',
          lunch: meals.lunch || '',
          dinner: meals.dinner || '',
        },
      }
    })

  return {
    coverImage: itinerary.cover_image,
    destination: destination || undefined,
    mainTitle: itinerary.title,
    subtitle: itinerary.subtitle,
    travelDates: travelDates || undefined,
    companyName: {COMPANY_NAME_EN},
    tourCode: itinerary.tour_code || itinerary.code,
    leaderName: leader?.name,
    leaderPhone: leader?.domesticPhone || leader?.phone,
    meetingTime: meetingInfo?.time,
    meetingPlace: meetingInfo?.place || meetingInfo?.location,
    outboundFlight: outboundFlight || undefined,
    returnFlight: returnFlight || undefined,
    dailyItineraries: dailyItineraries.length > 0 ? dailyItineraries : undefined,
    dailyDetails: dailyDetails.length > 0 ? dailyDetails : undefined,
  }
}

/**
 * 從時間軸行程資料轉換為 TemplateData
 * 用於將時間軸行程資料轉換為手冊可用的格式
 */
export function timelineToTemplateData(timeline: TimelineItineraryData): TemplateData {
  // 轉換每日行程（給行程總覽頁用）
  const dailyItineraries: DailyItinerary[] = (timeline.days || [])
    .filter((day): day is TimelineDay => day != null)
    .map(day => ({
      dayNumber: day.dayNumber,
      title: day.title || '',
      meals: {
        breakfast: day.meals?.breakfastMenu || (day.meals?.breakfast ? '飯店早餐' : undefined),
        lunch: day.meals?.lunchMenu || undefined,
        dinner: day.meals?.dinnerMenu || undefined,
      },
      accommodation: day.accommodation,
    }))

  // 轉換每日詳細資料（給每日行程頁用）
  const dailyDetails: DailyDetailData[] = (timeline.days || [])
    .filter((day): day is TimelineDay => day != null)
    .map(day => {
      // 建立時間軸項目（景點 + 餐食）
      const timelineItems: Array<{ time: string; activity: string; isHighlight: boolean }> = []

      // 早餐（如果有）
      if (day.meals?.breakfast) {
        const breakfastText = day.meals.breakfastMenu || '飯店早餐'
        timelineItems.push({
          time: '',
          activity: `[早餐] ${breakfastText}`,
          isHighlight: false,
        })
      }

      // 從景點中取得時間軸項目
      const attractions = day.attractions || []

      // 計算午餐插入位置（約在活動的 1/3 處）
      const lunchInsertIndex = Math.ceil(attractions.length / 3)

      attractions.forEach((attraction, attrIdx) => {
        // 在適當位置插入午餐
        if (attrIdx === lunchInsertIndex && day.meals?.lunch) {
          const lunchText = day.meals.lunchMenu || '當地餐廳'
          timelineItems.push({
            time: '',
            activity: `[午餐] ${lunchText}`,
            isHighlight: false,
          })
        }

        // 判斷此景點是否為餐食
        if (attraction.mealType === 'breakfast') {
          timelineItems.push({
            time: attraction.startTime || '',
            activity: `[早餐] ${attraction.menu || attraction.name}`,
            isHighlight: false,
          })
        } else if (attraction.mealType === 'lunch') {
          timelineItems.push({
            time: attraction.startTime || '',
            activity: `[午餐] ${attraction.menu || attraction.name}`,
            isHighlight: false,
          })
        } else if (attraction.mealType === 'dinner') {
          timelineItems.push({
            time: attraction.startTime || '',
            activity: `[晚餐] ${attraction.menu || attraction.name}`,
            isHighlight: false,
          })
        } else {
          // 一般景點
          const activityText = attraction.name || ''
          if (activityText) {
            timelineItems.push({
              time: attraction.startTime || '',
              activity: activityText,
              isHighlight: false,
            })
          }
        }
      })

      // 如果沒有活動但有午餐，直接加入
      if (attractions.length === 0 && day.meals?.lunch) {
        const lunchText = day.meals.lunchMenu || '當地餐廳'
        timelineItems.push({
          time: '',
          activity: `[午餐] ${lunchText}`,
          isHighlight: false,
        })
      }

      // 晚餐（如果有且不是從景點來的）
      const hasDinnerInAttractions = attractions.some(a => a.mealType === 'dinner')
      if (day.meals?.dinner && !hasDinnerInAttractions) {
        const dinnerText = day.meals.dinnerMenu || '當地餐廳'
        timelineItems.push({
          time: '',
          activity: `[晚餐] ${dinnerText}`,
          isHighlight: false,
        })
      }

      return {
        dayNumber: day.dayNumber,
        date: day.date || '',
        title: day.title || '',
        coverImage: undefined, // 需要使用者手動上傳
        timeline: timelineItems,
        meals: {
          breakfast: day.meals?.breakfastMenu || (day.meals?.breakfast ? '飯店早餐' : ''),
          lunch: day.meals?.lunchMenu || '',
          dinner: day.meals?.dinnerMenu || '',
        },
      }
    })

  // 計算日期區間
  let travelDates = ''
  if (timeline.startDate && timeline.days && timeline.days.length > 0) {
    travelDates = timeline.startDate
    const lastDay = timeline.days[timeline.days.length - 1]
    if (lastDay?.date && lastDay.date !== timeline.startDate) {
      travelDates += ` - ${lastDay.date}`
    }
  }

  return {
    mainTitle: timeline.title,
    subtitle: timeline.subtitle,
    travelDates: travelDates || undefined,
    companyName: {COMPANY_NAME_EN},
    dailyItineraries: dailyItineraries.length > 0 ? dailyItineraries : undefined,
    dailyDetails: dailyDetails.length > 0 ? dailyDetails : undefined,
  }
}

/**
 * 從提案資料轉換為 TemplateData
 */
export function proposalToTemplateData(proposal: {
  title?: string
  code?: string
  destination?: string | null
  expected_start_date?: string | null
  expected_end_date?: string | null
  customer_name?: string | null
  group_size?: number | null
  // 套件資料
  package?: {
    version_name?: string
    start_date?: string | null
    end_date?: string | null
    days?: number | null
  }
}): TemplateData {
  // 組合地點
  const destination = proposal.destination || ''

  // 組合日期（優先用套件日期）
  let travelDates = ''
  const startDate = proposal.package?.start_date || proposal.expected_start_date
  const endDate = proposal.package?.end_date || proposal.expected_end_date
  if (startDate) {
    travelDates = startDate
    if (endDate && endDate !== startDate) {
      travelDates += ` - ${endDate}`
    }
  }

  // 組合標題（提案名稱 + 套件版本）
  let mainTitle = proposal.title || ''
  if (proposal.package?.version_name) {
    mainTitle = `${mainTitle}\n${proposal.package.version_name}`
  }

  return {
    destination: destination || undefined,
    mainTitle: mainTitle || undefined,
    travelDates: travelDates || undefined,
    companyName: {COMPANY_NAME_EN},
    tourCode: proposal.code,
  }
}
