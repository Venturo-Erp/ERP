/**
 * Stores 統一匯出（Zustand-based）
 *
 * ⚠️ 架構說明：
 * - 此檔案使用 Zustand Store（舊架構，向後相容）
 * - 新功能請優先使用 @/data（SWR-based 統一資料層）
 *
 * 清理紀錄 (2026-02-14)：
 * - 移除 19 個零引用的 createStore export
 * - 保留仍有引用的 store：useTourStore, useOrderStore, useQuoteStore, useEmployeeStore, useMemberStore
 * - 保留特殊 store：useAuthStore, useUserStore, useThemeStore, useHomeSettingsStore,
 *   useCalendarStore, useAccountingStore, useWorkspaceStore
 *
 * 遷移狀態 (2026-01-12)：
 * - ✅ TourLeaders: 已遷移到 @/data
 * - ✅ Regions: 已遷移到 @/data (useCountries, useCities)
 * - 🔄 PaymentRequest: 服務層已遷移，hooks 待遷移
 * - ⏳ 其他: 待遷移
 */

import { createStore } from './core/create-store'

// 從 @/types 匯入（使用 types/ 目錄下的標準定義）
import type { Tour, Order, Member, Customer, Employee } from '@/types'

// 從本地 types 匯入
import type {
  PaymentRequest,
  PaymentRequestItem,
  DisbursementOrder,
  Todo,
  Visa,
  Payment,
  Quote,
  QuoteItem,
  Itinerary,
} from './types'

// Supplier 從標準 types 匯入
import type { Supplier } from '@/types/supplier.types'

// ============================================
// 仍有引用的 createStore Stores
// ============================================

/**
 * 旅遊團 Store
 * 🔒 啟用 Workspace 隔離
 */
export const useTourStore = createStore<Tour>({
  tableName: 'tours',
  codePrefix: 'T',
  workspaceScoped: true,
})

/**
 * 訂單 Store
 * 🔒 啟用 Workspace 隔離
 */
export const useOrderStore = createStore<Order>({
  tableName: 'orders',
  workspaceScoped: true,
})

/**
 * 報價單 Store
 * 🔒 啟用 Workspace 隔離
 */
export const useQuoteStore = createStore<Quote>({
  tableName: 'quotes',
  codePrefix: 'Q',
  workspaceScoped: true,
})

/**
 * 團員 Store
 * 無獨立編號，依附於訂單
 * 🔒 啟用 Workspace 隔離
 */
export const useMemberStore = createStore<Member>({
  tableName: 'members',
  workspaceScoped: true,
})

/**
 * 員工 Store
 * ⚠️ 不啟用 Workspace 隔離（全局共享基礎資料）
 */
const useEmployeeStore = createStore<Employee>({
  tableName: 'employees',
  workspaceScoped: false,
})

// ============================================
// 地區型別 re-export（供既有 import 使用）
// ============================================



// ============================================
// 保留的特殊 Stores（認證、UI 狀態）
// ============================================

export { useAuthStore } from './auth-store'


// ============================================
// 暫時保留的複雜 Stores（待重構）
// ============================================



export { useCalendarStore } from './calendar-store'
export { useWorkspaceStore } from './workspace-store'

// ============================================
// 型別匯出（方便使用）
// ============================================



// 企業客戶系統型別
export type { Company,  } from './types'

// 財務收款系統型別
export type {
  Receipt,
  
  
  
  
  
  
  ReceiptItem,
  
  
  
  
  
} from '@/types/receipt.types'

// ============================================
// Store 同步系統
// ============================================






