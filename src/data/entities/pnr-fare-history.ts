'use client'

/**
 * PNR Fare History Entity - PNR 票價歷史記錄
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrFareHistory {
  id: string
  pnr_id: string
  fare_amount?: number
  currency?: string
  tax_amount?: number
  total_amount?: number
  fare_basis?: string
  cabin_class?: string
  recorded_at?: string
  workspace_id?: string
  created_at?: string
  updated_at?: string
}

export const pnrFareHistoryEntity = createEntityHook<PnrFareHistory>('pnr_fare_history', {
  list: {
    select:
      'id,workspace_id,pnr_id,fare_basis,currency,base_fare,taxes,total_fare,source,raw_fare_data,recorded_at,recorded_by,created_at',
    orderBy: { column: 'recorded_at', ascending: false },
  },
  slim: {
    select: 'id,pnr_id,total_amount,recorded_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const usePnrFareHistory = pnrFareHistoryEntity.useList
export const usePnrFareHistorySlim = pnrFareHistoryEntity.useListSlim
export const usePnrFareHistoryDetail = pnrFareHistoryEntity.useDetail
export const usePnrFareHistoryPaginated = pnrFareHistoryEntity.usePaginated
export const usePnrFareHistoryDictionary = pnrFareHistoryEntity.useDictionary

export const createPnrFareHistory = pnrFareHistoryEntity.create
export const updatePnrFareHistory = pnrFareHistoryEntity.update
export const deletePnrFareHistory = pnrFareHistoryEntity.delete
export const invalidatePnrFareHistory = pnrFareHistoryEntity.invalidate
