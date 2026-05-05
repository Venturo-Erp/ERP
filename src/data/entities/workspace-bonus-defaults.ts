'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { WorkspaceBonusDefault } from '@/types/bonus.types'

const workspaceBonusDefaultEntity = createEntityHook<WorkspaceBonusDefault>(
  'workspace_bonus_defaults',
  {
    list: {
      select:
        'id,workspace_id,type,bonus,bonus_type,employee_id,description,created_at,updated_at',
      orderBy: { column: 'type', ascending: true },
    },
    slim: {
      select: 'id,type,bonus,bonus_type,employee_id,description',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.low,
  }
)

export const useWorkspaceBonusDefaults = workspaceBonusDefaultEntity.useList
const useWorkspaceBonusDefaultsSlim = workspaceBonusDefaultEntity.useListSlim
const useWorkspaceBonusDefault = workspaceBonusDefaultEntity.useDetail
const useWorkspaceBonusDefaultsPaginated = workspaceBonusDefaultEntity.usePaginated
const useWorkspaceBonusDefaultDictionary = workspaceBonusDefaultEntity.useDictionary

const createWorkspaceBonusDefault = workspaceBonusDefaultEntity.create
const updateWorkspaceBonusDefault = workspaceBonusDefaultEntity.update
const deleteWorkspaceBonusDefault = workspaceBonusDefaultEntity.delete
const invalidateWorkspaceBonusDefaults = workspaceBonusDefaultEntity.invalidate
