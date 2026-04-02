/**
 * Orders 資料存取層 (Data Access Layer)
 *
 * 將所有 Orders 相關的 Supabase 查詢封裝在此，
 * 實現 UI 與資料邏輯的徹底分離。
 *
 * 🔒 安全修復 2026-01-12：所有查詢都會自動過濾 workspace_id
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import type { Order } from '@/stores/types'
import { logger } from '@/lib/utils/logger'

// ============================================
// 型別定義
// ============================================

export interface GetPaginatedOrdersParams {
  page?: number
  limit?: number
  status?: string
  tourId?: string
  workspaceId?: string // 可選，若未提供則從 session 取得
}

export interface PaginatedOrdersResult {
  orders: Order[]
  count: number
}

// ============================================
// 查詢函式
// ============================================

/**
 * 取得分頁訂單列表
 * 🔒 自動過濾 workspace_id
 */
export async function getPaginatedOrders({
  page = 1,
  limit = 15,
  status,
  tourId,
  workspaceId,
}: GetPaginatedOrdersParams = {}): Promise<PaginatedOrdersResult> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getPaginatedOrders: 未登入')
      return { orders: [], count: 0 }
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('workspace_id', wsId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })

  // 可選篩選條件
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (tourId) {
    query = query.eq('tour_id', tourId)
  }

  // 分頁
  query = query.range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query

  if (error) {
    logger.error('Error fetching orders:', error)
    return { orders: [], count: 0 }
  }

  return {
    orders: (data as Order[]) || [],
    count: count || 0,
  }
}

/**
 * 根據 ID 取得單一訂單
 * 🔒 自動過濾 workspace_id
 */
export async function getOrderById(id: string, workspaceId?: string): Promise<Order | null> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getOrderById: 未登入')
      return null
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id, code, order_number, tour_id, tour_name, customer_id, status, total_amount, paid_amount, remaining_amount, payment_status, contact_person, contact_phone, contact_email, sales_person, assistant, member_count, adult_count, child_count, infant_count, total_people, notes, identity_options, is_active, workspace_id, created_at, created_by, updated_at, updated_by')
    .eq('id', id)
    .eq('workspace_id', wsId) // 🔒 Workspace 過濾
    .single()

  if (error) {
    logger.error('Error fetching order:', error)
    return null
  }

  return data as Order
}

/**
 * 根據 Tour ID 取得所有訂單
 * 🔒 自動過濾 workspace_id
 */
export async function getOrdersByTourId(tourId: string, workspaceId?: string): Promise<Order[]> {
  // 🔒 取得 workspace_id
  let wsId = workspaceId
  if (!wsId) {
    const auth = await getServerAuth()
    if (!auth.success) {
      logger.error('getOrdersByTourId: 未登入')
      return []
    }
    wsId = auth.data.workspaceId
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id, code, order_number, tour_id, tour_name, customer_id, status, total_amount, paid_amount, remaining_amount, payment_status, contact_person, contact_phone, contact_email, sales_person, assistant, member_count, adult_count, child_count, infant_count, total_people, notes, identity_options, is_active, workspace_id, created_at, created_by, updated_at, updated_by')
    .eq('tour_id', tourId)
    .eq('workspace_id', wsId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching orders by tour:', error)
    return []
  }

  return (data as Order[]) || []
}
