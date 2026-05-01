'use client'

/**
 * Company Contacts Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CompanyContact } from '@/stores/types'

const companyContactEntity = createEntityHook<CompanyContact>('company_contacts', {
  list: {
    select:
      'id,workspace_id,company_id,name,english_name,title,department,phone,mobile,email,line_id,is_primary,is_active,notes,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'name', ascending: true },
  },
  slim: {
    select: 'id,company_id,name,title,phone,email,is_primary',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

const useCompanyContacts = companyContactEntity.useList
const useCompanyContactsSlim = companyContactEntity.useListSlim
const useCompanyContact = companyContactEntity.useDetail
const useCompanyContactsPaginated = companyContactEntity.usePaginated
const useCompanyContactDictionary = companyContactEntity.useDictionary

const createCompanyContact = companyContactEntity.create
const updateCompanyContact = companyContactEntity.update
const deleteCompanyContact = companyContactEntity.delete
const invalidateCompanyContacts = companyContactEntity.invalidate
