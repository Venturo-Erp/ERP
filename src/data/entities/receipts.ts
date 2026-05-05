'use client'

/**
 * Receipts Entity
 * 收款記錄（明細）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Receipt } from '@/types/receipt.types'
import { supabase } from '@/lib/supabase/client'

const receiptEntity = createEntityHook<Receipt>('receipts', {
  list: {
    // 已移除被 20260503150000 migration drop 的殭屍欄位：
    // amount, total_amount, account_last_digits, transaction_id, sync_status,
    // handler_name, account_info, card_last_four, auth_code, check_number,
    // check_bank, check_date, bank_name, link, linkpay_order_number, email,
    // payment_name, pay_dateline
    //
    // 2026-05-04 補 transferred_pair_id：DB migration 20260503180000 加的、
    // ReceiptTransferDialog 寫得進去、entity hook 漏 SELECT、UI 讀不回 pair 配對失效
    select:
      'id,receipt_number,order_id,order_number,tour_id,tour_name,customer_id,customer_name,actual_amount,receipt_amount,fees,status,payment_method,payment_method_id,payment_methods!fk_receipts_payment_method(name,code),payment_date,receipt_date,receipt_type,receipt_account,confirmed_at,confirmed_by,is_active,workspace_id,created_at,created_by,updated_at,updated_by,notes,batch_id,transferred_pair_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,receipt_number,order_id,actual_amount,status,payment_method,created_at,transferred_pair_id',
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

/**
 * 刪除 receipt 時、自動 cascade pair 對手
 * 收款轉移會建一對 receipts（src amount<0、dst amount>0、共用 transferred_pair_id）
 * 只刪一邊 → 對手變孤兒（pair_id 還在但對手不存在）→ UI 配對失效
 */
export const deleteReceipt = async (id: string) => {
  // 1. 看這筆有沒有 pair_id、有的話找對手 receipts 一起刪
  const { data: row } = await supabase
    .from('receipts')
    .select('transferred_pair_id')
    .eq('id', id)
    .maybeSingle()
  const pairId = (row as { transferred_pair_id?: string } | null)?.transferred_pair_id ?? null

  if (pairId) {
    const { data: pairs } = await supabase
      .from('receipts')
      .select('id')
      .eq('transferred_pair_id', pairId)
    const pairIds = (pairs ?? []).map(r => (r as { id: string }).id).filter(x => x !== id)
    for (const pid of pairIds) {
      await receiptEntity.delete(pid)
    }
  }

  await receiptEntity.delete(id)
}

export const invalidateReceipts = receiptEntity.invalidate
