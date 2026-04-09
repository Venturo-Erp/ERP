'use client'

/**
 * Company Assets Entity - 公司資產管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface CompanyAsset {
  id: string
  name: string
  file_path: string
  asset_type: string | null
  description: string | null
  file_size: number | null
  folder_id: string | null
  mime_type: string | null
  restricted: boolean | null
  uploaded_by: string | null
  uploaded_by_name: string | null
  workspace_id: string | null
  created_at: string | null
  updated_at: string | null
}

export const companyAssetEntity = createEntityHook<CompanyAsset>('company_assets', {
  list: {
    select:
      'id,name,file_path,file_size,mime_type,description,uploaded_by,uploaded_by_name,created_at,updated_at,asset_type,restricted,folder_id,workspace_id,created_by,updated_by',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,file_path,asset_type,mime_type,folder_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useCompanyAssets = companyAssetEntity.useList
export const useCompanyAssetsSlim = companyAssetEntity.useListSlim
export const useCompanyAsset = companyAssetEntity.useDetail
export const useCompanyAssetsPaginated = companyAssetEntity.usePaginated
export const useCompanyAssetDictionary = companyAssetEntity.useDictionary

export const createCompanyAsset = companyAssetEntity.create
export const updateCompanyAsset = companyAssetEntity.update
export const deleteCompanyAsset = companyAssetEntity.delete
export const invalidateCompanyAssets = companyAssetEntity.invalidate
