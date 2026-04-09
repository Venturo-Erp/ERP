'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Esim } from '@/types/esim.types'

export const esimEntity = createEntityHook<Esim>('esims', {
  list: {
    select:
      'id,workspace_id,esim_number,group_code,order_number,supplier_order_number,status,product_id,quantity,price,email,note,created_at,created_by,updated_at,updated_by',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,esim_number,group_code,order_number,status,quantity,price,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useEsims = esimEntity.useList
export const useEsimsSlim = esimEntity.useListSlim
export const useEsim = esimEntity.useDetail
export const useEsimsPaginated = esimEntity.usePaginated
export const useEsimDictionary = esimEntity.useDictionary

export const createEsim = esimEntity.create
export const updateEsim = esimEntity.update
export const deleteEsim = esimEntity.delete
export const invalidateEsims = esimEntity.invalidate
