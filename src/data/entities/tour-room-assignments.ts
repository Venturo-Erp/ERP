'use client'

/**
 * Tour Room Assignments Entity - 房間分配
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourRoomAssignment {
  id: string
  room_id: string
  order_member_id: string
  bed_number: number | null
  created_at: string | null
  updated_at: string | null
}

export const tourRoomAssignmentEntity = createEntityHook<TourRoomAssignment>(
  'tour_room_assignments',
  {
    list: {
      select: '*',
      orderBy: { column: 'created_at', ascending: true },
    },
    slim: {
      select: 'id,room_id,order_member_id',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.high,
  }
)

export const useTourRoomAssignments = tourRoomAssignmentEntity.useList
export const useTourRoomAssignmentsSlim = tourRoomAssignmentEntity.useListSlim
export const useTourRoomAssignment = tourRoomAssignmentEntity.useDetail
export const useTourRoomAssignmentsPaginated = tourRoomAssignmentEntity.usePaginated
export const useTourRoomAssignmentDictionary = tourRoomAssignmentEntity.useDictionary

export const createTourRoomAssignment = tourRoomAssignmentEntity.create
export const updateTourRoomAssignment = tourRoomAssignmentEntity.update
export const deleteTourRoomAssignment = tourRoomAssignmentEntity.delete
export const invalidateTourRoomAssignments = tourRoomAssignmentEntity.invalidate
