'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { WorkspaceModule } from '@/types/accounting-pro.types'

export const workspaceModuleEntity = createEntityHook<WorkspaceModule>('workspace_modules', {
  list: {
    select: '*',
    orderBy: { column: 'module_name', ascending: true },
  },
  slim: {
    select: 'id,workspace_id,module_name,is_enabled,enabled_at,expires_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

// Hooks
export const useWorkspaceModules = workspaceModuleEntity.useList
export const useWorkspaceModulesSlim = workspaceModuleEntity.useListSlim
export const useWorkspaceModule = workspaceModuleEntity.useDetail
export const useWorkspaceModulesPaginated = workspaceModuleEntity.usePaginated
export const useWorkspaceModuleDictionary = workspaceModuleEntity.useDictionary

// Actions
export const createWorkspaceModule = workspaceModuleEntity.create
export const updateWorkspaceModule = workspaceModuleEntity.update
export const deleteWorkspaceModule = workspaceModuleEntity.delete
export const invalidateWorkspaceModules = workspaceModuleEntity.invalidate
