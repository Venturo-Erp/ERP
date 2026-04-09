'use client'

/**
 * Vendor Costs Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { VendorCost } from '@/stores/types'

export const vendorCostEntity = createEntityHook<VendorCost>('vendor_costs', {
  list: {
    select: '*',
    orderBy: { column: 'vendor_name', ascending: true },
  },
  slim: {
    select: 'id,vendor_name,visa_type,cost',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useVendorCosts = vendorCostEntity.useList
export const useVendorCostsSlim = vendorCostEntity.useListSlim
export const useVendorCost = vendorCostEntity.useDetail
export const useVendorCostsPaginated = vendorCostEntity.usePaginated
export const useVendorCostDictionary = vendorCostEntity.useDictionary

export const createVendorCost = vendorCostEntity.create
export const updateVendorCost = vendorCostEntity.update
export const deleteVendorCost = vendorCostEntity.delete
export const invalidateVendorCosts = vendorCostEntity.invalidate
