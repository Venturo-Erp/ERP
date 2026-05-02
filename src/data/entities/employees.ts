'use client'

/**
 * Employees Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Employee } from '@/stores/types'

const employeeEntity = createEntityHook<Employee>('employees', {
  list: {
    select:
      'id,employee_number,display_name,chinese_name,english_name,email,avatar_url,birth_date,id_number,employee_type,status,is_bot,roles,monthly_salary,user_id,must_change_password,last_login_at,workspace_id,created_at,updated_at,updated_by',
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
const useEmployee = employeeEntity.useDetail
const useEmployeesPaginated = employeeEntity.usePaginated
export const useEmployeeDictionary = employeeEntity.useDictionary

const createEmployee = employeeEntity.create
const updateEmployee = employeeEntity.update
const deleteEmployee = employeeEntity.delete
const invalidateEmployees = employeeEntity.invalidate
