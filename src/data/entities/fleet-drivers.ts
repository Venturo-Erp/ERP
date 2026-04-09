'use client'

/**
 * Fleet Drivers Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { FleetDriver } from '@/types/fleet.types'

export const fleetDriverEntity = createEntityHook<FleetDriver>('fleet_drivers', {
  list: {
    select:
      '*',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,name,phone,status,license_type',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useFleetDrivers = fleetDriverEntity.useList
export const useFleetDriversSlim = fleetDriverEntity.useListSlim
export const useFleetDriver = fleetDriverEntity.useDetail
export const useFleetDriversPaginated = fleetDriverEntity.usePaginated
export const useFleetDriverDictionary = fleetDriverEntity.useDictionary

export const createFleetDriver = fleetDriverEntity.create
export const updateFleetDriver = fleetDriverEntity.update
export const deleteFleetDriver = fleetDriverEntity.delete
export const invalidateFleetDrivers = fleetDriverEntity.invalidate
