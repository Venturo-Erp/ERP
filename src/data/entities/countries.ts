'use client'

/**
 * Countries Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Country } from '@/stores/region-store'

const countryEntity = createEntityHook<Country>('countries', {
  list: {
    select:
      'id,name,name_en,code,has_regions,display_order,is_active,created_at,updated_at,region,workspace_id,usage_count',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,code',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
  skipAuditFields: true,
})

export const useCountries = countryEntity.useList
const useCountriesSlim = countryEntity.useListSlim
const useCountry = countryEntity.useDetail
const useCountriesPaginated = countryEntity.usePaginated
const useCountryDictionary = countryEntity.useDictionary

const createCountry = countryEntity.create
export const updateCountry = countryEntity.update
const deleteCountry = countryEntity.delete
export const invalidateCountries = countryEntity.invalidate
