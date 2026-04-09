'use client'

/**
 * Fleet Schedules Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { FleetSchedule } from '@/types/fleet.types'

export const fleetScheduleEntity = createEntityHook<FleetSchedule>('fleet_schedules', {
  list: {
    select:
      'id,workspace_id,vehicle_id,driver_id,start_date,end_date,client_workspace_id,client_name,tour_id,tour_name,tour_code,contact_person,contact_phone,pickup_location,status,notes,driver_name,driver_phone,created_at,updated_at',
    orderBy: { column: 'start_date', ascending: false },
  },
  slim: {
    select: 'id,vehicle_id,driver_id,start_date,end_date,status,tour_code',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useFleetSchedules = fleetScheduleEntity.useList
export const useFleetSchedulesSlim = fleetScheduleEntity.useListSlim
export const useFleetSchedule = fleetScheduleEntity.useDetail
export const useFleetSchedulesPaginated = fleetScheduleEntity.usePaginated
export const useFleetScheduleDictionary = fleetScheduleEntity.useDictionary

export const createFleetSchedule = fleetScheduleEntity.create
export const updateFleetSchedule = fleetScheduleEntity.update
export const deleteFleetSchedule = fleetScheduleEntity.delete
export const invalidateFleetSchedules = fleetScheduleEntity.invalidate
