import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

import type { TabPermission } from '@/lib/permissions'

/**
 * 把 capability_code 字串還原回 (module, tab, action) 三元組
 *   "{module}.{action}"          (2 段)  → tab=null
 *   "{module}.{tab}.{action}"    (3 段)  → tab="{tab}"
 *   保留 capability_code 中可能含 '.' 的 tab（用 split slice）
 */
function parseCode(code: string): {
  moduleCode: string
  tabCode: string | null
  action: 'read' | 'write'
} | null {
  const parts = code.split('.')
  if (parts.length < 2) return null
  const action = parts[parts.length - 1]
  if (action !== 'read' && action !== 'write') return null
  const moduleCode = parts[0]
  const tabCode = parts.length === 2 ? null : parts.slice(1, -1).join('.')
  return { moduleCode, tabCode, action }
}

/**
 * 把 (module, tab, action) 三元組組成 capability_code
 */
function toCode(p: TabPermission, action: 'read' | 'write'): string {
  return p.tab_code
    ? `${p.module_code}.${p.tab_code}.${action}`
    : `${p.module_code}.${action}`
}

/**
 * GET /api/roles/[roleId]/tab-permissions
 * 從 role_capabilities 還原成舊 TabPermission 形狀回給 UI（介面相容）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('role_capabilities')
    .select('capability_code')
    .eq('role_id', roleId)
    .eq('enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 把 codes 還原成 (module, tab) 為 key 的 read/write map
  const map = new Map<string, TabPermission>()
  for (const row of data ?? []) {
    const parsed = parseCode(row.capability_code)
    if (!parsed) continue
    if (parsed.moduleCode === 'platform') continue // platform.is_admin 不在矩陣上顯示
    const key = `${parsed.moduleCode}|${parsed.tabCode ?? ''}`
    const existing = map.get(key) ?? {
      module_code: parsed.moduleCode,
      tab_code: parsed.tabCode,
      can_read: false,
      can_write: false,
    }
    if (parsed.action === 'read') existing.can_read = true
    if (parsed.action === 'write') existing.can_write = true
    map.set(key, existing)
  }

  return NextResponse.json(Array.from(map.values()))
}

/**
 * PUT /api/roles/[roleId]/tab-permissions
 * 覆蓋式：把 TabPermission[] 翻譯成 capability codes、寫進 role_capabilities
 * 保留 platform.* 系列 capabilities（admin 旗標等、不被矩陣 UI 管理）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params
  const supabase = await createApiClient()
  const body = await request.json()
  const { permissions } = body as { permissions: TabPermission[] }

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: '缺少 permissions 陣列' }, { status: 400 })
  }

  // 1. 把矩陣翻譯成要保留的 capability codes
  const codesToKeep = new Set<string>()
  for (const p of permissions) {
    if (p.can_read) codesToKeep.add(toCode(p, 'read'))
    if (p.can_write) codesToKeep.add(toCode(p, 'write'))
  }

  // 2. 取出該 role 目前所有非 platform.* 的 capabilities（要被矩陣覆蓋掉）
  const { data: existing, error: readErr } = await supabase
    .from('role_capabilities')
    .select('capability_code')
    .eq('role_id', roleId)

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  const existingNonPlatform = (existing ?? [])
    .map(r => r.capability_code)
    .filter(c => !c.startsWith('platform.'))

  // 3. 刪掉不再保留的（差集）
  const toDelete = existingNonPlatform.filter(c => !codesToKeep.has(c))
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('role_capabilities')
      .delete()
      .eq('role_id', roleId)
      .in('capability_code', toDelete)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. Upsert 保留的 codes 為 enabled=true
  const rowsToUpsert = Array.from(codesToKeep).map(code => ({
    role_id: roleId,
    capability_code: code,
    enabled: true,
  }))
  if (rowsToUpsert.length > 0) {
    const { error } = await supabase
      .from('role_capabilities')
      .upsert(rowsToUpsert, { onConflict: 'role_id,capability_code' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
