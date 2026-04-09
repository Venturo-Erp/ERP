'use client'

/**
 * Visas Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Visa } from '@/stores/types'

export const visaEntity = createEntityHook<Visa>('visas', {
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,order_id,visa_type,status,submission_date,expected_issue_date',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useVisas = visaEntity.useList
export const useVisasSlim = visaEntity.useListSlim
export const useVisa = visaEntity.useDetail
export const useVisasPaginated = visaEntity.usePaginated
export const useVisaDictionary = visaEntity.useDictionary

export const createVisa = visaEntity.create
export const updateVisa = visaEntity.update
export const deleteVisa = visaEntity.delete
export const invalidateVisas = visaEntity.invalidate
