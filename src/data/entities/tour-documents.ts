'use client'

/**
 * Tour Documents Entity - 旅遊團文件管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourDocument {
  id: string
  tour_id: string
  document_type: string
  title: string
  file_url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  description?: string
  uploaded_by?: string
  workspace_id?: string
  created_at?: string
  updated_at?: string
}

export const tourDocumentEntity = createEntityHook<TourDocument>('tour_documents', {
  list: {
    select:
      'id,tour_id,workspace_id,name,description,file_path,public_url,file_name,file_size,mime_type,uploaded_by,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,tour_id,document_type,title,file_name',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourDocuments = tourDocumentEntity.useList
export const useTourDocumentsSlim = tourDocumentEntity.useListSlim
export const useTourDocument = tourDocumentEntity.useDetail
export const useTourDocumentsPaginated = tourDocumentEntity.usePaginated
export const useTourDocumentDictionary = tourDocumentEntity.useDictionary

export const createTourDocument = tourDocumentEntity.create
export const updateTourDocument = tourDocumentEntity.update
export const deleteTourDocument = tourDocumentEntity.delete
export const invalidateTourDocuments = tourDocumentEntity.invalidate
