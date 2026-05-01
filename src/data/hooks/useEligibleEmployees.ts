'use client'

/**
 * useEligibleEmployees — 查「符合某 tab 權限」的員工
 *
 * 用途：各下拉篩選員工清單、根據職務的 role_tab_permissions 決定誰能出現
 *
 * 常用場景：
 *   業務下拉     : useEligibleEmployees('tours', 'as_sales')
 *   助理下拉     : useEligibleEmployees('tours', 'as_assistant')
 *   團控下拉     : useEligibleEmployees('tours', 'as_tour_controller')
 *   代墊款下拉   : useEligibleEmployees('finance', 'advance_payment')
 *
 * 邏輯：
 *   1. 從 role_tab_permissions 找出「該 module.tab 有 can_write=true」的 role_id 清單
 *   2. 從 employees 找出 workspace 內 role_id 在清單中、且未離職 的員工
 *   3. 回傳員工陣列
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

interface EligibleEmployee {
  id: string
  employee_number: string | null
  chinese_name: string | null
  english_name: string | null
  display_name: string | null
  avatar_url: string | null
  status: string | null
  role_id: string | null
  employee_type: string | null
}

export function useEligibleEmployees(moduleCode: string, tabCode: string) {
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id

  const cacheKey = workspaceId ? `eligible:${workspaceId}:${moduleCode}:${tabCode}` : null

  const { data, error, isLoading, mutate } = useSWR<EligibleEmployee[]>(cacheKey, async () => {
    if (!workspaceId) return []

    // Step 1: 找有該權限的 role_ids
    const { data: perms, error: permsErr } = await supabase
      .from('role_tab_permissions')
      .select('role_id')
      .eq('module_code', moduleCode)
      .eq('tab_code', tabCode)
      .eq('can_write', true)

    if (permsErr) throw permsErr
    const roleIds = Array.from(new Set((perms ?? []).map(p => p.role_id).filter(Boolean)))
    if (roleIds.length === 0) return []

    // Step 2: 找該 workspace 內、role_id 在清單中、在職且非 bot 的員工
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select(
        'id, employee_number, chinese_name, english_name, display_name, avatar_url, status, role_id, employee_type'
      )
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .in('role_id', roleIds)

    if (empErr) throw empErr

    // Client-side filter: 排 bot + 排 hardcoded BOT001
    const filtered = (employees ?? []).filter(
      e =>
        e.employee_type !== 'bot' &&
        e.employee_number !== 'BOT001' &&
        e.id !== '00000000-0000-0000-0000-000000000001'
    )

    // 按 employee_number 排序（相容原邏輯）
    filtered.sort((a, b) =>
      (a.employee_number || '').localeCompare(b.employee_number || '', 'en', { numeric: true })
    )

    return filtered as EligibleEmployee[]
  })

  return {
    employees: data ?? [],
    loading: isLoading,
    error,
    refresh: mutate,
  }
}
