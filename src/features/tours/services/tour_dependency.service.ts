/**
 * tour_dependency.service.ts - 旅遊團關聯資料檢查與清理
 *
 * 提供旅遊團刪除前的關聯檢查、斷開連結等操作。
 * 統一了 useTourOperations 和 archive-management 中的重複邏輯。
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { TOUR_DEPENDENCY_LABELS } from '../constants/labels'

export interface TourDependencyCheck {
  blockers: string[]
  hasBlockers: boolean
}

/**
 * 檢查旅遊團是否有不可刪除的關聯資料
 *
 * 業務/財務類子表（有資料 → 擋刪除）：
 *   - receipts（收款）
 *   - payment_requests（請款）
 *   - visas（簽證）
 *   - travel_invoices（發票）
 */
export async function checkTourDependencies(tourId: string): Promise<TourDependencyCheck> {
  const [receipts, payments, visas, invoices] = await Promise.all([
    supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('tour_id', tourId),
    supabase
      .from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', tourId),
    supabase.from('visas').select('id', { count: 'exact', head: true }).eq('tour_id', tourId),
    supabase
      .from('travel_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', tourId),
  ])

  const blockers: string[] = []

  if (receipts.count && receipts.count > 0)
    blockers.push(TOUR_DEPENDENCY_LABELS.RECEIPTS_COUNT(receipts.count))
  if (payments.count && payments.count > 0)
    blockers.push(TOUR_DEPENDENCY_LABELS.PAYMENTS_COUNT(payments.count))
  if (visas.count && visas.count > 0) blockers.push(`簽證 ${visas.count} 筆`)
  if (invoices.count && invoices.count > 0) blockers.push(`發票 ${invoices.count} 張`)

  return { blockers, hasBlockers: blockers.length > 0 }
}

/**
 * 清除旅遊團的配置類關聯資料（UI 設定、排房/排車、確認單等）
 *
 * 注意：Wave 6 Batch 2 把這些 FK 改 RESTRICT、必須在刪 tour 前顯式清掉。
 * 業務/財務類（receipts/payment_requests/visas/travel_invoices）不在這、
 * 有資料時 checkTourDependencies 會擋、不會走到這一步。
 */
export async function deleteTourConfigurationData(tourId: string): Promise<void> {
  const results = await Promise.all([
    supabase.from('designer_drafts').delete().eq('tour_id', tourId),
    supabase.from('folders').delete().eq('tour_id', tourId),
    supabase.from('members').delete().eq('tour_id', tourId),
    supabase.from('tour_addons').delete().eq('tour_id', tourId),
    supabase.from('tour_bonus_settings').delete().eq('tour_id', tourId),
    supabase.from('tour_custom_cost_fields').delete().eq('tour_id', tourId),
    supabase.from('tour_departure_data').delete().eq('tour_id', tourId),
    supabase.from('tour_documents').delete().eq('tour_id', tourId),
    supabase.from('tour_itinerary_days').delete().eq('tour_id', tourId),
    supabase.from('tour_meal_settings').delete().eq('tour_id', tourId),
    supabase.from('tour_member_fields').delete().eq('tour_id', tourId),
    supabase.from('tour_members').delete().eq('tour_id', tourId),
    supabase.from('tour_role_assignments').delete().eq('tour_id', tourId),
    supabase.from('tour_rooms').delete().eq('tour_id', tourId),
    supabase.from('tour_tables').delete().eq('tour_id', tourId),
    supabase.from('tour_vehicles').delete().eq('tour_id', tourId),
  ])
  const failed = results.find(r => r.error)
  if (failed?.error) {
    logger.error('清除旅遊團配置資料失敗:', failed.error)
    throw new Error(`清除旅遊團配置資料失敗：${failed.error.message}`)
  }
}

/**
 * 檢查旅遊團是否有已付款訂單
 */
export async function checkTourPaidOrders(
  tourId: string
): Promise<{ hasPaidOrders: boolean; count: number }> {
  const { data: paidOrders, error } = await supabase
    .from('orders')
    .select('id, payment_status')
    .eq('tour_id', tourId)
    .neq('payment_status', 'unpaid')

  if (error) {
    logger.error('查詢已付款訂單失敗:', error)
    throw error
  }

  return {
    hasPaidOrders: (paidOrders?.length ?? 0) > 0,
    count: paidOrders?.length ?? 0,
  }
}

/**
 * 刪除旅遊團的空訂單（沒有團員的）
 *
 * 注意：Wave 6 Batch 3 把 order_members.order_id 改 RESTRICT、
 * 所以這裡必須真的 filter「沒 members 的 order」、不能 blind delete。
 */
export async function deleteTourEmptyOrders(tourId: string): Promise<void> {
  // 1. 查該團所有 orders
  const { data: allOrders, error: queryError } = await supabase
    .from('orders')
    .select('id')
    .eq('tour_id', tourId)
  if (queryError) {
    logger.error('查詢旅遊團訂單失敗:', queryError)
    throw queryError
  }
  const orderIds = (allOrders ?? []).map(o => o.id)
  if (orderIds.length === 0) return

  // 2. 查哪些 order 有 members
  const { data: membersData, error: memberError } = await supabase
    .from('order_members')
    .select('order_id')
    .in('order_id', orderIds)
  if (memberError) {
    logger.error('查詢團員失敗:', memberError)
    throw memberError
  }
  const ordersWithMembers = new Set((membersData ?? []).map(m => m.order_id as string))
  const emptyOrderIds = orderIds.filter(id => !ordersWithMembers.has(id))

  if (emptyOrderIds.length === 0) return

  // 3. 只刪空訂單
  const { error } = await supabase.from('orders').delete().in('id', emptyOrderIds)
  if (error) {
    logger.error('刪除空訂單失敗:', error)
    throw new Error(TOUR_DEPENDENCY_LABELS.DELETE_EMPTY_ORDER_FAILED(error.message))
  }
}

/**
 * 斷開旅遊團關聯的報價單（不刪除，只解除連結）
 */
export async function unlinkTourQuotes(tourId: string): Promise<number> {
  const { data: linkedQuotes, error: queryError } = await supabase
    .from('quotes')
    .select('id')
    .eq('tour_id', tourId)

  if (queryError) {
    logger.error('查詢關聯報價單失敗:', queryError)
    throw queryError
  }

  if (linkedQuotes && linkedQuotes.length > 0) {
    const { error } = await supabase
      .from('quotes')
      .update({ tour_id: null, status: 'proposed', updated_at: new Date().toISOString() })
      .eq('tour_id', tourId)
    if (error) {
      logger.error('斷開報價單失敗:', error.message)
      throw error
    }
  }

  return linkedQuotes?.length ?? 0
}

/**
 * 刪除旅遊團關聯的行程表
 */
export async function unlinkTourItineraries(tourId: string): Promise<number> {
  const { data: linkedItineraries, error: queryError } = await supabase
    .from('itineraries')
    .select('id')
    .eq('tour_id', tourId)

  if (queryError) {
    logger.error('查詢關聯行程表失敗:', queryError)
    throw queryError
  }

  if (linkedItineraries && linkedItineraries.length > 0) {
    // 先清除 tour_itinerary_items 的 itinerary_id 外鍵（避免 FK constraint）
    const itineraryIds = linkedItineraries.map(i => i.id)
    const { error: unlinkError } = await supabase
      .from('tour_itinerary_items')
      .update({ itinerary_id: null })
      .in('itinerary_id', itineraryIds)
    if (unlinkError) {
      logger.error('解除核心表行程關聯失敗:', unlinkError.message)
      throw unlinkError
    }

    const { error } = await supabase.from('itineraries').delete().eq('tour_id', tourId)
    if (error) {
      logger.error('刪除關聯行程表失敗:', error.message)
      throw error
    }
  }

  return linkedItineraries?.length ?? 0
}

/**
 * 取得旅遊團的 PNR 資料
 */
export async function fetchTourPnrs(tourId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('pnrs')
    .select(
      'id, tour_id, record_locator, status, segments, passenger_names, workspace_id, created_at, updated_at'
    )
    .eq('tour_id', tourId)
    .limit(500)
  if (error) {
    logger.error('查詢團 PNR 失敗:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  }
  return data ?? []
}

/**
 * 根據 record_locator 取得 PNR 資料
 */
export async function fetchPnrsByLocators(locators: string[]): Promise<unknown[]> {
  if (locators.length === 0) return []
  const { data, error } = await supabase
    .from('pnrs')
    .select(
      'id, tour_id, record_locator, status, segments, passenger_names, workspace_id, created_at, updated_at'
    )
    .in('record_locator', locators)
    .limit(500)
  if (error) {
    logger.error('查詢 PNR 失敗:', error)
    throw error
  }
  return data ?? []
}
