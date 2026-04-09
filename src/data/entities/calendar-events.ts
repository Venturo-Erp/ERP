'use client'

/**
 * Calendar Events Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CalendarEvent } from '@/types/calendar.types'

export const calendarEventEntity = createEntityHook<CalendarEvent>('calendar_events', {
  list: {
    select:
      'id,title,description,start,end,all_day,type,color,visibility,related_tour_id,related_order_id,attendees,reminder_minutes,recurring,recurring_until,owner_id,created_at,updated_at,created_by,updated_by,workspace_id',
    orderBy: { column: 'start', ascending: true },
  },
  slim: {
    select: 'id,title,start,end,type,color,visibility,all_day',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useCalendarEvents = calendarEventEntity.useList
export const useCalendarEventsSlim = calendarEventEntity.useListSlim
export const useCalendarEvent = calendarEventEntity.useDetail
export const useCalendarEventsPaginated = calendarEventEntity.usePaginated
export const useCalendarEventDictionary = calendarEventEntity.useDictionary

export const createCalendarEvent = calendarEventEntity.create
export const updateCalendarEvent = calendarEventEntity.update
export const deleteCalendarEvent = calendarEventEntity.delete
export const invalidateCalendarEvents = calendarEventEntity.invalidate
