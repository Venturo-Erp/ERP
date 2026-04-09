'use client'

/**
 * Michelin Restaurants Entity - 米其林餐廳
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface MichelinRestaurant {
  id: string
  name: string
  name_en: string | null
  city_id: string
  country_id: string
  region_id: string | null
  stars: number | null
  bib_gourmand: boolean | null
  cuisine_type: string[] | null
  rating: number | null
  display_order: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}

export const michelinRestaurantEntity = createEntityHook<MichelinRestaurant>(
  'michelin_restaurants',
  {
    list: {
      select: '*',
      orderBy: { column: 'display_order', ascending: true },
    },
    slim: {
      select: 'id,name,city_id,country_id,stars,is_active',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.medium,
    workspaceScoped: false,
  }
)

export const useMichelinRestaurants = michelinRestaurantEntity.useList
export const useMichelinRestaurantsSlim = michelinRestaurantEntity.useListSlim
export const useMichelinRestaurant = michelinRestaurantEntity.useDetail
export const useMichelinRestaurantsPaginated = michelinRestaurantEntity.usePaginated
export const useMichelinRestaurantDictionary = michelinRestaurantEntity.useDictionary

export const createMichelinRestaurant = michelinRestaurantEntity.create
export const updateMichelinRestaurant = michelinRestaurantEntity.update
export const deleteMichelinRestaurant = michelinRestaurantEntity.delete
export const invalidateMichelinRestaurants = michelinRestaurantEntity.invalidate
