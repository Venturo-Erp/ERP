'use client'

/**
 * Tour Vehicles Entity - 旅遊團車輛管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type TourVehicleRow = Database['public']['Tables']['tour_vehicles']['Row']

export interface TourVehicle {
  id: string
  tour_id: string
  vehicle_name: string
  vehicle_type: string | null
  capacity: number
  display_order: number | null
  driver_name: string | null
  driver_phone: string | null
  license_plate: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export const tourVehicleEntity = createEntityHook<TourVehicle>('tour_vehicles', {
  list: {
    select:
      'id,tour_id,vehicle_name,vehicle_type,capacity,display_order,driver_name,driver_phone,license_plate,notes,created_at,updated_at',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,tour_id,vehicle_name,vehicle_type,capacity,driver_name,license_plate,display_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourVehicles = tourVehicleEntity.useList
export const useTourVehiclesSlim = tourVehicleEntity.useListSlim
export const useTourVehicle = tourVehicleEntity.useDetail
export const useTourVehiclesPaginated = tourVehicleEntity.usePaginated
export const useTourVehicleDictionary = tourVehicleEntity.useDictionary

export const createTourVehicle = tourVehicleEntity.create
export const updateTourVehicle = tourVehicleEntity.update
export const deleteTourVehicle = tourVehicleEntity.delete
export const invalidateTourVehicles = tourVehicleEntity.invalidate
