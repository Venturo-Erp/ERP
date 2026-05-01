/**
 * 行程自動生成器 - 類型定義
 * 規則引擎用於一鍵生成行程草稿
 */

import type { Attraction } from '@/features/attractions/types'
import type { DailyItineraryDay, DailyActivity, DailyMeals } from '@/stores/types/tour.types'

// 航班資訊（簡化版，只需要時間）
export interface FlightConstraint {
  arrivalTime: string // 抵達時間 (HH:mm)
  departureTime: string // 出發時間 (HH:mm)
}

// 住宿安排
export interface AccommodationPlan {
  cityId: string // 住宿城市 ID
  cityName: string // 住宿城市名稱（用於顯示）
  nights: number // 住幾晚
}

// 行程風格
export type ItineraryStyle = 'relax' | 'adventure' | 'culture' | 'food'

// 生成請求參數
export interface GenerateItineraryRequest {
  cityId: string // 主要城市 ID（入境城市）
  numDays: number // 天數
  departureDate: string // 出發日期 (YYYY-MM-DD)
  outboundFlight: FlightConstraint // 去程航班
  returnFlight: FlightConstraint // 回程航班
  // 新增：住宿安排
  accommodations?: AccommodationPlan[] // 住宿安排（按順序）
  style?: ItineraryStyle // 行程風格
}

// 生成結果
export interface GenerateItineraryResult {
  success: boolean
  dailyItinerary: DailyItineraryDay[]
  stats: {
    totalAttractions: number // 使用的景點數量
    totalDuration: number // 總行程時間（分鐘）
    attractionsInDb: number // 資料庫中的景點數量
    suggestedRelaxDays: number // 建議放鬆的天數
  }
  warnings: string[] // 警告訊息
}

// 景點分類（用於排程）
type AttractionCategory = '景點' | '餐廳' | '購物' | '交通' | '住宿'

// 帶距離資訊的景點
export interface AttractionWithDistance extends Attraction {
  distanceFromPrevious?: number // 距離上一個景點（公里）
  travelTimeMinutes?: number // 預估車程（分鐘）
}

// 每日時間區塊
export interface DailyTimeSlot {
  dayNumber: number
  date: string // YYYY-MM-DD
  displayDate: string // MM/DD (週幾)
  availableMinutes: number // 可用時間（分鐘）
  startTime: string // 開始時間 (HH:mm)
  endTime: string // 結束時間 (HH:mm)
  isFirstDay: boolean
  isLastDay: boolean
}

// 排程配置
export interface SchedulingConfig {
  // 時間規則
  postArrivalBuffer: number // 降落後緩衝時間（分鐘），預設 60
  preDepartureBuffer: number // 起飛前緩衝時間（分鐘），預設 120
  defaultDayStart: string // 預設每日開始時間，預設 "09:00"
  defaultDayEnd: string // 預設每日結束時間，預設 "20:00"

  // 餐食時間
  lunchTime: string // 午餐時間，預設 "12:00"
  dinnerTime: string // 晚餐時間，預設 "18:30"
  mealDuration: number // 用餐時間（分鐘），預設 60

  // 交通估算
  avgSpeedKmh: number // 平均車速（公里/小時），預設 20（市區包車）
  minTravelTime: number // 最短車程（分鐘），預設 10

  // 距離限制
  maxDistanceKm: number // 最大建議距離（公里），預設 10
}

// 預設配置
export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  postArrivalBuffer: 60, // 降落後 1 小時
  preDepartureBuffer: 120, // 起飛前 2 小時
  defaultDayStart: '09:00',
  defaultDayEnd: '20:00',

  lunchTime: '12:00',
  dinnerTime: '18:30',
  mealDuration: 60,

  avgSpeedKmh: 20, // 市區包車約 20km/h
  minTravelTime: 10,

  maxDistanceKm: 10,
}

// 匯出需要的類型供其他模組使用
export type { DailyItineraryDay, DailyActivity, DailyMeals }
