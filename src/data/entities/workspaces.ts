'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

/**
 * Workspace 型別（對應 workspaces 表）
 * 注意：workspaces 表不需要 workspace 隔離（它本身就是列出所有 workspace）
 */
export interface WorkspaceEntity extends BaseEntity {
  name: string
  code?: string | null
  type?: string | null
  description?: string | null
  icon?: string | null
  is_active: boolean | null
  seal_image_url?: string | null
  contract_seal_image_url?: string | null
  created_by?: string | null
}

export const workspaceEntity = createEntityHook<WorkspaceEntity>('workspaces', {
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,code,icon,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  workspaceScoped: false, // workspaces 表不需要 workspace 隔離
  skipAuditFields: true,
})

// Hooks
export const useWorkspaces = workspaceEntity.useList
export const useWorkspacesSlim = workspaceEntity.useListSlim
export const useWorkspace = workspaceEntity.useDetail
export const useWorkspacesPaginated = workspaceEntity.usePaginated
export const useWorkspaceDictionary = workspaceEntity.useDictionary

// Actions
export const createWorkspace = workspaceEntity.create
export const updateWorkspace = workspaceEntity.update
export const deleteWorkspace = workspaceEntity.delete
export const invalidateWorkspaces = workspaceEntity.invalidate
