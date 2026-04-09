'use client'

/**
 * Image Library Entity - 圖片庫管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface ImageLibraryItem {
  id: string
  name: string
  file_path: string
  public_url: string
  description: string | null
  category: string | null
  tags: string[] | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  country_id: string | null
  city_id: string | null
  attraction_id: string | null
  workspace_id: string
  created_at: string
  created_by: string | null
  updated_at: string
}

export const imageLibraryEntity = createEntityHook<ImageLibraryItem>('image_library', {
  workspaceScoped: true,
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,public_url,category,country_id,city_id,attraction_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useImageLibrary = imageLibraryEntity.useList
export const useImageLibrarySlim = imageLibraryEntity.useListSlim
export const useImageLibraryItem = imageLibraryEntity.useDetail
export const useImageLibraryPaginated = imageLibraryEntity.usePaginated
export const useImageLibraryDictionary = imageLibraryEntity.useDictionary

export const createImageLibraryItem = imageLibraryEntity.create
export const updateImageLibraryItem = imageLibraryEntity.update
export const deleteImageLibraryItem = imageLibraryEntity.delete
export const invalidateImageLibrary = imageLibraryEntity.invalidate
