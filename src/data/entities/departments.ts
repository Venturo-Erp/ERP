'use client'

/**
 * Departments Entity - 部門管理
 * 付費功能，目前僅勁揚使用
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface Department {
  id: string
  workspace_id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export const departmentEntity = createEntityHook<Department>('departments', {
  list: {
    select: '*',
    orderBy: { column: 'display_order', ascending: true },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
  workspaceScoped: true,
})

export const useDepartments = departmentEntity.useList
export const useDepartment = departmentEntity.useDetail
export const createDepartment = departmentEntity.create
export const updateDepartment = departmentEntity.update
export const deleteDepartment = departmentEntity.delete
export const invalidateDepartments = departmentEntity.invalidate
