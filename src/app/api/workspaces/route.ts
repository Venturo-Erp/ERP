import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'
import { getBasicFeatures } from '@/lib/permissions'
import { MODULES } from '@/lib/permissions/module-tabs'

/**
 * POST /api/workspaces
 * 建立新租戶 + 初始化權限
 * 
 * 注意：這是 Super Admin 操作，使用 service client
 * 
 * 會自動：
 * 1. 建立租戶 (workspaces)
 * 2. 開啟基本功能 (workspace_features)
 * 3. 建立管理員角色 (workspace_roles)
 * 4. 設定管理員角色全開權限 (role_tab_permissions)
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { name, code, type = 'travel_agency' } = body

  if (!name || !code) {
    return NextResponse.json({ error: '缺少 name 或 code' }, { status: 400 })
  }

  // 1. 建立租戶
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name,
      code: code.toUpperCase(),
      type,
      is_active: true,
    })
    .select()
    .single()

  if (wsError) {
    return NextResponse.json({ error: wsError.message }, { status: 500 })
  }

  const workspaceId = workspace.id

  // 2. 開啟基本功能
  const basicFeatures = getBasicFeatures()
  const featuresToInsert = basicFeatures.map(f => ({
    workspace_id: workspaceId,
    feature_code: f.code,
    enabled: true,
    enabled_at: new Date().toISOString(),
  }))

  await supabase.from('workspace_features').insert(featuresToInsert)

  // 3. 建立管理員角色
  const { data: adminRole, error: roleError } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name: '管理員',
      description: '擁有所有權限',
      is_admin: true,
      sort_order: 1,
    })
    .select()
    .single()

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  // 4. 設定管理員角色全開權限（所有模組、所有分頁）
  const permissionsToInsert: {
    role_id: string
    module_code: string
    tab_code: string | null
    can_read: boolean
    can_write: boolean
  }[] = []

  MODULES.forEach(module => {
    if (module.tabs.length === 0) {
      // 無分頁模組
      permissionsToInsert.push({
        role_id: adminRole.id,
        module_code: module.code,
        tab_code: null,
        can_read: true,
        can_write: true,
      })
    } else {
      // 有分頁模組：每個分頁都開
      module.tabs.forEach(tab => {
        permissionsToInsert.push({
          role_id: adminRole.id,
          module_code: module.code,
          tab_code: tab.code,
          can_read: true,
          can_write: true,
        })
      })
    }
  })

  await supabase.from('role_tab_permissions').insert(permissionsToInsert)

  // 5. 建立其他預設角色（可選）
  const defaultRoles = [
    { name: '業務', description: '負責銷售與客戶服務', sort_order: 2 },
    { name: '會計', description: '負責財務與帳務', sort_order: 3 },
    { name: 'OP', description: '負責操作與行程安排', sort_order: 4 },
  ]

  for (const role of defaultRoles) {
    await supabase.from('workspace_roles').insert({
      workspace_id: workspaceId,
      ...role,
      is_admin: false,
    })
  }

  return NextResponse.json({
    success: true,
    workspace,
    message: '租戶建立完成，已開啟基本功能並建立管理員角色',
  })
}
