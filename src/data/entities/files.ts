'use client'

/**
 * Files Entity - 檔案管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface FileRecord {
  id: string
  filename: string
  original_filename: string
  storage_bucket: string
  storage_path: string
  content_type: string | null
  size_bytes: number | null
  extension: string | null
  category: string
  folder_id: string | null
  tour_id: string | null
  order_id: string | null
  customer_id: string | null
  supplier_id: string | null
  description: string | null
  notes: string | null
  tags: string[] | null
  is_starred: boolean | null
  is_archived: boolean | null
  is_deleted: boolean | null
  deleted_at: string | null
  source: string | null
  created_by: string | null
  updated_by: string | null
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const fileEntity = createEntityHook<FileRecord>('files', {
  list: {
    select:
      'id,filename,original_filename,storage_bucket,storage_path,content_type,size_bytes,extension,category,folder_id,tour_id,order_id,customer_id,supplier_id,description,notes,tags,is_starred,is_archived,is_deleted,deleted_at,source,created_by,updated_by,workspace_id,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,filename,original_filename,folder_id,tour_id,category,content_type,size_bytes',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useFiles = fileEntity.useList
export const useFilesSlim = fileEntity.useListSlim
export const useFile = fileEntity.useDetail
export const useFilesPaginated = fileEntity.usePaginated
export const useFileDictionary = fileEntity.useDictionary

export const createFile = fileEntity.create
export const updateFile = fileEntity.update
export const deleteFile = fileEntity.delete
export const invalidateFiles = fileEntity.invalidate
