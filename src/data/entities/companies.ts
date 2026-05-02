'use client'

/**
 * Companies Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Company } from '@/stores/types'

const companyEntity = createEntityHook<Company>('companies', {
  list: {
    select:
      'id,workspace_id,company_name,tax_id,phone,email,website,invoice_title,invoice_address,invoice_email,payment_terms,payment_method,credit_limit,bank_name,bank_account,bank_branch,registered_address,mailing_address,vip_level,notes,is_active,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'company_name', ascending: true },
  },
  slim: {
    select: 'id,company_name,tax_id,phone,email,vip_level',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useCompanies = companyEntity.useList
const useCompaniesSlim = companyEntity.useListSlim
const useCompany = companyEntity.useDetail
const useCompaniesPaginated = companyEntity.usePaginated
const useCompanyDictionary = companyEntity.useDictionary

export const createCompany = companyEntity.create
export const updateCompany = companyEntity.update
export const deleteCompany = companyEntity.delete
const invalidateCompanies = companyEntity.invalidate
