'use client'

/**
 * Restaurants Entity（餐廳選擇系統）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Restaurant } from '@/features/restaurants/types'

export const restaurantEntity = createEntityHook<Restaurant>('restaurants', {
  list: {
    select: '*',
    orderBy: { column: 'priority', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,category,price_range,must_try_dish,image_url,priority',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium, // 餐廳資料變動不頻繁
})

export const useRestaurants = restaurantEntity.useList
export const useRestaurantsSlim = restaurantEntity.useListSlim
export const useRestaurant = restaurantEntity.useDetail
export const useRestaurantsPaginated = restaurantEntity.usePaginated
export const useRestaurantDictionary = restaurantEntity.useDictionary

export const createRestaurant = restaurantEntity.create
export const updateRestaurant = restaurantEntity.update
export const deleteRestaurant = restaurantEntity.delete
export const invalidateRestaurants = restaurantEntity.invalidate
