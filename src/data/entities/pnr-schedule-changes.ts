'use client'

/**
 * PNR Schedule Changes Entity - PNR 航班變更記錄
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrScheduleChange {
  id: string
  pnr_id: string
  change_type: string
  flight_number?: string
  original_departure?: string
  new_departure?: string
  original_arrival?: string
  new_arrival?: string
  reason?: string
  notified?: boolean
  notified_at?: string
  workspace_id?: string
  created_at?: string
  updated_at?: string
}

export const pnrScheduleChangeEntity = createEntityHook<PnrScheduleChange>('pnr_schedule_changes', {
  list: {
    select:
      'id,workspace_id,pnr_id,segment_id,change_type,original_flight_number,original_departure_time,original_arrival_time,original_departure_date,new_flight_number,new_departure_time,new_arrival_time,new_departure_date,requires_revalidation,requires_reissue,requires_refund,status,processed_by,processed_at,notes,detected_at,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,pnr_id,change_type,flight_number,notified',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const usePnrScheduleChanges = pnrScheduleChangeEntity.useList
export const usePnrScheduleChangesSlim = pnrScheduleChangeEntity.useListSlim
export const usePnrScheduleChange = pnrScheduleChangeEntity.useDetail
export const usePnrScheduleChangesPaginated = pnrScheduleChangeEntity.usePaginated
export const usePnrScheduleChangeDictionary = pnrScheduleChangeEntity.useDictionary

export const createPnrScheduleChange = pnrScheduleChangeEntity.create
export const updatePnrScheduleChange = pnrScheduleChangeEntity.update
export const deletePnrScheduleChange = pnrScheduleChangeEntity.delete
export const invalidatePnrScheduleChanges = pnrScheduleChangeEntity.invalidate
