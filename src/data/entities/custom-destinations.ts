'use client'

/**
 * Custom Destinations Entity
 * 客製化景點（支援各城市）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface CustomDestination {
  id: string
  workspace_id: string
  city: string
  name: string
  category?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  tags?: string[] | null
  created_at: string
  updated_at?: string | null
}

export const customDestinationEntity = createEntityHook<CustomDestination>('custom_destinations', {
  list: {
    select: '*',
    orderBy: { column: 'city', ascending: true },
  },
  slim: {
    select: 'id,city,name,category,tags',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useCustomDestinations = customDestinationEntity.useList
export const useCustomDestinationsSlim = customDestinationEntity.useListSlim
export const useCustomDestination = customDestinationEntity.useDetail
export const useCustomDestinationsPaginated = customDestinationEntity.usePaginated

export const createCustomDestination = customDestinationEntity.create
export const updateCustomDestination = customDestinationEntity.update
export const deleteCustomDestination = customDestinationEntity.delete
export const invalidateCustomDestinations = customDestinationEntity.invalidate
