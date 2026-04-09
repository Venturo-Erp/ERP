'use client'

/**
 * Tour Tables Entity - 團餐桌次管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourTable {
  id: string
  tour_id: string
  meal_setting_id: string
  table_number: number
  capacity: number
  display_order: number | null
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const tourTableEntity = createEntityHook<TourTable>('tour_tables', {
  list: {
    select:
      '*',
    orderBy: { column: 'table_number', ascending: true },
  },
  slim: {
    select: 'id,tour_id,meal_setting_id,table_number,capacity',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourTables = tourTableEntity.useList
export const useTourTablesSlim = tourTableEntity.useListSlim
export const useTourTable = tourTableEntity.useDetail
export const useTourTablesPaginated = tourTableEntity.usePaginated
export const useTourTableDictionary = tourTableEntity.useDictionary

export const createTourTable = tourTableEntity.create
export const updateTourTable = tourTableEntity.update
export const deleteTourTable = tourTableEntity.delete
export const invalidateTourTables = tourTableEntity.invalidate
