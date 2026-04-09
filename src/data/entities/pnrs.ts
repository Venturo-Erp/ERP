'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { PNR } from '@/types/pnr.types'

export const pnrEntity = createEntityHook<PNR>('pnrs', {
  list: {
    select:
      'id,record_locator,workspace_id,employee_id,raw_pnr,passenger_names,ticketing_deadline,cancellation_deadline,segments,special_requests,other_info,status,notes,created_at,updated_at,created_by,updated_by,tour_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,record_locator,tour_id,passenger_names,status,ticketing_deadline,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

// Hooks
export const usePNRs = pnrEntity.useList
export const usePNRsSlim = pnrEntity.useListSlim
export const usePNR = pnrEntity.useDetail
export const usePNRsPaginated = pnrEntity.usePaginated
export const usePNRDictionary = pnrEntity.useDictionary

// Actions
export const createPNR = pnrEntity.create
export const updatePNR = pnrEntity.update
export const deletePNR = pnrEntity.delete
export const invalidatePNRs = pnrEntity.invalidate
