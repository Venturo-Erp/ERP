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
 */
export async function checkTourDependencies(tourId: string): Promise<TourDependencyCheck> {
  // 1. 先取得該團的所有訂單 ID
  const { data: orderIds } = await supabase
    .from('orders')
    .select('id')
    .eq('tour_id', tourId)

  // 2. 用訂單 ID 查詢真正的團員數
  let memberCount = 0
  if (orderIds && orderIds.length > 0) {
    const ids = orderIds.map(o => o.id)
    const { count } = await supabase
      .from('order_members')
      .select('id', { count: 'exact', head: true })
      .in('order_id', ids)
    memberCount = count ?? 0
  }

  // 3. 檢查其他關聯資料
  const checks = await Promise.all([
    // receipt_orders 沒有 tour_id，用 receipts 表（有 tour_id）
    supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('tour_id', tourId),
    supabase
      .from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', tourId),
    supabase.from('pnrs').select('id', { count: 'exact', head: true }).eq('tour_id', tourId),
  ])

  const [receipts, payments, pnrs] = checks
  const blockers: string[] = []

  // 4. 只有真正有團員時才加入 blocker
  if (memberCount > 0) blockers.push(TOUR_DEPENDENCY_LABELS.MEMBERS_COUNT(memberCount))
  if (receipts.count && receipts.count > 0)
    blockers.push(TOUR_DEPENDENCY_LABELS.RECEIPTS_COUNT(receipts.count))
  if (payments.count && payments.count > 0)
    blockers.push(TOUR_DEPENDENCY_LABELS.PAYMENTS_COUNT(payments.count))
  if (pnrs.count && pnrs.count > 0) blockers.push(TOUR_DEPENDENCY_LABELS.PNRS_COUNT(pnrs.count))

  return { blockers, hasBlockers: blockers.length > 0 }
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
 */
export async function deleteTourEmptyOrders(tourId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('tour_id', tourId)
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
  const { data, error } = await supabase.from('pnrs').select('*').eq('tour_id', tourId).limit(500)
  if (error) {
    logger.error('查詢團 PNR 失敗:', error)
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
    .select('*')
    .in('record_locator', locators)
    .limit(500)
  if (error) {
    logger.error('查詢 PNR 失敗:', error)
    throw error
  }
  return data ?? []
}
