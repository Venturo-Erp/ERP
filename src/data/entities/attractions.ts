'use client'

/**
 * Attractions Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Attraction } from '@/features/attractions/types'

export const attractionEntity = createEntityHook<Attraction>('attractions', {
  list: {
    select:
      '*',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,name,city_id,category,ticket_price',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
})

export const useAttractions = attractionEntity.useList
export const useAttractionsSlim = attractionEntity.useListSlim
export const useAttraction = attractionEntity.useDetail
export const useAttractionsPaginated = attractionEntity.usePaginated
export const useAttractionDictionary = attractionEntity.useDictionary

export const createAttraction = attractionEntity.create
export const updateAttraction = attractionEntity.update
export const deleteAttraction = attractionEntity.delete
export const invalidateAttractions = attractionEntity.invalidate
