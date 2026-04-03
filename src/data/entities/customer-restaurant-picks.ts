'use client'

/**
 * Customer Restaurant Picks Entity（客戶選擇餐廳記錄）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CustomerRestaurantPick } from '@/features/restaurants/types'

export const customerRestaurantPickEntity = createEntityHook<CustomerRestaurantPick>(
  'customer_restaurant_picks',
  {
    list: {
      select: `
        *,
        restaurant:restaurants(*)
      `,
      orderBy: { column: 'selected_at', ascending: false },
    },
    slim: {
      select: 'id,line_user_id,restaurant_id,session_id,meal_type,selected_at',
    },
    detail: {
      select: `
        *,
        restaurant:restaurants(*)
      `,
    },
    cache: CACHE_PRESETS.low, // 客戶選擇實時性要求高
  }
)

export const useCustomerRestaurantPicks = customerRestaurantPickEntity.useList
export const useCustomerRestaurantPicksSlim = customerRestaurantPickEntity.useListSlim
export const useCustomerRestaurantPick = customerRestaurantPickEntity.useDetail
export const useCustomerRestaurantPicksPaginated = customerRestaurantPickEntity.usePaginated

export const createCustomerRestaurantPick = customerRestaurantPickEntity.create
export const updateCustomerRestaurantPick = customerRestaurantPickEntity.update
export const deleteCustomerRestaurantPick = customerRestaurantPickEntity.delete
export const invalidateCustomerRestaurantPicks = customerRestaurantPickEntity.invalidate
