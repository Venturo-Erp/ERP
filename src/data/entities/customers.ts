'use client'

/**
 * Customers Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Customer } from '@/stores/types'

const customerEntity = createEntityHook<Customer>('customers', {
  list: {
    // 排除 passport_image_url 以避免載入大量 base64 圖片資料
    // 護照圖片只在詳情頁面需要時才載入
    select:
      'id,code,name,english_name,nickname,phone,alternative_phone,email,address,city,country,national_id,passport_number,passport_name,passport_expiry,birth_date,gender,company,tax_id,member_type,is_vip,vip_level,source,referred_by,notes,is_active,total_orders,total_spent,last_order_date,verification_status,dietary_restrictions,workspace_id,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select:
      'id,code,name,phone,email,birth_date,gender,is_vip,passport_name,passport_number,passport_expiry,national_id',
  },
  detail: { select: '*' }, // 詳情頁才載入完整資料（包含 passport_image_url）
  cache: CACHE_PRESETS.medium,
})

export const useCustomers = customerEntity.useList
export const useCustomersSlim = customerEntity.useListSlim
const useCustomer = customerEntity.useDetail
export const useCustomersPaginated = customerEntity.usePaginated
const useCustomerDictionary = customerEntity.useDictionary

export const createCustomer = customerEntity.create
export const updateCustomer = customerEntity.update
export const deleteCustomer = customerEntity.delete
export const invalidateCustomers = customerEntity.invalidate
