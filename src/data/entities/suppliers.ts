'use client'

/**
 * Suppliers Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Supplier } from '@/stores/types'

export const supplierEntity = createEntityHook<Supplier>('suppliers', {
  list: {
    select:
      'id,code,name,english_name,category_id,contact,contact_person,phone,email,fax,address,country,country_id,region,currency,bank_name,bank_account,bank_branch,bank_code_legacy,tax_id,payment_terms,type,status,is_active,is_preferred,rating,display_order,total_orders,total_spent,website,workspace_id,created_at,created_by,updated_at,updated_by',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,code,name,category_id,contact_person,phone,email,bank_name,bank_code_legacy,bank_account,bank_account_name,notes,type',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useSuppliers = supplierEntity.useList
export const useSuppliersSlim = supplierEntity.useListSlim
export const useSupplier = supplierEntity.useDetail
export const useSuppliersPaginated = supplierEntity.usePaginated
export const useSupplierDictionary = supplierEntity.useDictionary

export const createSupplier = supplierEntity.create
export const updateSupplier = supplierEntity.update
export const deleteSupplier = supplierEntity.delete
export const invalidateSuppliers = supplierEntity.invalidate
