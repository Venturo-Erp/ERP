'use client'

/**
 * Tour Rooms Entity - 旅遊團房間管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourRoom {
  id: string
  tour_id: string
  room_type: string
  room_number: string | null
  hotel_name: string | null
  night_number: number
  capacity: number
  amount: number | null
  booking_code: string | null
  notes: string | null
  display_order: number | null
  created_at: string | null
  updated_at: string | null
}

export const tourRoomEntity = createEntityHook<TourRoom>('tour_rooms', {
  list: {
    select:
      'id,tour_id,hotel_name,room_type,room_number,capacity,night_number,notes,display_order,created_at,updated_at,booking_code,amount,created_by,updated_by',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,tour_id,room_type,room_number,hotel_name,night_number,capacity,display_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourRooms = tourRoomEntity.useList
export const useTourRoomsSlim = tourRoomEntity.useListSlim
export const useTourRoom = tourRoomEntity.useDetail
export const useTourRoomsPaginated = tourRoomEntity.usePaginated
export const useTourRoomDictionary = tourRoomEntity.useDictionary

export const createTourRoom = tourRoomEntity.create
export const updateTourRoom = tourRoomEntity.update
export const deleteTourRoom = tourRoomEntity.delete
export const invalidateTourRooms = tourRoomEntity.invalidate
