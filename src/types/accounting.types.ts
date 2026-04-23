/**
 * ERP 會計模組類型定義
 */

// ============================================
// 基本類型
// ============================================

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost'

export type VoucherStatus = 'draft' | 'posted' | 'reversed' | 'locked'

export type SubledgerType = 'customer' | 'supplier' | 'bank' | 'group' | 'employee'

// ============================================
// 科目表
// ============================================

export interface Account {
  id: string
  workspace_id: string
  code: string
  name: string
  account_type: AccountType // 資料庫欄位名稱
  type?: AccountType // 向下相容別名
  parent_id: string | null
  is_system_locked: boolean
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
  // 關聯
  children?: Account[]
  parent?: Account
}

// ============================================
// 銀行帳戶
// ============================================

export interface BankAccount {
  id: string
  workspace_id: string
  name: string
  bank_name: string | null
  account_number: string | null
  account_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // 關聯
  account?: Account
}

// ============================================
// 傳票
// ============================================

export interface JournalVoucher {
  id: string
  workspace_id: string
  voucher_no: string
  voucher_date: string
  memo: string | null
  company_unit: string
  event_id: string | null
  status: VoucherStatus
  total_debit: number
  total_credit: number
  created_by: string | null
  created_at: string
  updated_at: string
  // 關聯
  lines?: JournalLine[]
}

export interface JournalLine {
  id: string
  voucher_id: string
  line_no: number
  account_id: string
  subledger_type: SubledgerType | null
  subledger_id: string | null
  description: string | null
  debit_amount: number
  credit_amount: number
  created_at: string | null
  updated_at: string | null
  // 關聯
  account?: Account
}

// ============================================
// 報表類型
// ============================================

export interface AccountBalance {
  account_id: string
  account_code: string
  account_name: string
  account_type: AccountType
  debit_total: number
  credit_total: number
  balance: number
}
