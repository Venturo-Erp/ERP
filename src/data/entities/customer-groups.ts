'use client'

/**
 * Customer Groups Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CustomerGroup } from '@/stores/types'

export const customerGroupEntity = createEntityHook<CustomerGroup>('customer_groups', {
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,description',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useCustomerGroups = customerGroupEntity.useList
export const useCustomerGroupsSlim = customerGroupEntity.useListSlim
export const useCustomerGroup = customerGroupEntity.useDetail
export const useCustomerGroupsPaginated = customerGroupEntity.usePaginated
export const useCustomerGroupDictionary = customerGroupEntity.useDictionary

export const createCustomerGroup = customerGroupEntity.create
export const updateCustomerGroup = customerGroupEntity.update
export const deleteCustomerGroup = customerGroupEntity.delete
export const invalidateCustomerGroups = customerGroupEntity.invalidate
