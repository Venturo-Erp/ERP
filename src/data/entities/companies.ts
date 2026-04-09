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
      'id,workspace_id,company_name,tax_id,phone,email,website,invoice_title,invoice_address,invoice_email,payment_terms,payment_method,credit_limit,bank_name,bank_account,bank_branch,registered_address,mailing_address,vip_level,notes,created_at,updated_at,created_by',
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
