'use client'

/**
 * Companies Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Company } from '@/stores/types'

export const companyEntity = createEntityHook<Company>('companies', {
  list: {
    select:
      'id,code,workspace_id,name,english_name,tax_id,phone,fax,email,website,address,industry,employee_count,annual_travel_budget,payment_terms,credit_limit,status,is_vip,vip_level,total_orders,total_spent,last_order_date,notes,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'company_name', ascending: true },
  },
  slim: {
    select: 'id,company_name,tax_id,phone,email,vip_level',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useCompanies = companyEntity.useList
export const useCompaniesSlim = companyEntity.useListSlim
export const useCompany = companyEntity.useDetail
export const useCompaniesPaginated = companyEntity.usePaginated
export const useCompanyDictionary = companyEntity.useDictionary

export const createCompany = companyEntity.create
export const updateCompany = companyEntity.update
export const deleteCompany = companyEntity.delete
export const invalidateCompanies = companyEntity.invalidate
