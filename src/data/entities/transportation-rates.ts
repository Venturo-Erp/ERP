'use client'

/**
 * Transportation Rates Entity - 車資管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type TransportationRateRow = Database['public']['Tables']['transportation_rates']['Row']

export interface TransportationRate {
  id: string
  country_id: string | null
  country_name: string
  vehicle_type: string
  category: string | null
  price: number
  price_twd: number | null
  cost_vnd: number | null
  currency: string
  unit: string
  route: string | null
  trip_type: string | null
  supplier: string | null
  is_active: boolean
  is_backup: boolean | null
  display_order: number
  notes: string | null
  kkday_cost: number | null
  kkday_profit: number | null
  kkday_selling_price: number | null
  workspace_id: string | null
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export const transportationRateEntity = createEntityHook<TransportationRate>(
  'transportation_rates',
  {
    list: {
      select: '*',
      orderBy: { column: 'display_order', ascending: true },
    },
    slim: {
      select: 'id,country_id,country_name,vehicle_type,price,currency,is_active',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.medium,
  }
)

export const useTransportationRates = transportationRateEntity.useList
export const useTransportationRatesSlim = transportationRateEntity.useListSlim
export const useTransportationRate = transportationRateEntity.useDetail
export const useTransportationRatesPaginated = transportationRateEntity.usePaginated
export const useTransportationRateDictionary = transportationRateEntity.useDictionary

export const createTransportationRate = transportationRateEntity.create
export const updateTransportationRate = transportationRateEntity.update
export const deleteTransportationRate = transportationRateEntity.delete
export const invalidateTransportationRates = transportationRateEntity.invalidate
