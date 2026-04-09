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
      select:
        'id,request_id,item_number,category,supplier_id,supplier_name,description,tour_id,tour_request_id,quantity,unitprice,subtotal,payment_method,custom_request_date,sort_order,workspace_id,created_at,created_by,updated_at,updated_by,advanced_by,advanced_by_name',
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
