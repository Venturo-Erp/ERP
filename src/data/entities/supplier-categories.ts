'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { SupplierCategory } from '@/types/supplier-category.types'

const supplierCategoryEntity = createEntityHook<SupplierCategory>('supplier_categories', {
  list: {
    select: 'id,name,icon,color,display_order,is_active,created_at,updated_at',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,icon,color,display_order,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 類別資料變動較少
})

// Hooks
const useSupplierCategories = supplierCategoryEntity.useList
const useSupplierCategoriesSlim = supplierCategoryEntity.useListSlim
const useSupplierCategory = supplierCategoryEntity.useDetail
const useSupplierCategoriesPaginated = supplierCategoryEntity.usePaginated
const useSupplierCategoryDictionary = supplierCategoryEntity.useDictionary

// Actions
const createSupplierCategory = supplierCategoryEntity.create
const updateSupplierCategory = supplierCategoryEntity.update
const deleteSupplierCategory = supplierCategoryEntity.delete
const invalidateSupplierCategories = supplierCategoryEntity.invalidate
