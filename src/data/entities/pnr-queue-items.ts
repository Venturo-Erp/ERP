'use client'

/**
 * PNR Queue Items Entity - PNR 佇列項目
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrQueueItem {
  id: string
  workspace_id?: string
  pnr_id: string
  queue_type: string
  priority?: number
  due_date?: string
  reminder_at?: string
  status: string
  assigned_to?: string
  title?: string
  description?: string
  metadata?: Record<string, unknown>
  completed_at?: string
  completed_by?: string
  resolution_notes?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export const pnrQueueItemEntity = createEntityHook<PnrQueueItem>('pnr_queue_items', {
  list: {
    select:
      '*',
    orderBy: { column: 'due_date', ascending: true },
  },
  slim: {
    select: 'id,pnr_id,queue_type,status,due_date',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const usePnrQueueItems = pnrQueueItemEntity.useList
export const usePnrQueueItemsSlim = pnrQueueItemEntity.useListSlim
export const usePnrQueueItem = pnrQueueItemEntity.useDetail
export const usePnrQueueItemsPaginated = pnrQueueItemEntity.usePaginated
export const usePnrQueueItemDictionary = pnrQueueItemEntity.useDictionary

export const createPnrQueueItem = pnrQueueItemEntity.create
export const updatePnrQueueItem = pnrQueueItemEntity.update
export const deletePnrQueueItem = pnrQueueItemEntity.delete
export const invalidatePnrQueueItems = pnrQueueItemEntity.invalidate
