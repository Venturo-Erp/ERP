'use client'

/**
 * Customer Group Members Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CustomerGroupMember } from '@/stores/types'

export const customerGroupMemberEntity = createEntityHook<CustomerGroupMember>(
  'customer_group_members',
  {
    list: {
      select: '*',
      orderBy: { column: 'created_at', ascending: false },
    },
    slim: {
      select: 'id,group_id,customer_id',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.medium,
    workspaceScoped: false, // 透過 group_id 關聯
  }
)

export const useCustomerGroupMembers = customerGroupMemberEntity.useList
export const useCustomerGroupMembersSlim = customerGroupMemberEntity.useListSlim
export const useCustomerGroupMember = customerGroupMemberEntity.useDetail
export const useCustomerGroupMembersPaginated = customerGroupMemberEntity.usePaginated
export const useCustomerGroupMemberDictionary = customerGroupMemberEntity.useDictionary

export const createCustomerGroupMember = customerGroupMemberEntity.create
export const updateCustomerGroupMember = customerGroupMemberEntity.update
export const deleteCustomerGroupMember = customerGroupMemberEntity.delete
export const invalidateCustomerGroupMembers = customerGroupMemberEntity.invalidate
