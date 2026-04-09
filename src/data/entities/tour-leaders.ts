'use client'

/**
 * Tour Leaders Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourLeader } from '@/types/tour-leader.types'

export const tourLeaderEntity = createEntityHook<TourLeader>('tour_leaders', {
  list: {
    select:
      'id,code,name,english_name,phone,email,address,national_id,passport_number,passport_expiry,languages,specialties,license_number,notes,status,display_order,created_at,updated_at,photo,domestic_phone,overseas_phone',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,name,english_name,phone,status,languages,specialties',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useTourLeaders = tourLeaderEntity.useList
export const useTourLeadersSlim = tourLeaderEntity.useListSlim
export const useTourLeader = tourLeaderEntity.useDetail
export const useTourLeadersPaginated = tourLeaderEntity.usePaginated
export const useTourLeaderDictionary = tourLeaderEntity.useDictionary

export const createTourLeader = tourLeaderEntity.create
export const updateTourLeader = tourLeaderEntity.update
export const deleteTourLeader = tourLeaderEntity.delete
export const invalidateTourLeaders = tourLeaderEntity.invalidate
