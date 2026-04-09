'use client'

/**
 * Leader Schedules Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { LeaderSchedule } from '@/types/fleet.types'

export const leaderScheduleEntity = createEntityHook<LeaderSchedule>('leader_schedules', {
  list: {
    select:
      'id,workspace_id,leader_id,start_date,end_date,tour_id,tour_name,tour_code,destination,status,notes,created_at,updated_at,created_by',
    orderBy: { column: 'start_date', ascending: false },
  },
  slim: {
    select: 'id,leader_id,start_date,end_date,status,tour_code',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useLeaderSchedules = leaderScheduleEntity.useList
export const useLeaderSchedulesSlim = leaderScheduleEntity.useListSlim
export const useLeaderSchedule = leaderScheduleEntity.useDetail
export const useLeaderSchedulesPaginated = leaderScheduleEntity.usePaginated
export const useLeaderScheduleDictionary = leaderScheduleEntity.useDictionary

export const createLeaderSchedule = leaderScheduleEntity.create
export const updateLeaderSchedule = leaderScheduleEntity.update
export const deleteLeaderSchedule = leaderScheduleEntity.delete
export const invalidateLeaderSchedules = leaderScheduleEntity.invalidate
