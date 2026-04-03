'use client'

/**
 * Destinations Entity（景點選擇系統）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Destination } from '@/features/destinations/types'

export const destinationEntity = createEntityHook<Destination>('destinations', {
  list: {
    select: '*',
    orderBy: { column: 'priority', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,category,image_url,priority',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium, // 景點資料變動不頻繁
})

export const useDestinations = destinationEntity.useList
export const useDestinationsSlim = destinationEntity.useListSlim
export const useDestination = destinationEntity.useDetail
export const useDestinationsPaginated = destinationEntity.usePaginated
export const useDestinationDictionary = destinationEntity.useDictionary

export const createDestination = destinationEntity.create
export const updateDestination = destinationEntity.update
export const deleteDestination = destinationEntity.delete
export const invalidateDestinations = destinationEntity.invalidate
