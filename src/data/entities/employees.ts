'use client'

/**
 * Employees Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Employee } from '@/stores/types'

export const employeeEntity = createEntityHook<Employee>('employees', {
  list: {
    select:
      'id,employee_number,display_name,chinese_name,english_name,email,avatar_url,birth_date,id_number,employee_type,status,is_bot,roles,monthly_salary,supabase_user_id,user_id,must_change_password,last_login_at,workspace_id,created_at,updated_at,updated_by',
    orderBy: { column: 'employee_number', ascending: true },
  },
  slim: {
    select:
      'id,employee_number,display_name,chinese_name,english_name,email,status,roles,workspace_id,employee_type,avatar_url,is_bot',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  workspaceScoped: true, // 員工按 workspace 隔離
})

export const useEmployees = employeeEntity.useList
export const useEmployeesSlim = employeeEntity.useListSlim
export const useEmployee = employeeEntity.useDetail
export const useEmployeesPaginated = employeeEntity.usePaginated
export const useEmployeeDictionary = employeeEntity.useDictionary

export const createEmployee = employeeEntity.create
export const updateEmployee = employeeEntity.update
export const deleteEmployee = employeeEntity.delete
export const invalidateEmployees = employeeEntity.invalidate
