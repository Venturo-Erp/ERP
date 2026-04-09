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
      'id,created_at,updated_at,applicant_name,contact_person,contact_phone,visa_type,country,status,submission_date,received_date,pickup_date,order_id,order_number,tour_id,code,fee,cost,notes,created_by,is_active,workspace_id,updated_by,vendor,documents_returned_date,expected_issue_date,actual_submission_date,is_urgent',
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
