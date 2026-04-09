'use client'

/**
 * Fleet Vehicles Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { FleetVehicle } from '@/types/fleet.types'

export const fleetVehicleEntity = createEntityHook<FleetVehicle>('fleet_vehicles', {
  list: {
    select:
      '*',
    orderBy: { column: 'license_plate', ascending: true },
  },
  slim: {
    select: 'id,license_plate,vehicle_name,vehicle_type,capacity,status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useFleetVehicles = fleetVehicleEntity.useList
export const useFleetVehiclesSlim = fleetVehicleEntity.useListSlim
export const useFleetVehicle = fleetVehicleEntity.useDetail
export const useFleetVehiclesPaginated = fleetVehicleEntity.usePaginated
export const useFleetVehicleDictionary = fleetVehicleEntity.useDictionary

export const createFleetVehicle = fleetVehicleEntity.create
export const updateFleetVehicle = fleetVehicleEntity.update
export const deleteFleetVehicle = fleetVehicleEntity.delete
export const invalidateFleetVehicles = fleetVehicleEntity.invalidate
