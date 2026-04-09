'use client'

/**
 * Tour Itinerary Items Entity — 核心表 CRUD
 *
 * 「一 row 走到底」— 行程項目從建立到領隊回填的完整生命週期
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

export const tourItineraryItemEntity = createEntityHook<TourItineraryItem>('tour_itinerary_items', {
  workspaceScoped: true,
  list: {
    select:
      'id,tour_id,itinerary_id,workspace_id,day_number,sort_order,category,sub_category,title,description,service_date,service_date_end,resource_type,resource_id,resource_name,latitude,longitude,google_maps_url,unit_price,quantity,total_cost,currency,pricing_type,adult_price,child_price,infant_price,quote_note,quote_item_id,supplier_id,supplier_name,request_id,request_status,request_sent_at,quote_status,confirmation_status,leader_status,created_at,updated_at',
    orderBy: { column: 'day_number', ascending: true },
  },
  slim: {
    select:
      'id,tour_id,itinerary_id,day_number,sort_order,category,sub_category,title,service_date,quote_status,confirmation_status,leader_status,request_status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

// Hooks
export const useTourItineraryItems = tourItineraryItemEntity.useList
export const useTourItineraryItemsSlim = tourItineraryItemEntity.useListSlim
export const useTourItineraryItem = tourItineraryItemEntity.useDetail
export const useTourItineraryItemsPaginated = tourItineraryItemEntity.usePaginated
export const useTourItineraryItemDictionary = tourItineraryItemEntity.useDictionary

// Actions
export const createTourItineraryItem = tourItineraryItemEntity.create
export const updateTourItineraryItem = tourItineraryItemEntity.update
export const deleteTourItineraryItem = tourItineraryItemEntity.delete
export const invalidateTourItineraryItems = tourItineraryItemEntity.invalidate
