/**
 * Quotes 資料存取層 (Data Access Layer)
 *
 * 將所有 Quotes 相關的 Supabase 查詢封裝在此，
 * 實現 UI 與資料邏輯的徹底分離。
 *
 * 🔒 安全修復 2026-01-12：所有查詢都會自動過濾 workspace_id
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import type { Quote, Tour } from '@/stores/types'
import { logger } from '@/lib/utils/logger'

// ============================================
// 型別定義
// ============================================

export interface GetPaginatedQuotesParams {
  page?: number
  limit?: number
  status?: string
  workspaceId?: string // 可選，若未提供則從 session 取得
}

export interface PaginatedQuotesResult {
  quotes: Quote[]
  count: number
}

export interface QuotesPageData {
  quotes: Quote[]
  tours: Tour[]
  count: number
}

// ============================================
// 查詢函式
// ============================================

/**
 * 取得分頁報價單列表
 * 🔒 自動過濾 workspace_id
 */
export async function getPaginatedQuotes({
  page = 1,
  limit = 20,
  status,
  workspaceId,
}: GetPaginatedQuotesParams = {}): Promise<PaginatedQuotesResult> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getPaginatedQuotes: 未登入')
      return { quotes: [], count: 0 }
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('quotes')
    .select('*', { count: 'exact' })
    .eq('workspace_id', wsId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })

  // 狀態篩選
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // 分頁
  query = query.range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query

  if (error) {
    logger.error('Error fetching quotes:', error)
    return { quotes: [], count: 0 }
  }

  return {
    quotes: (data as Quote[]) || [],
    count: count || 0,
  }
}

/**
 * 取得報價單頁面所需的所有資料（包含關聯的 Tours）
 * 🔒 自動過濾 workspace_id
 */
export async function getQuotesPageData({
  page = 1,
  limit = 20,
  status,
  workspaceId,
}: GetPaginatedQuotesParams = {}): Promise<QuotesPageData> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getQuotesPageData: 未登入')
      return { quotes: [], tours: [], count: 0 }
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  // 並行查詢報價單和旅遊團
  const [quotesResult, toursResult] = await Promise.all([
    // 報價單查詢
    (async () => {
      let query = supabase
        .from('quotes')
        .select('*', { count: 'exact' })
        .eq('workspace_id', wsId) // 🔒 Workspace 過濾
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      query = query.range((page - 1) * limit, page * limit - 1)

      return query
    })(),

    // 旅遊團查詢（限制 100 筆未結案的）
    supabase
      .from('tours')
      .select('id, code, name, departure_date, return_date, status, closing_status, workspace_id')
      .eq('workspace_id', wsId) // 🔒 Workspace 過濾
      .neq('closing_status', 'closed')
      .order('departure_date', { ascending: false })
      .limit(100),
  ])

  if (quotesResult.error) {
    logger.error('Error fetching quotes:', quotesResult.error)
  }

  if (toursResult.error) {
    logger.error('Error fetching tours:', toursResult.error)
  }

  return {
    quotes: (quotesResult.data as Quote[]) || [],
    tours: (toursResult.data as Tour[]) || [],
    count: quotesResult.count || 0,
  }
}

/**
 * 根據 ID 取得單一報價單
 * 🔒 自動過濾 workspace_id
 */
export async function getQuoteById(id: string, workspaceId?: string): Promise<Quote | null> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getQuoteById: 未登入')
      return null
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('id, tour_id, version, status, quick_quote_items, cost_structure, total_cost, profit_margin, notes, confirmation_status, confirmed_at, confirmed_by, customer_confirmed_at, display_price, is_locked, locked_at, locked_by, overall_margin_percent, workspace_id, created_at, created_by, updated_at, updated_by')
    .eq('id', id)
    .eq('workspace_id', wsId) // 🔒 Workspace 過濾
    .single()

  if (error) {
    logger.error('Error fetching quote:', error)
    return null
  }

  return data as unknown as Quote
}
