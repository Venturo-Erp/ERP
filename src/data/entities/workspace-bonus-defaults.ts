'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { WorkspaceBonusDefault } from '@/types/bonus.types'

export const workspaceBonusDefaultEntity = createEntityHook<WorkspaceBonusDefault>(
  'workspace_bonus_defaults',
  {
    list: {
      select: '*',
      orderBy: { column: 'type', ascending: true },
    },
    slim: {
      select: 'id,type,bonus,bonus_type,employee_id',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.low,
  }
)

export const useWorkspaceBonusDefaults = workspaceBonusDefaultEntity.useList
export const useWorkspaceBonusDefaultsSlim = workspaceBonusDefaultEntity.useListSlim
export const useWorkspaceBonusDefault = workspaceBonusDefaultEntity.useDetail
export const useWorkspaceBonusDefaultsPaginated = workspaceBonusDefaultEntity.usePaginated
export const useWorkspaceBonusDefaultDictionary = workspaceBonusDefaultEntity.useDictionary

export const createWorkspaceBonusDefault = workspaceBonusDefaultEntity.create
export const updateWorkspaceBonusDefault = workspaceBonusDefaultEntity.update
export const deleteWorkspaceBonusDefault = workspaceBonusDefaultEntity.delete
export const invalidateWorkspaceBonusDefaults = workspaceBonusDefaultEntity.invalidate
