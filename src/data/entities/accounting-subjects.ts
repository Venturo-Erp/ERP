'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { AccountingSubject } from '@/types/accounting-pro.types'

export const accountingSubjectEntity = createEntityHook<AccountingSubject>('accounting_subjects', {
  list: {
    select:
      '*',
    orderBy: { column: 'code', ascending: true },
  },
  slim: {
    select: 'id,code,name,type,parent_id,level,is_system,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

// Hooks
export const useAccountingSubjects = accountingSubjectEntity.useList
export const useAccountingSubjectsSlim = accountingSubjectEntity.useListSlim
export const useAccountingSubject = accountingSubjectEntity.useDetail
export const useAccountingSubjectsPaginated = accountingSubjectEntity.usePaginated
export const useAccountingSubjectDictionary = accountingSubjectEntity.useDictionary

// Actions
export const createAccountingSubject = accountingSubjectEntity.create
export const updateAccountingSubject = accountingSubjectEntity.update
export const deleteAccountingSubject = accountingSubjectEntity.delete
export const invalidateAccountingSubjects = accountingSubjectEntity.invalidate
