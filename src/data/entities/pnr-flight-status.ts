'use client'

/**
 * PNR Flight Status History Entity - PNR 航班狀態歷史
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrFlightStatusHistory {
  id: string
  pnr_id: string
  flight_number?: string
  status: string
  departure_time?: string
  arrival_time?: string
  delay_minutes?: number
  gate?: string
  terminal?: string
  recorded_at?: string
  workspace_id?: string
  created_at?: string
  updated_at?: string
}

export const pnrFlightStatusHistoryEntity = createEntityHook<PnrFlightStatusHistory>(
  'pnr_flight_status_history',
  {
    list: {
      select: '*',
      orderBy: { column: 'recorded_at', ascending: false },
    },
    slim: {
      select: 'id,pnr_id,flight_number,status,recorded_at',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.high,
  }
)

export const usePnrFlightStatusHistory = pnrFlightStatusHistoryEntity.useList
export const usePnrFlightStatusHistorySlim = pnrFlightStatusHistoryEntity.useListSlim
export const usePnrFlightStatusHistoryDetail = pnrFlightStatusHistoryEntity.useDetail
export const usePnrFlightStatusHistoryPaginated = pnrFlightStatusHistoryEntity.usePaginated
export const usePnrFlightStatusHistoryDictionary = pnrFlightStatusHistoryEntity.useDictionary

export const createPnrFlightStatusHistory = pnrFlightStatusHistoryEntity.create
export const updatePnrFlightStatusHistory = pnrFlightStatusHistoryEntity.update
export const deletePnrFlightStatusHistory = pnrFlightStatusHistoryEntity.delete
export const invalidatePnrFlightStatusHistory = pnrFlightStatusHistoryEntity.invalidate
