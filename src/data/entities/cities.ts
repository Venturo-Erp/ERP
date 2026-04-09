'use client'

/**
 * Cities Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { City } from '@/stores/region-store'

export const cityEntity = createEntityHook<City>('cities', {
  list: {
    select:
      '*',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,airport_code,country_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
  skipAuditFields: true,
})

export const useCities = cityEntity.useList
export const useCitiesSlim = cityEntity.useListSlim
export const useCity = cityEntity.useDetail
export const useCitiesPaginated = cityEntity.usePaginated
export const useCityDictionary = cityEntity.useDictionary

export const createCity = cityEntity.create
export const updateCity = cityEntity.update
export const deleteCity = cityEntity.delete
export const invalidateCities = cityEntity.invalidate
