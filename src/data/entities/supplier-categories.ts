'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { SupplierCategory } from '@/types/supplier-category.types'

export const supplierCategoryEntity = createEntityHook<SupplierCategory>('supplier_categories', {
  list: {
    select: '*',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,icon,color,display_order,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 類別資料變動較少
})

// Hooks
export const useSupplierCategories = supplierCategoryEntity.useList
export const useSupplierCategoriesSlim = supplierCategoryEntity.useListSlim
export const useSupplierCategory = supplierCategoryEntity.useDetail
export const useSupplierCategoriesPaginated = supplierCategoryEntity.usePaginated
export const useSupplierCategoryDictionary = supplierCategoryEntity.useDictionary

// Actions
export const createSupplierCategory = supplierCategoryEntity.create
export const updateSupplierCategory = supplierCategoryEntity.update
export const deleteSupplierCategory = supplierCategoryEntity.delete
export const invalidateSupplierCategories = supplierCategoryEntity.invalidate
