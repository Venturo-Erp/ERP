import { create } from 'zustand'

/**
 * @deprecated 2026-04-23 — 此 store 是早期「個人記帳 app」遺留
 *
 * 歷史：
 *   - 原本 490 行、對 accounting_accounts / accounting_transactions 做 4+3 處 DB query
 *   - 但這兩張表一直是空的（0 筆）、query 永遠回空、stats 永遠為 0
 *   - 唯一 consumer 是 /finance/page.tsx、它把 stats.total_income / total_expense 當
 *     應收應付顯示、結果一直是 0 沒人發現
 *
 * 本次做法（Wave 13）：
 *   - 砍除所有 DB query、store 變成純 zero-stub、保留對外型別與欄位避免 UI 炸
 *   - /finance/page.tsx 行為完全不變（原本就顯示 0、現在明確知道為什麼 0）
 *   - 後續可安全 drop accounting_accounts / accounting_transactions 兩張死表
 *
 * 未來：
 *   - /finance/page.tsx dashboard 重新設計時、換成真實資料源
 *     （useReceipts / usePaymentRequests 等）、然後整支刪掉
 */

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  account_name?: string
  category_id?: string
  category_name?: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  description?: string
  date: string
  to_account_id?: string
  to_account_name?: string
  created_at: string
  updated_at: string
}

export interface AccountingStats {
  total_assets: number
  total_income: number
  total_expense: number
  monthly_income: number
  monthly_expense: number
  net_worth: number
  category_breakdown: Array<{
    category_id: string
    category_name: string
    amount: number
    percentage: number
  }>
}

interface AccountingStore {
  transactions: Transaction[]
  transactionsPage: number
  transactionsPageSize: number
  transactionsCount: number
  stats: AccountingStats
  isLoading: boolean
  initialize: () => Promise<void>
  fetchTransactions: (page?: number) => Promise<void>
}

const EMPTY_STATS: AccountingStats = {
  total_assets: 0,
  total_income: 0,
  total_expense: 0,
  monthly_income: 0,
  monthly_expense: 0,
  net_worth: 0,
  category_breakdown: [],
}

export const useAccountingStore = create<AccountingStore>(set => ({
  transactions: [],
  transactionsPage: 1,
  transactionsPageSize: 50,
  transactionsCount: 0,
  stats: EMPTY_STATS,
  isLoading: false,
  initialize: async () => {
    // no-op：store 已 deprecated、不再 query DB
  },
  fetchTransactions: async (page?: number) => {
    if (page !== undefined) {
      set({ transactionsPage: page })
    }
  },
}))
