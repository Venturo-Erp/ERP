'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CostTemplate } from '@/types/supplier.types'

export const costTemplateEntity = createEntityHook<CostTemplate>('cost_templates', {
  list: {
    select:
      'id,supplier_id,city_id,attraction_id,category,item_name,item_name_en,description,cost_price,selling_price,currency,unit,min_quantity,max_quantity,valid_from,valid_until,season,duration_minutes,capacity,notes,is_active,display_order,created_at,updated_at,created_by,updated_by,vehicle_type,trip_type,route_origin,route_destination,base_distance_km,base_hours,overtime_rate,extra_km_rate',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,supplier_id,city_id,category,item_name,cost_price,selling_price,currency,unit',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

// Hooks
export const useCostTemplates = costTemplateEntity.useList
export const useCostTemplatesSlim = costTemplateEntity.useListSlim
export const useCostTemplate = costTemplateEntity.useDetail
export const useCostTemplatesPaginated = costTemplateEntity.usePaginated
export const useCostTemplateDictionary = costTemplateEntity.useDictionary

// Actions
export const createCostTemplate = costTemplateEntity.create
export const updateCostTemplate = costTemplateEntity.update
export const deleteCostTemplate = costTemplateEntity.delete
export const invalidateCostTemplates = costTemplateEntity.invalidate
