'use client'

/**
 * Regions Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Region } from '@/stores/region-store'

const regionEntity = createEntityHook<Region>('regions', {
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
const useRegionsSlim = regionEntity.useListSlim
const useRegion = regionEntity.useDetail
const useRegionsPaginated = regionEntity.usePaginated
const useRegionDictionary = regionEntity.useDictionary

const createRegion = regionEntity.create
const updateRegion = regionEntity.update
const deleteRegion = regionEntity.delete
const invalidateRegions = regionEntity.invalidate
