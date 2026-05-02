/**
 * 會計模組型別定義
 * 建立日期：2025-01-17
 *
 * 注意：VoucherStatus 已統一從 accounting.types.ts 匯入
 * 統一使用 'draft' | 'posted' | 'reversed' | 'locked'
 */

import type { BaseEntity } from './base.types'
import type { VoucherStatus } from './accounting.types'

// ============================================
// 會計科目 (Chart of Accounts)
// ============================================

/**
 * 會計科目類型
 */
export type AccountingSubjectType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

/**
 * 會計科目
 */
export interface AccountingSubject extends BaseEntity {
  workspace_id?: string | null // NULL = 系統預設科目
  code: string // 科目代碼，如：1101, 1102
  name: string // 科目名稱，如：現金、銀行存款
  type: AccountingSubjectType
  parent_id: string | null // 上層科目 ID
  level: number // 層級：1, 2, 3, 4...
  is_system: boolean // 系統預設科目不可刪除
  is_active: boolean // 是否啟用
  description: string | null
}

// ============================================
// 傳票 (Vouchers)
// ============================================

/**
 * 傳票類型
 */
export type VoucherType = 'manual' | 'auto'

// VoucherStatus 從 accounting.types.ts 匯入（統一定義）
// 'draft' | 'posted' | 'reversed' | 'locked'
export type { VoucherStatus }

/**
 * 傳票來源類型
 */
export type VoucherSourceType =
  | 'payment_request'
  | 'order_payment'
  | 'card_payment'
  | 'tour_closing'
  | 'manual'

/**
 * 傳票主檔
 */
export interface Voucher extends BaseEntity {
  workspace_id: string
  voucher_no: string // 傳票編號，如：V202501001
  voucher_date: string // 傳票日期 (DATE)
  type: VoucherType // 手動 / 自動
  source_type: VoucherSourceType | null // 來源類型
  source_id: string | null // 來源單據 ID
  description: string | null
  total_debit: number // 借方合計
  total_credit: number // 貸方合計
  status: VoucherStatus
  created_by: string | null // 建立人員
  posted_by: string | null // 過帳人員
  posted_at: string | null // 過帳時間
  voided_by: string | null // 作廢人員
  voided_at: string | null // 作廢時間
  void_reason: string | null // 作廢原因
}

// ============================================
// 傳票分錄
// ============================================

/**
 * 傳票分錄
 */
export interface VoucherEntry extends BaseEntity {
  voucher_id: string // 所屬傳票
  entry_no: number // 分錄編號：1, 2, 3...
  subject_id: string // 會計科目
  debit: number // 借方金額
  credit: number // 貸方金額
  description: string | null
}

// ============================================
// 總分類帳 (General Ledger)
// ============================================

/**
 * 總分類帳彙總
 */
export interface GeneralLedger extends BaseEntity {
  workspace_id: string
  subject_id: string // 會計科目
  year: number // 年度
  month: number // 月份 (1-12)
  opening_balance: number // 期初餘額
  total_debit: number // 當月借方
  total_credit: number // 當月貸方
  closing_balance: number // 期末餘額
  updated_at: string
}

// ============================================
// CRUD 資料型別
// ============================================

export type CreateAccountingSubjectData = Omit<AccountingSubject, keyof BaseEntity>
export type UpdateAccountingSubjectData = Partial<CreateAccountingSubjectData>

export type CreateVoucherData = Omit<Voucher, keyof BaseEntity>
export type UpdateVoucherData = Partial<CreateVoucherData>

export type CreateVoucherEntryData = Omit<VoucherEntry, keyof BaseEntity>
export type UpdateVoucherEntryData = Partial<CreateVoucherEntryData>

export type CreateGeneralLedgerData = Omit<GeneralLedger, keyof BaseEntity>
export type UpdateGeneralLedgerData = Partial<CreateGeneralLedgerData>

// ============================================
// 自動產生傳票
// ============================================

/**
 * 自動產生傳票 - 從收款（現金/匯款）
 */
export interface AutoVoucherFromPayment {
  workspace_id: string
  order_id: string // 訂單 ID
  payment_amount: number // 收款金額
  payment_date: string // 收款日期
  payment_method: 'cash' | 'bank' // 收款方式
  bank_account_code?: string // 銀行科目代碼，如：1102-01
  description?: string
}

/**
 * 刷卡收款 meta 資料（V2）
 */
export interface CardPaymentMeta {
  gross_amount: number // 刷卡金額（原始金額）
  fee_rate_total: number // 團成本固定費率 (0.02 = 2%)
  fee_rate_deducted: number // 實扣費率 (0.0168 = 1.68%)
  fee_rate_retained: number // 回饋費率 (0.0032 = 0.32%)
  fee_total: number // 團成本總額 (gross * 2%)
  fee_deducted: number // 銀行實扣金額 (gross * 1.68%)
  fee_retained: number // 公司回饋金額 (gross * 0.32%)
  bank_net: number // 銀行實收金額 (gross - fee_deducted)
}

/**
 * 自動產生傳票 - 從刷卡收款（V2）
 *
 * 分錄：
 * Dr 銀行存款              bank_net
 * Dr 預付團務成本－刷卡成本  fee_total (2%)
 *   Cr 預收團款            gross_amount
 *   Cr 其他收入－刷卡回饋    fee_retained (0.32%)
 */
export interface AutoVoucherFromCardPayment {
  workspace_id: string
  order_id: string // 訂單 ID
  payment_date: string // 收款日期
  bank_account_code?: string // 銀行科目代碼
  description?: string
  // 刷卡相關
  gross_amount: number // 刷卡金額（原始金額）
  fee_rate_deducted: number // 實扣費率 (預設 0.0168)
  fee_rate_total?: number // 團成本固定費率 (預設 0.02)
}

/**
 * 自動產生傳票 - 從付款
 */
export interface AutoVoucherFromPaymentRequest {
  workspace_id: string
  payment_request_id: string // 付款單 ID
  payment_amount: number // 付款金額
  payment_date: string // 付款日期
  supplier_type: 'transportation' | 'accommodation' | 'meal' | 'ticket' | 'insurance' | 'other'
  description?: string
}

/**
 * 自動產生傳票 - 從結團（V2：一張傳票）
 *
 * 分錄：
 * 1. 預收團款 → 團費收入
 * 2. 預付團務成本 → 團務成本（含刷卡成本）
 * 3. 行政費：成本 → 其他收入
 * 4. 12% 代收稅金：成本 → 代收稅金負債
 * 5. 獎金：成本 → 銀行/應付獎金
 */
export interface AutoVoucherFromTourClosing {
  workspace_id: string
  tour_id: string // 團號 ID
  tour_code: string // 團號代碼
  closing_date: string // 結團日期
  // 收入
  total_revenue: number // 預收團款彙總
  // 成本
  costs: {
    transportation: number // 交通費
    accommodation: number // 住宿費
    meal: number // 餐食費
    ticket: number // 門票費
    insurance: number // 保險費
    card_fee: number // 刷卡成本（2%，從預付團務成本－刷卡成本轉列）
    other: number // 其他費用
  }
  // V2 新增欄位
  participants: number // 參加人數
  admin_fee?: number // 行政費（預設 = participants * 10）
  tax_rate?: number // 代收稅金費率（預設 0.12 = 12%）
  bonuses?: {
    sales: number // 業務獎金
    op: number // OP 獎金
    team_performance: number // 團績獎金（進應付）
  }
}

// ============================================
// 查詢參數
// ============================================

/**
 * 傳票查詢參數
 */
export interface VoucherQueryParams {
  workspace_id: string
  start_date?: string
  end_date?: string
  status?: VoucherStatus
  type?: VoucherType
  source_type?: VoucherSourceType
  keyword?: string // 傳票編號或說明
}

/**
 * 總分類帳查詢參數
 */
export interface GeneralLedgerQueryParams {
  workspace_id: string
  subject_id?: string
  year: number
  month?: number
}

// ============================================
// 報表相關
// ============================================

/**
 * 科目餘額
 */
export interface SubjectBalance {
  subject_id: string
  subject_code: string
  subject_name: string
  subject_type: AccountingSubjectType
  balance: number // 餘額或累積金額
  year: number
  month: number
}

/**
 * 財務報表彙總
 */
export interface FinancialStatement {
  workspace_id: string
  year: number
  month: number
  assets: SubjectBalance[] // 資產
  liabilities: SubjectBalance[] // 負債
  equity: SubjectBalance[] // 權益
  revenue: SubjectBalance[] // 收入
  expenses: SubjectBalance[] // 費用
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_revenue: number
  total_expenses: number
  net_profit: number // 淨利 = 收入 - 費用
}
