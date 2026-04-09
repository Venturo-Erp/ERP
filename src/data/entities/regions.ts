'use client'

/**
 * Regions Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Region } from '@/stores/region-store'

export const regionEntity = createEntityHook<Region>('regions', {
  list: {
    select:
      'id,country_id,name,name_en,description,display_order,is_active,created_at,updated_at,workspace_id',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,country_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
})

export const useRegions = regionEntity.useList
export const useRegionsSlim = regionEntity.useListSlim
export const useRegion = regionEntity.useDetail
export const useRegionsPaginated = regionEntity.usePaginated
export const useRegionDictionary = regionEntity.useDictionary

export const createRegion = regionEntity.create
export const updateRegion = regionEntity.update
export const deleteRegion = regionEntity.delete
export const invalidateRegions = regionEntity.invalidate
