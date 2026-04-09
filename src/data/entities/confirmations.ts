'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Confirmation } from '@/types/confirmation.types'

export const confirmationEntity = createEntityHook<Confirmation>('confirmations', {
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,type,booking_number,confirmation_number,status,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

// Hooks
export const useConfirmations = confirmationEntity.useList
export const useConfirmationsSlim = confirmationEntity.useListSlim
export const useConfirmation = confirmationEntity.useDetail
export const useConfirmationsPaginated = confirmationEntity.usePaginated
export const useConfirmationDictionary = confirmationEntity.useDictionary

// Actions
export const createConfirmation = confirmationEntity.create
export const updateConfirmation = confirmationEntity.update
export const deleteConfirmation = confirmationEntity.delete
export const invalidateConfirmations = confirmationEntity.invalidate
