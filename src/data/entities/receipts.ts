'use client'

/**
 * Receipts Entity
 * 收款記錄（明細）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Receipt } from '@/types/receipt.types'

const receiptEntity = createEntityHook<Receipt>('receipts', {
  list: {
    select:
      'id,receipt_number,order_id,order_number,tour_id,tour_name,customer_id,customer_name,amount,actual_amount,receipt_amount,total_amount,fees,status,payment_method,payment_method_id,payment_date,payment_name,receipt_date,receipt_type,receipt_account,account_info,account_last_digits,auth_code,bank_name,card_last_four,check_bank,check_date,check_number,email,handler_name,linkpay_order_number,pay_dateline,sync_status,transaction_id,confirmed_at,confirmed_by,is_active,workspace_id,created_at,created_by,updated_at,updated_by,notes,batch_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,receipt_number,order_id,amount,status,payment_method,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useReceipts = receiptEntity.useList
const useReceiptsSlim = receiptEntity.useListSlim
const useReceipt = receiptEntity.useDetail
const useReceiptsPaginated = receiptEntity.usePaginated
const useReceiptDictionary = receiptEntity.useDictionary

export const createReceipt = receiptEntity.create
export const updateReceipt = receiptEntity.update
export const deleteReceipt = receiptEntity.delete
export const invalidateReceipts = receiptEntity.invalidate
