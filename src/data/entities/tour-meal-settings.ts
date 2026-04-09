'use client'

/**
 * Tour Meal Settings Entity - 團餐設定
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourMealSetting {
  id: string
  tour_id: string
  meal_type: string
  day_number: number
  restaurant_name: string | null
  enabled: boolean | null
  display_order: number | null
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const tourMealSettingEntity = createEntityHook<TourMealSetting>('tour_meal_settings', {
  list: {
    select:
      'id,tour_id,day_number,meal_type,restaurant_name,enabled,display_order,workspace_id,created_at,updated_at',
    orderBy: { column: 'day_number', ascending: true },
  },
  slim: {
    select: 'id,tour_id,meal_type,day_number,restaurant_name,enabled',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourMealSettings = tourMealSettingEntity.useList
export const useTourMealSettingsSlim = tourMealSettingEntity.useListSlim
export const useTourMealSetting = tourMealSettingEntity.useDetail
export const useTourMealSettingsPaginated = tourMealSettingEntity.usePaginated
export const useTourMealSettingDictionary = tourMealSettingEntity.useDictionary

export const createTourMealSetting = tourMealSettingEntity.create
export const updateTourMealSetting = tourMealSettingEntity.update
export const deleteTourMealSetting = tourMealSettingEntity.delete
export const invalidateTourMealSettings = tourMealSettingEntity.invalidate
