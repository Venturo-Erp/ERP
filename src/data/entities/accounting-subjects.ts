'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { AccountingSubject } from '@/types/accounting-pro.types'

const accountingSubjectEntity = createEntityHook<AccountingSubject>('accounting_subjects', {
  list: {
    select:
      'id,workspace_id,code,name,type,parent_id,level,is_system,is_active,description,created_at,updated_at',
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
const useAccountingSubjectsSlim = accountingSubjectEntity.useListSlim
const useAccountingSubject = accountingSubjectEntity.useDetail
const useAccountingSubjectsPaginated = accountingSubjectEntity.usePaginated
const useAccountingSubjectDictionary = accountingSubjectEntity.useDictionary

// Actions
const createAccountingSubject = accountingSubjectEntity.create
const updateAccountingSubject = accountingSubjectEntity.update
const deleteAccountingSubject = accountingSubjectEntity.delete
const invalidateAccountingSubjects = accountingSubjectEntity.invalidate
