'use client'

/**
 * Notes Entity - 筆記管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

interface Note {
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

const noteEntity = createEntityHook<Note>('notes', {
  list: {
    select:
      'id,user_id,tab_id,tab_name,content,tab_order,created_at,updated_at,workspace_id,created_by,updated_by',
    orderBy: { column: 'tab_order', ascending: true },
  },
  slim: {
    select: 'id,tab_id,tab_name,tab_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

const useNotes = noteEntity.useList
const useNotesSlim = noteEntity.useListSlim
const useNote = noteEntity.useDetail
const useNotesPaginated = noteEntity.usePaginated
const useNoteDictionary = noteEntity.useDictionary

const createNote = noteEntity.create
const updateNote = noteEntity.update
const deleteNote = noteEntity.delete
const invalidateNotes = noteEntity.invalidate
