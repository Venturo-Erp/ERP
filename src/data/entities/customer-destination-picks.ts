'use client'

/**
 * Customer Destination Picks Entity（客戶選擇景點記錄）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CustomerDestinationPick } from '@/features/destinations/types'

export const customerDestinationPickEntity = createEntityHook<CustomerDestinationPick>(
  'customer_destination_picks',
  {
    list: {
      select: `
        *,
        destination:destinations(*)
      `,
      orderBy: { column: 'selected_at', ascending: false },
    },
    slim: {
      select: 'id,line_user_id,destination_id,session_id,selected_at',
    },
    detail: {
      select: `
        *,
        destination:destinations(*)
      `,
    },
    cache: CACHE_PRESETS.low, // 客戶選擇實時性要求高
  }
)

export const useCustomerDestinationPicks = customerDestinationPickEntity.useList
export const useCustomerDestinationPicksSlim = customerDestinationPickEntity.useListSlim
export const useCustomerDestinationPick = customerDestinationPickEntity.useDetail
export const useCustomerDestinationPicksPaginated = customerDestinationPickEntity.usePaginated

export const createCustomerDestinationPick = customerDestinationPickEntity.create
export const updateCustomerDestinationPick = customerDestinationPickEntity.update
export const deleteCustomerDestinationPick = customerDestinationPickEntity.delete
export const invalidateCustomerDestinationPicks = customerDestinationPickEntity.invalidate
