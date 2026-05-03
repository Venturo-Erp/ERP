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
    // 已移除被 20260503150000 migration drop 的殭屍欄位：
    // amount, total_amount, account_last_digits, transaction_id, sync_status,
    // handler_name, account_info, card_last_four, auth_code, check_number,
    // check_bank, check_date, bank_name, link, linkpay_order_number, email,
    // payment_name, pay_dateline
    select:
      'id,receipt_number,order_id,order_number,tour_id,tour_name,customer_id,customer_name,actual_amount,receipt_amount,fees,status,payment_method,payment_method_id,payment_methods!fk_receipts_payment_method(name,code),payment_date,receipt_date,receipt_type,receipt_account,confirmed_at,confirmed_by,is_active,workspace_id,created_at,created_by,updated_at,updated_by,notes,batch_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,receipt_number,order_id,actual_amount,status,payment_method,created_at',
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
