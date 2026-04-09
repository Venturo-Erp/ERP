'use client'

/**
 * PNR Fare Alerts Entity - PNR 票價警示
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrFareAlert {
  id: string
  pnr_id: string
  alert_type: string
  threshold_amount?: number
  current_amount?: number
  is_triggered?: boolean
  triggered_at?: string
  is_dismissed?: boolean
  dismissed_at?: string
  dismissed_by?: string
  workspace_id?: string
  created_at?: string
  updated_at?: string
}

export const pnrFareAlertEntity = createEntityHook<PnrFareAlert>('pnr_fare_alerts', {
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,pnr_id,alert_type,is_triggered,is_dismissed',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const usePnrFareAlerts = pnrFareAlertEntity.useList
export const usePnrFareAlertsSlim = pnrFareAlertEntity.useListSlim
export const usePnrFareAlert = pnrFareAlertEntity.useDetail
export const usePnrFareAlertsPaginated = pnrFareAlertEntity.usePaginated
export const usePnrFareAlertDictionary = pnrFareAlertEntity.useDictionary

export const createPnrFareAlert = pnrFareAlertEntity.create
export const updatePnrFareAlert = pnrFareAlertEntity.update
export const deletePnrFareAlert = pnrFareAlertEntity.delete
export const invalidatePnrFareAlerts = pnrFareAlertEntity.invalidate
