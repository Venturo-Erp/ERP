'use client'

/**
 * Payment Request Items Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { PaymentRequestItem } from '@/stores/types'

export const paymentRequestItemEntity = createEntityHook<PaymentRequestItem>(
  'payment_request_items',
  {
    list: {
      // 2026-04-23 移除 tour_request_id：DB schema 沒這個欄位（info_schema 驗證過）、
      // SELECT 包含它會讓整個 query 回「column does not exist」、causing payment_request_items
      // 永遠抓不到、請款單詳情全空。type 層 (finance.types.ts / base.types.ts) 暫保留此欄位
      // 以免誤傷其他用途、未來如確認不需要可一併清除。
      //
      // 2026-04-23 補：confirmation_item_id / notes / transferred_at / transferred_by /
      // transferred_from_tour_id 五欄位 DB 有、原本沒在 SELECT、造成下游 silently 拿到
      // undefined（CostTransferDialog 寫入但讀不回、PrintDisbursement 過濾失效等）。
      select:
        'id,request_id,item_number,category,supplier_id,supplier_name,description,tour_id,quantity,unitprice,subtotal,payment_method,payment_method_id,custom_request_date,sort_order,workspace_id,created_at,created_by,updated_at,updated_by,advanced_by,advanced_by_name,notes,confirmation_item_id,transferred_at,transferred_by,transferred_from_tour_id',
      orderBy: { column: 'sort_order', ascending: true },
    },
    slim: {
      select: 'id,request_id,item_number,category,supplier_name,subtotal',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.medium,
  }
)

export const usePaymentRequestItems = paymentRequestItemEntity.useList
export const usePaymentRequestItemsSlim = paymentRequestItemEntity.useListSlim
export const usePaymentRequestItem = paymentRequestItemEntity.useDetail
export const usePaymentRequestItemsPaginated = paymentRequestItemEntity.usePaginated
export const usePaymentRequestItemDictionary = paymentRequestItemEntity.useDictionary

export const createPaymentRequestItem = paymentRequestItemEntity.create
export const updatePaymentRequestItem = paymentRequestItemEntity.update
export const deletePaymentRequestItem = paymentRequestItemEntity.delete
export const invalidatePaymentRequestItems = paymentRequestItemEntity.invalidate
