'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourBonusSetting } from '@/types/bonus.types'

export const tourBonusSettingEntity = createEntityHook<TourBonusSetting>('tour_bonus_settings', {
  list: {
    select: '*',
    orderBy: { column: 'type', ascending: true },
  },
  slim: {
    select: 'id,tour_id,type,bonus,bonus_type,employee_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useTourBonusSettings = tourBonusSettingEntity.useList
export const useTourBonusSettingsSlim = tourBonusSettingEntity.useListSlim
export const useTourBonusSetting = tourBonusSettingEntity.useDetail
export const useTourBonusSettingsPaginated = tourBonusSettingEntity.usePaginated
export const useTourBonusSettingDictionary = tourBonusSettingEntity.useDictionary

export const createTourBonusSetting = tourBonusSettingEntity.create
export const updateTourBonusSetting = tourBonusSettingEntity.update
export const deleteTourBonusSetting = tourBonusSettingEntity.delete
export const invalidateTourBonusSettings = tourBonusSettingEntity.invalidate
