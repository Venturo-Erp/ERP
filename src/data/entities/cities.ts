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
      'id,country_id,region_id,name,name_en,description,timezone,display_order,is_active,created_at,updated_at,airport_code,background_image_url,background_image_url_2,primary_image,is_major,parent_city_id,workspace_id,usage_count',
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
