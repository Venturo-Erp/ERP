'use client'

/**
 * Disbursement Orders Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { DisbursementOrder } from '@/stores/types'

export const disbursementOrderEntity = createEntityHook<DisbursementOrder>('disbursement_orders', {
  list: {
    select:
      'id,code,amount,payment_method,status,handled_by,handled_at,notes,created_at,updated_at,workspace_id,payment_request_ids,updated_by,order_number,disbursement_date,confirmed_by,confirmed_at,created_by,pdf_url,disbursement_type,refund_id,bank_account_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,code,status,amount,disbursement_date,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useDisbursementOrders = disbursementOrderEntity.useList
export const useDisbursementOrdersSlim = disbursementOrderEntity.useListSlim
export const useDisbursementOrder = disbursementOrderEntity.useDetail
export const useDisbursementOrdersPaginated = disbursementOrderEntity.usePaginated
export const useDisbursementOrderDictionary = disbursementOrderEntity.useDictionary

export const createDisbursementOrder = disbursementOrderEntity.create
export const updateDisbursementOrder = disbursementOrderEntity.update
export const deleteDisbursementOrder = disbursementOrderEntity.delete
export const invalidateDisbursementOrders = disbursementOrderEntity.invalidate
