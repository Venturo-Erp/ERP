/**
 * Payment Receipt Types
 * 收款單相關型別定義
 *
 * 注意：RECEIPT_TYPES, ReceiptType, RECEIPT_TYPE_OPTIONS 從 @/types/receipt.types re-export
 */

// Re-export 統一的收款類型定義
export { ReceiptType, RECEIPT_TYPE_OPTIONS } from '@/types/receipt.types'

// 相容性別名（建議逐步遷移到 ReceiptType enum）
import { ReceiptType } from '@/types/receipt.types'
export const RECEIPT_TYPES = {
  BANK_TRANSFER: ReceiptType.BANK_TRANSFER,
  CASH: ReceiptType.CASH,
  CREDIT_CARD: ReceiptType.CREDIT_CARD,
  CHECK: ReceiptType.CHECK,
  LINK_PAY: ReceiptType.LINK_PAY,
} as const

export const BANK_ACCOUNTS = [
  { value: '國泰', label: '國泰銀行' },
  { value: '合庫', label: '合作金庫' },
] as const

/**
 * 收款項目
 */
export interface PaymentItem {
  id: string
  receipt_type: ReceiptType
  amount: number
  transaction_date: string

  // 通用欄位
  receipt_account?: string // 付款人姓名
  notes?: string // 備註

  // 公司收款專屬
  accounting_subject_id?: string // 會計科目 ID（公司收款用）

  // LinkPay 專屬
  email?: string
  pay_dateline?: string
  payment_name?: string

  // 現金專屬
  handler_name?: string // 經手人

  // 匯款專屬
  account_info?: string // 匯入帳戶
  fees?: number // 手續費

  // 刷卡專屬
  card_last_four?: string // 卡號後四碼
  auth_code?: string // 授權碼

  // 支票專屬
  check_number?: string // 支票號碼
  check_bank?: string // 開票銀行
  check_date?: string // 兌現日期
}

/**
 * 收款表單資料
 */
export interface PaymentFormData {
  tour_id: string
  order_id: string
  receipt_date: string
  notes?: string
}
