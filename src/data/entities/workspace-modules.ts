'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { WorkspaceModule } from '@/types/accounting-pro.types'

const workspaceModuleEntity = createEntityHook<WorkspaceModule>('workspace_modules', {
  list: {
    select: 'id,workspace_id,module_name,is_enabled,enabled_at,expires_at,created_at,updated_at',
    orderBy: { column: 'module_name', ascending: true },
  },
  slim: {
    select: 'id,workspace_id,module_name,is_enabled,enabled_at,expires_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

// Hooks
const useWorkspaceModules = workspaceModuleEntity.useList
const useWorkspaceModulesSlim = workspaceModuleEntity.useListSlim
const useWorkspaceModule = workspaceModuleEntity.useDetail
const useWorkspaceModulesPaginated = workspaceModuleEntity.usePaginated
const useWorkspaceModuleDictionary = workspaceModuleEntity.useDictionary

// Actions
const createWorkspaceModule = workspaceModuleEntity.create
const updateWorkspaceModule = workspaceModuleEntity.update
const deleteWorkspaceModule = workspaceModuleEntity.delete
const invalidateWorkspaceModules = workspaceModuleEntity.invalidate
