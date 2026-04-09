'use client'

/**
 * Folders Entity - 資料夾管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  tour_id: string | null
  customer_id: string | null
  supplier_id: string | null
  folder_type: string | null
  default_category: string | null
  path: string | null
  depth: number | null
  is_system: boolean | null
  icon: string | null
  color: string | null
  sort_order: number | null
  created_by: string | null
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const folderEntity = createEntityHook<Folder>('folders', {
  list: {
    select:
      '*',
    orderBy: { column: 'sort_order', ascending: true },
  },
  slim: {
    select: 'id,name,parent_id,tour_id,folder_type,path,depth',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useFolders = folderEntity.useList
export const useFoldersSlim = folderEntity.useListSlim
export const useFolder = folderEntity.useDetail
export const useFoldersPaginated = folderEntity.usePaginated
export const useFolderDictionary = folderEntity.useDictionary

export const createFolder = folderEntity.create
export const updateFolder = folderEntity.update
export const deleteFolder = folderEntity.delete
export const invalidateFolders = folderEntity.invalidate
