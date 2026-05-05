/**
 * Receipt Service - 收款核心邏輯
 *
 * 所有收款建立、確認、刪除後的統計更新都透過這裡
 * 確保訂單 paid_amount / payment_status 和團 total_revenue / profit 一致
 */

import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'

/**
 * 收款變動後重算訂單和團的統計數據
 * - 只計算 status='confirmed' 且未刪除的收款
 * - 任何收款建立、確認、刪除後都應呼叫
 */
export const recalculateReceiptStats = afterReceiptChange

async function afterReceiptChange(
  orderId: string | null | undefined,
  tourId: string | null | undefined
): Promise<void> {
  if (orderId) {
    await recalculateOrderPayment(orderId)
  }
  if (tourId) {
    await recalculateTourFinancials(tourId)
  }
  await invalidateFinanceCache(tourId)
}

/**
 * 重算訂單的已收金額和付款狀態
 * - 已確認 (confirmed)：actual_amount 全額計入
 * - 已退款 (refunded)：actual_amount − refund_amount（部分退款留剩餘、全退留 0）
 *
 * 2026-05-04 補：原本只算 'confirmed'、退款後整筆從統計消失、部分退款也整筆扣
 */
async function recalculateOrderPayment(orderId: string): Promise<void> {
  // 取得訂單總金額
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('id', orderId)
    .single()

  if (orderError) {
    logger.error('查詢訂單總金額失敗:', orderError)
    throw orderError
  }

  const orderTotalAmount = orderData?.total_amount || 0

  // 抓 confirmed + refunded 兩種狀態、用 actual_amount − refund_amount 算淨額
  const { data: confirmedReceipts, error: receiptsError } = await supabase
    .from('receipts')
    .select('actual_amount, status, refund_amount')
    .eq('order_id', orderId)
    .in('status', ['confirmed', 'refunded'])
    .eq('is_active', true)

  if (receiptsError) {
    logger.error('查詢已確認收款失敗:', receiptsError)
    throw receiptsError
  }

  const totalPaid = (confirmedReceipts || []).reduce((sum, r) => {
    const actual = Number(r.actual_amount) || 0
    if (r.status === 'refunded') {
      return sum + Math.max(0, actual - (Number(r.refund_amount) || 0))
    }
    return sum + actual
  }, 0)

  // 計算付款狀態
  let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid'
  if (totalPaid >= orderTotalAmount && orderTotalAmount > 0) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  const { error } = await supabase
    .from('orders')
    .update({
      paid_amount: totalPaid,
      remaining_amount: Math.max(0, orderTotalAmount - totalPaid),
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    logger.error('更新訂單付款狀態失敗:', error)
    throw error
  }

  logger.log('訂單付款狀態已重算:', {
    order_id: orderId,
    paid_amount: totalPaid,
    payment_status: paymentStatus,
  })
}

/**
 * 重算團的財務數據（總收入和利潤）
 * 只計算 status='confirmed' 且未被刪除的收款
 */
async function recalculateTourFinancials(tourId: string): Promise<void> {
  // 取得該團所有訂單 ID
  const { data: tourOrdersData, error: tourOrdersError } = await supabase
    .from('orders')
    .select('id')
    .eq('tour_id', tourId)

  if (tourOrdersError) {
    logger.error('查詢團訂單失敗:', tourOrdersError)
    throw tourOrdersError
  }

  const orderIds = (tourOrdersData || []).map(o => o.id)

  // 抓 confirmed + refunded 兩種狀態、用 actual_amount − refund_amount 算淨額
  let receiptsQuery = supabase
    .from('receipts')
    .select('actual_amount, status, refund_amount')
    .in('status', ['confirmed', 'refunded'])
    .eq('is_active', true)

  if (orderIds.length > 0) {
    receiptsQuery = receiptsQuery.or(`order_id.in.(${orderIds.join(',')}),tour_id.eq.${tourId}`)
  } else {
    receiptsQuery = receiptsQuery.eq('tour_id', tourId)
  }

  const { data: receiptsData, error: receiptsQueryError } = await receiptsQuery

  if (receiptsQueryError) {
    logger.error('查詢已確認收款失敗:', receiptsQueryError)
    throw receiptsQueryError
  }

  const totalRevenue = (receiptsData || []).reduce((sum, r) => {
    const actual = Number(r.actual_amount) || 0
    if (r.status === 'refunded') {
      return sum + Math.max(0, actual - (Number(r.refund_amount) || 0))
    }
    return sum + actual
  }, 0)

  // 取得當前成本
  const { data: currentTour, error: tourCostError } = await supabase
    .from('tours')
    .select('total_cost')
    .eq('id', tourId)
    .single()

  if (tourCostError) {
    logger.error('查詢團成本失敗:', tourCostError)
    throw tourCostError
  }

  const totalCost = currentTour?.total_cost || 0
  const profit = totalRevenue - totalCost

  const { error } = await supabase
    .from('tours')
    .update({
      total_revenue: totalRevenue,
      profit: profit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tourId)

  if (error) {
    logger.error('更新團財務數據失敗:', error)
    throw error
  }

  logger.log('團財務數據已重算:', {
    tour_id: tourId,
    total_revenue: totalRevenue,
    profit,
  })
}

/**
 * 刷新 SWR 快取
 */
async function invalidateFinanceCache(tourId?: string | null): Promise<void> {
  const { mutate } = await import('swr')

  const promises: Promise<unknown>[] = [mutate('tours'), mutate('orders'), mutate('receipts')]

  if (tourId) {
    promises.push(mutate(`tour-${tourId}`))
  }

  await Promise.all(promises)
}
