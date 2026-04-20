// ============================
// 集中 re-export 所有類型定義
// ============================

// 基礎型別
export type {
  PaymentMethod,
  VisaStatus,
  Todo,
  Payment,
  Company,
  CompanyContact,
  AirportImage,
  AirportImageSeason,
} from './base.types'

// 使用者相關型別
export type { User, Employee } from './user.types'

// 行程相關型別
export type {
  FlightInfo,
  Tour,
  Member,
  TourAddOn,
  TourRefund,
  ItineraryFeature,
  FocusCard,
  LeaderInfo,
  MeetingInfo,
  HotelInfo,
  DailyActivity,
  DailyMeals,
  DailyImage,
  DailyItineraryDay,
  PricingItem,
  PricingDetails,
  ItineraryVersionRecord,
  Itinerary,
  PriceTier,
  FAQ,
} from './tour.types'

// 報價相關型別
export type {
  Order,
  Customer,
  QuoteRegion,
  Quote,
  QuickQuoteItem,
  QuoteCategory,
  QuoteItem,
  Supplier,
  TierPricing,
} from './quote.types'

// 財務相關型別
export type {
  PaymentRequest,
  PaymentRequestCategory,
  CompanyExpenseType,
  PaymentItemCategory,
  PaymentRequestItem,
  TourAllocation,
  DisbursementOrder,
  ReceiptOrder,
  OrderAllocation,
  ReceiptPaymentItem,
  Visa,
  VendorCost,
} from './finance.types'

// 財務常數
export { EXPENSE_TYPE_CONFIG } from './finance.types'

// 系統功能權限清單 - 從統一配置自動生成
export { SYSTEM_PERMISSIONS, FEATURE_PERMISSIONS } from '@/lib/permissions'

// Store 工具型別（重新導出）
export type { CreateInput, UpdateInput } from '../core/types'

// 獎金型別
export { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'

export type {
  TourBonusSetting,
  WorkspaceBonusDefault,
  BonusResult,
  ProfitCalculationResult,
  ProfitTableRow,
} from '@/types/bonus.types'
