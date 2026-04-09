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
      'id,order_number,code,disbursement_date,payment_request_ids,amount,status,notes,created_by,confirmed_by,confirmed_at,handled_by,handled_at,payment_method,paid_at,pdf_url,workspace_id,created_at,updated_at',
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
