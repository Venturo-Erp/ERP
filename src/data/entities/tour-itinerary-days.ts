'use client'

/**
 * Tour Itinerary Days Entity — 行程每日 metadata
 *
 * 補足 tour_itinerary_items（item-level）缺的 day-level 資料：
 * route/note/blocks/續住 flag/餐食預設。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourItineraryDay } from '@/features/tours/types/tour-itinerary-day.types'

export const tourItineraryDayEntity = createEntityHook<TourItineraryDay>('tour_itinerary_days', {
  workspaceScoped: true,
  list: {
    select:
      'id,tour_id,itinerary_id,workspace_id,day_number,title,route,note,blocks,is_same_accommodation,breakfast_preset,lunch_preset,dinner_preset,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'day_number', ascending: true },
  },
  slim: {
    select: 'id,tour_id,day_number,title,route,is_same_accommodation',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

// Hooks
export const useTourItineraryDays = tourItineraryDayEntity.useList
export const useTourItineraryDay = tourItineraryDayEntity.useDetail

// Actions
export const createTourItineraryDay = tourItineraryDayEntity.create
export const updateTourItineraryDay = tourItineraryDayEntity.update
export const deleteTourItineraryDay = tourItineraryDayEntity.delete
export const invalidateTourItineraryDays = tourItineraryDayEntity.invalidate
