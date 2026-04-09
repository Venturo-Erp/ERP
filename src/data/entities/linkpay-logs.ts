'use client'

/**
 * LinkPay Logs Entity
 * LinkPay 付款記錄
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { LinkPayLog } from '@/types/receipt.types'

export const linkPayLogEntity = createEntityHook<LinkPayLog>('linkpay_logs', {
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,receipt_number,price,status,link,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useLinkPayLogs = linkPayLogEntity.useList
export const useLinkPayLogsSlim = linkPayLogEntity.useListSlim
export const useLinkPayLog = linkPayLogEntity.useDetail
export const useLinkPayLogsPaginated = linkPayLogEntity.usePaginated
export const useLinkPayLogDictionary = linkPayLogEntity.useDictionary

export const createLinkPayLog = linkPayLogEntity.create
export const updateLinkPayLog = linkPayLogEntity.update
export const deleteLinkPayLog = linkPayLogEntity.delete
export const invalidateLinkPayLogs = linkPayLogEntity.invalidate
