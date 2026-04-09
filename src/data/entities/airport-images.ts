'use client'

/**
 * Airport Images Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { AirportImage } from '@/stores/types'

export const airportImageEntity = createEntityHook<AirportImage>('airport_images', {
  list: {
    select:
      'id,airport_code,image_url,label,season,is_default,display_order,uploaded_by,workspace_id,created_at,updated_at',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,url,airport_code,display_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  // airport_images 沒有 created_by/updated_by 欄位
  skipAuditFields: true,
})

export const useAirportImages = airportImageEntity.useList
export const useAirportImagesSlim = airportImageEntity.useListSlim
export const useAirportImage = airportImageEntity.useDetail
export const useAirportImagesPaginated = airportImageEntity.usePaginated
export const useAirportImageDictionary = airportImageEntity.useDictionary

export const createAirportImage = airportImageEntity.create
export const updateAirportImage = airportImageEntity.update
export const deleteAirportImage = airportImageEntity.delete
export const invalidateAirportImages = airportImageEntity.invalidate
