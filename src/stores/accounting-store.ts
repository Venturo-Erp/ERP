import { logger } from '@/lib/utils/logger'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from './auth-store'
import { toast } from 'sonner'

/**
 * 會計系統 Store (Supabase 版本)
 *
 * 說明：
 * 1. 每個員工有自己的帳戶和交易記錄
 * 2. 使用 Supabase 儲存，支援多裝置同步
 * 3. 分類為全局共享（系統預設 + 自定義）
 */

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'credit' | 'investment' | 'other'
  balance: number
  currency: string
  icon?: string
  color?: string
  is_active: boolean
  description?: string
  credit_limit?: number
  available_credit?: number
  created_at: string
  updated_at: string
}

export interface TransactionCategory {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
  icon?: string
  color?: string
  is_system: boolean
  created_at: string
}

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
  // 資料狀態
  accounts: Account[]
  categories: TransactionCategory[]
  transactions: Transaction[]
  transactionsPage: number
  transactionsPageSize: number
  transactionsCount: number
  stats: AccountingStats
  isLoading: boolean

  // 帳戶管理
  fetchAccounts: () => Promise<void>
  createAccount: (
    account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<Account | null>
  updateAccount: (id: string, account: Partial<Account>) => Promise<Account | null>
  deleteAccount: (id: string) => Promise<boolean>

  // 分類管理
  fetchCategories: () => Promise<void>
  createCategory: (
    category: Omit<TransactionCategory, 'id' | 'created_at'>
  ) => Promise<TransactionCategory | null>
  updateCategory: (
    id: string,
    category: Partial<TransactionCategory>
  ) => Promise<TransactionCategory | null>
  deleteCategory: (id: string) => Promise<boolean>

  // 交易記錄
  fetchTransactions: (page?: number) => Promise<void>
  createTransaction: (
    transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<string | null>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  // 統計計算
  calculateStats: () => void

  // 初始化
  initialize: () => Promise<void>
}

export const useAccountingStore = create<AccountingStore>((set, get) => ({
  // 初始資料
  accounts: [],
  categories: [],
  transactions: [],
  transactionsPage: 1,
  transactionsPageSize: 50,
  transactionsCount: 0,
  isLoading: false,

  stats: {
    total_assets: 0,
    total_income: 0,
    total_expense: 0,
    monthly_income: 0,
    monthly_expense: 0,
    net_worth: 0,
    category_breakdown: [],
  },

  // ===== 帳戶管理 =====
  fetchAccounts: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { data, error } = await supabase
      .from('accounting_accounts')
      .select('id, name, type, balance, currency, is_active, description, icon, color, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!error && data) {
      set({ accounts: data as Account[] })
      get().calculateStats()
    }
  },

  createAccount: async accountData => {
    const user = useAuthStore.getState().user
    if (!user) {
      logger.error('[createAccount] 用戶未登入')
      return null
    }

    logger.log('[createAccount] 準備插入資料:', { ...accountData, user_id: user.id })

    const { data, error } = await supabase
      .from('accounting_accounts')
      .insert({
        ...accountData,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('[createAccount] Supabase 錯誤:', error)
      return null
    }

    if (data) {
      logger.log('[createAccount] 成功建立帳戶:', data)
      set(state => ({ accounts: [...state.accounts, data as Account] }))
      get().calculateStats()
      return data as Account
    }

    return null
  },

  updateAccount: async (id, accountData) => {
    const user = useAuthStore.getState().user
    if (!user) return null

    const { data, error } = await supabase
      .from('accounting_accounts')
      .update(accountData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!error && data) {
      set(state => ({
        accounts: state.accounts.map(a => (a.id === id ? (data as Account) : a)),
      }))
      get().calculateStats()
      return data as Account
    }
    return null
  },

  deleteAccount: async id => {
    const user = useAuthStore.getState().user
    if (!user) return false

    // 軟刪除：設為不活躍
    const { error } = await supabase
      .from('accounting_accounts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)

    if (!error) {
      set(state => ({
        accounts: state.accounts.filter(a => a.id !== id),
      }))
      get().calculateStats()
      return true
    }
    return false
  },

  // ===== 分類管理 =====
  fetchCategories: async () => {
    const { data, error } = await supabase
      .from('accounting_categories')
      .select('id, name, type, icon, color, is_system, created_at')
      .order('type', { ascending: true })
      .order('name', { ascending: true })
      .limit(200)

    if (!error && data) {
      set({ categories: data as TransactionCategory[] })
    }
  },

  createCategory: async categoryData => {
    const { data, error } = await supabase
      .from('accounting_categories')
      .insert({
        ...categoryData,
        is_system: false,
      })
      .select()
      .single()

    if (!error && data) {
      set(state => ({ categories: [...state.categories, data as TransactionCategory] }))
      return data as TransactionCategory
    }
    return null
  },

  updateCategory: async (id, categoryData) => {
    const { data, error } = await supabase
      .from('accounting_categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? (data as TransactionCategory) : c)),
      }))
      return data as TransactionCategory
    }
    return null
  },

  deleteCategory: async id => {
    const { error } = await supabase
      .from('accounting_categories')
      .delete()
      .eq('id', id)
      .eq('is_system', false)

    if (!error) {
      set(state => ({
        categories: state.categories.filter(c => c.id !== id),
      }))
      return true
    }
    return false
  },

  // ===== 交易記錄 =====
  fetchTransactions: async (page = 1) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const pageSize = get().transactionsPageSize
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('accounting_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!error && data) {
      set({
        transactions: data as Transaction[],
        transactionsPage: page,
        transactionsCount: count || 0,
      })
      get().calculateStats() // Note: This now calculates stats only for the current page of transactions.
    }
  },

  createTransaction: async transactionData => {
    const user = useAuthStore.getState().user
    if (!user) return null

    const { error } = await supabase.rpc('create_atomic_transaction', {
      p_account_id: transactionData.account_id,
      p_amount: transactionData.amount,
      p_transaction_type: transactionData.type,
      p_description: transactionData.description ?? '',
      p_category_id: transactionData.category_id ?? '',
      p_transaction_date: transactionData.date,
    })

    if (error) {
      logger.error('Error calling create_atomic_transaction RPC:', error)
      return null
    }

    // After a successful RPC call, the data is consistent in the DB.
    // We can refetch to update the UI.
    // A more advanced implementation could optimistically update the UI.
    await get().fetchTransactions()
    await get().fetchAccounts()

    // Since the RPC function doesn't return the new transaction ID,
    // we return a success indicator instead. The UI will update on refetch.
    return 'success'
  },

  updateTransaction: async (id, transactionData) => {
    const user = useAuthStore.getState().user
    if (!user) return

    // Note: Updating a transaction that affects balances should also be an RPC.
    // For now, leaving as-is but highlighting the need for a future 'update_atomic_transaction' RPC.
    const { data, error } = await supabase
      .from('accounting_transactions')
      .update(transactionData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!error && data) {
      set(state => ({
        transactions: state.transactions.map(t => (t.id === id ? (data as Transaction) : t)),
      }))

      // Re-fetch all accounts to ensure balances are correct after an update.
      await get().fetchAccounts()
    }
  },

  deleteTransaction: async id => {
    // Note: Deleting a transaction should also be an RPC to revert balance changes.
    const user = useAuthStore.getState().user
    if (!user) return

    const { error } = await supabase
      .from('accounting_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (!error) {
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
      }))

      // Re-fetch all accounts to ensure balances are correct after a deletion.
      await get().fetchAccounts()
    }
  },

  // ===== 統計計算 =====
  calculateStats: () => {
    const { accounts, transactions, categories } = get()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalAssets = accounts
      .filter(account => account.type !== 'credit' && account.balance > 0)
      .reduce((sum, account) => sum + account.balance, 0)

    const totalDebt = accounts
      .filter(account => account.type === 'credit')
      .reduce((sum, account) => sum + Math.abs(account.balance), 0)

    const netWorth = totalAssets - totalDebt

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyIncome = transactions
      .filter(t => {
        const transactionDate = new Date(t.date)
        return (
          t.type === 'income' &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyExpense = transactions
      .filter(t => {
        const transactionDate = new Date(t.date)
        return (
          t.type === 'expense' &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const categoryTotals = new Map<string, number>()

    transactions
      .filter(t => t.type === 'expense' && t.category_id)
      .forEach(t => {
        const current = categoryTotals.get(t.category_id!) || 0
        categoryTotals.set(t.category_id!, current + t.amount)
      })

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId)
        return {
          category_id: categoryId,
          category_name: category?.name || '未知分類',
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)

    set({
      stats: {
        total_assets: totalAssets,
        total_income: totalIncome,
        total_expense: totalExpense,
        monthly_income: monthlyIncome,
        monthly_expense: monthlyExpense,
        net_worth: netWorth,
        category_breakdown: categoryBreakdown,
      },
    })
  },

  // ===== 初始化 =====
  initialize: async () => {
    set({ isLoading: true })
    await Promise.all([get().fetchCategories(), get().fetchAccounts(), get().fetchTransactions()])
    set({ isLoading: false })
  },
}))
