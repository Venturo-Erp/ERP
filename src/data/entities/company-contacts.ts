'use client'

/**
 * Company Contacts Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CompanyContact } from '@/stores/types'

export const companyContactEntity = createEntityHook<CompanyContact>('company_contacts', {
  list: {
    select:
      '*',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,company_id,name,title,phone,email,is_primary',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useCompanyContacts = companyContactEntity.useList
export const useCompanyContactsSlim = companyContactEntity.useListSlim
export const useCompanyContact = companyContactEntity.useDetail
export const useCompanyContactsPaginated = companyContactEntity.usePaginated
export const useCompanyContactDictionary = companyContactEntity.useDictionary

export const createCompanyContact = companyContactEntity.create
export const updateCompanyContact = companyContactEntity.update
export const deleteCompanyContact = companyContactEntity.delete
export const invalidateCompanyContacts = companyContactEntity.invalidate
