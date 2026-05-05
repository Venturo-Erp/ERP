'use client'

/**
 * Payment Requests Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { PaymentRequest } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'

const paymentRequestEntity = createEntityHook<PaymentRequest>('payment_requests', {
  list: {
    // 2026-04-23 補 accounting_subject_id / accounting_voucher_id / budget_warning：
    // DB 有這 3 欄、payment_request.service.ts 有 SELECT、entity hook 原本沒、
    // 造成 BatchReceiptDialog 寫入 accounting_subject_id 但其他用 entity hook 的地方
    // 讀不回來；budget_warning service 抓得到、entity hook 抓不到、UI 顯示不同步。
    // 2026-04-24 補 transferred_pair_id：同 batch 還補 accounting_subject_id /
    // accounting_voucher_id / budget_warning（DB 有、entity hook 漏 SELECT）；
    // 漏 transferred_pair_id 會讓 PrintDisbursementPreview 的 pair 過濾跟
    // useCreateDisbursement 的 selectedAmount 算法都讀不到對沖標記。
    select:
      'id,code,request_number,request_date,request_type,request_category,expense_type,tour_id,tour_code,tour_name,order_id,order_number,supplier_id,supplier_name,amount,total_amount,status,is_special_billing,batch_id,notes,payment_method_id,accounting_subject_id,accounting_voucher_id,budget_warning,transferred_pair_id,disbursement_order_id,approved_at,approved_by,paid_at,paid_by,created_by_name,workspace_id,created_at,created_by,updated_at,updated_by,items:payment_request_items(*)',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,code,tour_id,status,total_amount,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const usePaymentRequests = paymentRequestEntity.useList
const usePaymentRequestsSlim = paymentRequestEntity.useListSlim
const usePaymentRequest = paymentRequestEntity.useDetail
const usePaymentRequestsPaginated = paymentRequestEntity.usePaginated
const usePaymentRequestDictionary = paymentRequestEntity.useDictionary

export const createPaymentRequest = paymentRequestEntity.create
export const updatePaymentRequest = paymentRequestEntity.update

/**
 * 刪除 payment_request 時、自動 cascade pair 對手
 * 成本轉移會建一對 PR（src amount<0、dst amount>0、共用 transferred_pair_id）
 * 只刪一邊 → 對手變孤兒（pair_id 還在但對手不存在）→ PrintDisbursementPreview 配對失效
 */
export const deletePaymentRequest = async (id: string) => {
  const { data: row } = await supabase
    .from('payment_requests')
    .select('transferred_pair_id')
    .eq('id', id)
    .maybeSingle()
  const pairId = (row as { transferred_pair_id?: string } | null)?.transferred_pair_id ?? null

  if (pairId) {
    const { data: pairs } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('transferred_pair_id', pairId)
    const pairIds = (pairs ?? []).map(r => (r as { id: string }).id).filter(x => x !== id)
    for (const pid of pairIds) {
      await paymentRequestEntity.delete(pid)
    }
  }

  await paymentRequestEntity.delete(id)
}

export const invalidatePaymentRequests = paymentRequestEntity.invalidate
