'use client'

/**
 * Notes Entity - 筆記管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface Note {
  id: string
  content: string
  tab_id: string
  tab_name: string
  tab_order: number
  user_id: string
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const noteEntity = createEntityHook<Note>('notes', {
  list: {
    select: '*',
    orderBy: { column: 'tab_order', ascending: true },
  },
  slim: {
    select: 'id,tab_id,tab_name,tab_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useNotes = noteEntity.useList
export const useNotesSlim = noteEntity.useListSlim
export const useNote = noteEntity.useDetail
export const useNotesPaginated = noteEntity.usePaginated
export const useNoteDictionary = noteEntity.useDictionary

export const createNote = noteEntity.create
export const updateNote = noteEntity.update
export const deleteNote = noteEntity.delete
export const invalidateNotes = noteEntity.invalidate
