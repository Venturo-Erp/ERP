/**
 * 範本系統類型定義
 *
 * 定義範本的結構和生成器介面
 */
import type { CanvasElement } from '@/features/designer/components/types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

/**
 * 餐食圖標類型（用於手動覆寫自動選擇的圖標）
 */
export type MealIconType =
  | 'bakery_dining' // 麵包/早餐
  | 'flight_class' // 機上餐
  | 'restaurant' // 一般餐廳
  | 'ramen_dining' // 拉麵/日式
  | 'soup_kitchen' // 湯品
  | 'skillet' // 鍋物
  | 'bento' // 便當
  | 'rice_bowl' // 飯類
  | 'coffee' // 咖啡/輕食
  | 'dinner_dining' // 晚餐

/**
 * 時間軸項目（用於當日行程）
 */
export interface TimelineItem {
  time: string // 時間，如：「09:30」
  activity: string // 活動內容
  isHighlight?: boolean // 是否為重點項目（粗體顯示）
}

/**
 * 當日行程詳細資料（用於每日行程頁面）
 */
export interface DailyDetailData {
  dayNumber: number // 1, 2, 3...
  date: string // ISO 日期，如：「2025-01-15」
  title: string // 當日標題
  coverImage?: string // 當日封面圖片
  timeline: TimelineItem[] // 時間軸項目
  meals: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
}

/**
 * 每日行程資料
 */
export interface DailyItinerary {
  dayNumber: number // 1, 2, 3...
  title: string // 行程標題，如：「台北 > 關西機場 > 臨空 Outlet > 飯店入住」
  meals?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
  mealIcons?: {
    breakfast?: MealIconType
    lunch?: MealIconType
    dinner?: MealIconType
  }
  accommodation?: string // 住宿飯店
}

/**
 * 備忘錄項目（單一提醒卡片）
 */
export interface MemoItem {
  id: string // 唯一識別碼，如 'jp-etiquette-1'
  category: 'etiquette' | 'flight' | 'weather' | 'practical' // 分類
  icon: string // Material Symbol 圖標名稱
  title: string // 標題（可為日/韓/泰文）
  titleZh?: string // 中文標題（顯示用）
  content: string // 內容
  enabled: boolean // 是否啟用
}

/**
 * 季節資訊（用於天氣區塊）
 */
export interface SeasonInfo {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  icon: string
  iconColor: string
  months: string
  description: string
  enabled: boolean // 是否啟用
}

/**
 * 備忘錄資訊區塊（WiFi/緊急聯絡等）
 */
export interface MemoInfoItem {
  id: string
  icon: string
  iconColor?: string
  title: string
  content: string
  enabled: boolean
}

/**
 * 備忘錄設定
 */
export interface MemoSettings {
  title: string // 主標題，如「日本旅遊小提醒」
  subtitle: string // 英文副標題
  headerIcon: string // 右上角裝飾圖標
  footerText: string // 頁腳文字
  items: MemoItem[] // 所有備忘錄項目（使用者可勾選啟用）
  seasons?: SeasonInfo[] // 季節資訊（天氣頁用）
  infoItems?: MemoInfoItem[] // 額外資訊區（WiFi/緊急聯絡）
}

/**
 * 國家代碼（ISO 3166-1 alpha-2）
 * 對應資料庫 countries.code 欄位
 */
export type CountryCode = 'JP' | 'TH' | 'KR' | 'VN' | 'CN' | 'HK' | 'TW' | 'GU' | 'OTHER'

/**
 * 飯店資料（用於飯店介紹頁面）
 */
export interface HotelData {
  id: string // 唯一識別碼
  nameZh: string // 中文名稱
  nameEn?: string // 英文名稱
  location?: string // 地點/地址
  description?: string // 特色與描述
  image?: string // 主圖片 URL
  tags?: string[] // 設施標籤，如：['露天溫泉', '懷石料理']
  enabled: boolean // 是否啟用
}

/**
 * 景點資料（用於景點介紹頁面）
 */
export interface AttractionData {
  id: string // 唯一識別碼
  nameZh: string // 中文名稱
  nameEn?: string // 英文名稱
  image?: string // 圖片 URL
  description: string // 介紹文字
  enabled?: boolean // 是否啟用
}

/**
 * 分組類型
 */
export type GroupType = 'vehicle' | 'table'

/**
 * 分車/分桌頁面的欄位顯示設定
 */
export interface VehicleColumnSettings {
  showSeatNumber?: boolean // 顯示座位號
  showOrderCode?: boolean // 顯示訂單編號
  showDestination?: boolean // 顯示目的地/備註
  showDriverInfo?: boolean // 顯示司機資訊
  columnsPerRow?: 1 | 2 | 3 // 每行人數（1=單欄, 2=雙欄, 3=三欄）- 列表模式用
  layoutMode?: 'list' | 'grid' // 排版模式：list=分開列表, grid=表格式（車輛為欄）
}

/**
 * 車輛/分桌資料（用於分車、分桌頁面）
 */
export interface VehicleData {
  id: string // 唯一識別碼
  groupType?: GroupType // 分組類型：vehicle=分車, table=分桌
  vehicleName: string // 名稱（如：1號車、A桌）
  vehicleType?: string // 車型（如：43人座大巴）- 僅分車用
  capacity?: number // 座位數
  licensePlate?: string // 車牌號碼 - 僅分車用
  driverName?: string // 司機姓名 / 桌長姓名
  driverPhone?: string // 司機電話 - 僅分車用
  notes?: string // 備註/目的地
  members: VehicleMemberData[] // 成員
}

/**
 * 車輛成員資料（用於分車頁面）
 */
export interface VehicleMemberData {
  id: string
  chineseName: string | null
  passportName?: string | null
  orderCode?: string | null
  seatNumber?: number | null
}

/**
 * 圖片位置設定
 */
export interface CoverImagePosition {
  x: number // 0-100，水平位置百分比
  y: number // 0-100，垂直位置百分比
  scale: number // 1-3，縮放比例
}

/**
 * 目錄項目（用於目錄編輯）
 */
export interface TocItemData {
  pageId: string // 對應的頁面 ID
  displayName: string // 顯示名稱
  icon: string // 圖標 ID
  enabled: boolean // 是否顯示在目錄
  pageNumber: number // 頁碼（自動計算）
}

/**
 * 目錄內容（用於模板渲染）
 */
export interface TocContentItem {
  name: string // 顯示名稱
  page: number // 頁碼
  icon?: string // 圖標 ID
}

/**
 * 從行程表中傳入的數據
 */
export interface TemplateData {
  coverImage?: string
  coverImagePosition?: CoverImagePosition // 封面圖片位置設定
  destination?: string
  mainTitle?: string
  subtitle?: string
  travelDates?: string
  companyName?: string
  // 可擴展更多欄位
  tourCode?: string
  leaderName?: string
  leaderPhone?: string
  // 行程總覽頁專用
  meetingTime?: string // 集合時間，如：「07:30」
  meetingPlace?: string // 集合地點，如：「桃園機場第二航廈」
  outboundFlight?: string // 去程航班，如：「JL802 08:40-12:40」
  returnFlight?: string // 回程航班，如：「JL805 18:20-20:20」
  dailyItineraries?: DailyItinerary[] // 每日行程（總覽頁用）
  // 當日行程頁專用
  currentDayIndex?: number // 當前正在編輯的天數索引（0-based）
  dailyDetails?: DailyDetailData[] // 每日詳細資料（含封面、時間軸）
  // 備忘錄頁專用
  countryCode?: CountryCode // 國家代碼（決定預設內容）
  memoSettings?: MemoSettings // 備忘錄設定（包含所有項目，使用者可勾選）
  currentMemoPageIndex?: number // 當前正在編輯的備忘錄頁索引（0-based）
  // 飯店介紹頁專用
  hotels?: HotelData[] // 飯店列表
  currentHotelIndex?: number // 當前正在編輯的飯店索引（0-based）
  currentHotelPageIndex?: number // 當前飯店頁索引（多飯店版本用，0-based）
  // 景點介紹頁專用
  attractions?: AttractionData[] // 景點列表
  currentAttractionPageIndex?: number // 當前景點頁索引（0-based）
  // 分車頁專用
  vehicles?: VehicleData[] // 車輛列表（含成員）
  currentVehiclePageIndex?: number // 當前分車頁索引（0-based）
  vehicleColumnSettings?: VehicleColumnSettings // 分車頁欄位顯示設定
  // 目錄頁專用
  tocItems?: TocItemData[] // 目錄編輯項目（用於編輯 UI）
  tocContent?: TocContentItem[] // 目錄內容（用於模板渲染）
  // 備忘錄頁專用（新增頁面時選擇的內容）
  memoPageContent?: {
    items?: MemoItem[]
    seasons?: SeasonInfo[]
    infoItems?: MemoInfoItem[]
    isWeatherPage?: boolean
  }
  // 通用
  currentPageNumber?: number // 當前頁碼

  // COMPANY_NAME_EN 專用
  currentDayData?: DailyDetailData // 當前天數資料（每日行程頁用）
  hotelName?: string // 當天住宿名稱
  cityDescription?: string // 城市介紹文字
  attractionName?: string // 景點名稱
  attractionDescription?: string // 景點介紹
  attractionImage?: string // 景點圖片
  secondaryAttractionName?: string // 次要景點名稱
  secondaryAttractionDescription?: string // 次要景點介紹
  continuedContent?: string // 延續上頁的內容
  memoImage1?: string // 注意事項頁圖片1
  memoImage2?: string // 注意事項頁圖片2
  luggageRules?: Array<{ category: string; rule: string; value: string }> // 行李規定
  prohibitedItems?: Array<{ category: string; items: string }> // 禁帶物品
  liquidRules?: string[] // 液體規定
}

/**
 * 頁面範本定義
 */
export interface PageTemplate {
  id: string // e.g., 'japanese-style-v1'
  name: string // e.g., '日系風格'
  description?: string // 範本描述
  thumbnailUrl: string // 用於選擇器中的預覽圖
  category?:
    | 'cover'
    | 'toc'
    | 'itinerary'
    | 'daily'
    | 'memo'
    | 'hotel'
    | 'hotelMulti'
    | 'attraction'
    | 'vehicle'
    | 'table'
    | 'info'
    | 'general' // 範本類別
  // 核心：一個接收數據並回傳元素陣列的函式
  generateElements: (data: TemplateData) => CanvasElement[]
}

/**
 * 範本選擇器選項
 */
export interface TemplateOption {
  id: string
  name: string
  thumbnailUrl: string
  description?: string
  category?: string
}
