'use client'

/**
 * Vendor Costs Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { VendorCost } from '@/stores/types'

const vendorCostEntity = createEntityHook<VendorCost>('vendor_costs', {
  list: {
    select: 'id,vendor_name,visa_type,cost,created_at,updated_at',
    orderBy: { column: 'vendor_name', ascending: true },
  },
  slim: {
    select: 'id,vendor_name,visa_type,cost',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useVendorCosts = vendorCostEntity.useList
const useVendorCostsSlim = vendorCostEntity.useListSlim
const useVendorCost = vendorCostEntity.useDetail
const useVendorCostsPaginated = vendorCostEntity.usePaginated
const useVendorCostDictionary = vendorCostEntity.useDictionary

export const createVendorCost = vendorCostEntity.create
export const updateVendorCost = vendorCostEntity.update
const deleteVendorCost = vendorCostEntity.delete
const invalidateVendorCosts = vendorCostEntity.invalidate
