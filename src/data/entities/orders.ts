'use client'

/**
 * Orders Entity
 *
 * 使用方式：
 * import { useOrders, useOrder, useOrdersPaginated, useOrderDictionary } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Order } from '@/stores/types'

// ============================================
// Entity 定義
// ============================================

export const orderEntity = createEntityHook<Order>('orders', {
  list: {
    select:
      'id,code,order_number,tour_id,tour_name,contact_person,contact_phone,contact_email,customer_id,sales_person,assistant,status,payment_status,paid_amount,remaining_amount,total_amount,member_count,adult_count,is_active,workspace_id,created_at,created_by,updated_at,updated_by',
    orderBy: {
      column: 'created_at',
      ascending: false,
    },
  },
  slim: {
    select:
      'id,order_number,tour_id,tour_name,contact_person,contact_phone,sales_person,assistant,payment_status,paid_amount,remaining_amount,total_amount,member_count,code,created_at,customer_id',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.high,
})

// ============================================
// 便捷 Hooks Export
// ============================================

/** 完整 Orders 列表 */
export const useOrders = orderEntity.useList

/** 精簡 Orders 列表（列表顯示用）*/
export const useOrdersSlim = orderEntity.useListSlim

/** 單筆 Order（支援 skip pattern）*/
export const useOrder = orderEntity.useDetail

/** 分頁 Orders（server-side pagination + filter + search）*/
export const useOrdersPaginated = orderEntity.usePaginated

/** Order Dictionary（O(1) 查詢）*/
export const useOrderDictionary = orderEntity.useDictionary

// ============================================
// CRUD Export
// ============================================

/** 建立 Order */
export const createOrder = orderEntity.create

/** 更新 Order */
export const updateOrder = orderEntity.update

/** 刪除 Order */
export const deleteOrder = orderEntity.delete

/** 使 Order 快取失效 */
export const invalidateOrders = orderEntity.invalidate
