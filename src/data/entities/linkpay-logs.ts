'use client'

/**
 * LinkPay Logs Entity
 * LinkPay 付款記錄
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { LinkPayLog } from '@/types/receipt.types'

const linkPayLogEntity = createEntityHook<LinkPayLog>('linkpay_logs', {
  list: {
    select:
      'id,receipt_number,workspace_id,linkpay_order_number,price,end_date,link,status,payment_name,created_at,created_by,updated_at,updated_by,sync_status',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,receipt_number,price,status,link,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useLinkPayLogs = linkPayLogEntity.useList
const useLinkPayLogsSlim = linkPayLogEntity.useListSlim
const useLinkPayLog = linkPayLogEntity.useDetail
const useLinkPayLogsPaginated = linkPayLogEntity.usePaginated
const useLinkPayLogDictionary = linkPayLogEntity.useDictionary

const createLinkPayLog = linkPayLogEntity.create
const updateLinkPayLog = linkPayLogEntity.update
const deleteLinkPayLog = linkPayLogEntity.delete
const invalidateLinkPayLogs = linkPayLogEntity.invalidate
