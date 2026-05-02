/**
 * API 層權限檢查（2026-05-01 改走新 capability 系統）
 *
 * 內部資料源：role_capabilities 表（取代舊 role_tab_permissions）
 * 介面保留 (employeeId, {module, tab, action})、舊 caller 不必動。
 * Step 4 清場時、callers 直接改用 capability code 字串、本檔可整個刪。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * 把舊三元組翻譯成 capability code 字串
 *   tab 為 null → "{module}.{action}"
 *   tab 不為 null → "{module}.{tab}.{action}"
 */
function toCapabilityCode(capability: {
  module: string
  tab: string | null
  action: 'read' | 'write'
}): string {
  const { module, tab, action } = capability
  return tab ? `${module}.${tab}.${action}` : `${module}.${action}`
}

/**
 * 檢查員工是否擁有某個權限資格
 */
export async function checkCapability(
  employeeId: string,
  capability: { module: string; tab: string | null; action: 'read' | 'write' }
): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return false

  const roleId = (employee as { role_id?: string | null }).role_id
  if (!roleId) return false

  const code = toCapabilityCode(capability)

  const { data, error } = await adminClient
    .from('role_capabilities')
    .select('enabled')
    .eq('role_id', roleId)
    .eq('capability_code', code)
    .eq('enabled', true)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/**
 * 直接用 capability code 字串檢查（新 caller 用這個）
 */
export async function hasCapabilityByCode(
  employeeId: string,
  code: string
): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return false

  const roleId = (employee as { role_id?: string | null }).role_id
  if (!roleId) return false

  const { data, error } = await adminClient
    .from('role_capabilities')
    .select('enabled')
    .eq('role_id', roleId)
    .eq('capability_code', code)
    .eq('enabled', true)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/**
 * 舊版 hasAdminCapability（保留為 backward compat 殼）
 * 等價於「能寫 hr.roles」(=系統主管才能)
 */
export async function hasAdminCapability(employeeId: string): Promise<boolean> {
  return hasCapabilityByCode(employeeId, 'hr.roles.write')
}
