/**
 * API 層的統一權限檢查函數
 *
 * 替代 hasAdminCapability，支援任意的 capability 檢查
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Capability } from '@/lib/permissions/capabilities'

/**
 * 檢查員工是否擁有某個權限資格
 *
 * @param employeeId 員工 ID
 * @param capability 要檢查的權限（來自 CAPABILITIES 常數）
 * @returns 是否擁有該權限
 */
export async function checkCapability(
  employeeId: string,
  capability: { module: string; tab: string | null; action: 'read' | 'write' }
): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  // Step 1：取得員工的 role_id
  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return false

  const roleId = (employee as { role_id?: string | null }).role_id
  if (!roleId) return false

  // Step 2：查 role_tab_permissions 檢查該 role 對該 capability 的權限
  let query = adminClient
    .from('role_tab_permissions')
    .select('can_read, can_write')
    .eq('role_id', roleId)
    .eq('module_code', capability.module)

  // tab 可能是 null（模組沒有分頁）
  if (capability.tab === null) {
    query = query.is('tab_code', null)
  } else {
    query = query.eq('tab_code', capability.tab)
  }

  const { data: permission, error: permError } = await query.single()

  if (permError || !permission) return false

  // Step 3：判讀寫權限
  if (capability.action === 'write') {
    return permission.can_write ?? false
  }
  return permission.can_read ?? false
}

/**
 * 舊版 hasAdminCapability（為了 backward compatibility）
 * 改成查 hr.roles 的寫權限（= 系統主管資格）
 */
export async function hasAdminCapability(employeeId: string): Promise<boolean> {
  return checkCapability(employeeId, {
    module: 'hr',
    tab: 'roles',
    action: 'write',
  })
}
