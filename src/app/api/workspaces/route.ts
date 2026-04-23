import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getBasicFeatures } from '@/lib/permissions'
import { MODULES } from '@/lib/permissions/module-tabs'

/**
 * GET /api/workspaces
 * 取得所有租戶（需要 tenants 功能權限）
 */
export async function GET() {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 檢查用戶是否有 tenants 功能權限
  const supabase = createServiceClient()
  const { data: feature } = await supabase
    .from('workspace_features')
    .select('enabled')
    .eq('workspace_id', auth.data.workspaceId)
    .eq('feature_code', 'tenants')
    .single()

  if (!feature?.enabled) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  // 有權限 → 查所有 workspaces
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 取得所有擁有管理員資格的職務 id
  const { data: adminRoles } = await supabase
    .from('workspace_roles')
    .select('id')
    .eq('is_admin', true)
  const adminRoleIds = new Set((adminRoles || []).map(r => r.id))

  // 批次查詢所有員工（排除機器人）— 用來計算每個 workspace 的員工數 + 找代表
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, workspace_id, chinese_name, display_name, english_name, is_bot, role_id')
    .or('is_bot.is.null,is_bot.eq.false')

  // 建立 workspace_id → 員工清單的 map
  const byWorkspace = new Map<
    string,
    {
      count: number
      admin: { name: string; id: string } | null
    }
  >()
  for (const emp of (allEmployees || []) as Array<{
    id: string
    workspace_id: string
    chinese_name: string | null
    display_name: string | null
    english_name: string | null
    role_id: string | null
  }>) {
    const wsId = emp.workspace_id
    if (!wsId) continue
    const entry = byWorkspace.get(wsId) || { count: 0, admin: null }
    entry.count += 1
    // 找第一個擁有管理員資格的員工當代表（SSOT：workspace_roles.is_admin）
    if (!entry.admin && emp.role_id && adminRoleIds.has(emp.role_id)) {
      entry.admin = {
        id: emp.id,
        name: emp.display_name || emp.chinese_name || emp.english_name || '',
      }
    }
    byWorkspace.set(wsId, entry)
  }

  // 附加到每個 workspace
  const enriched = (workspaces || []).map(ws => {
    const entry = byWorkspace.get(ws.id)
    return {
      ...ws,
      employee_count: entry?.count ?? 0,
      admin_name: entry?.admin?.name ?? null,
      admin_id: entry?.admin?.id ?? null,
    }
  })

  return NextResponse.json(enriched)
}

/**
 * POST /api/workspaces
 * 建立新租戶 + 初始化權限
 *
 * 注意：這是平台管理操作、使用 service client
 *
 * 會自動：
 * 1. 建立租戶 (workspaces)
 * 2. 開啟基本功能 (workspace_features)
 * 3. 建立系統主管角色 (workspace_roles)
 * 4. 設定系統主管角色全開權限 (role_tab_permissions)
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const {
    name,
    code,
    type = 'travel_agency',
    adminName,
    adminEmail,
    adminEmployeeNumber = 'E001',
  } = body

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

  // 3. 建立系統主管角色
  const { data: adminRole, error: roleError } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name: '系統主管',
      description: '擁有所有權限',
      is_admin: true,
      sort_order: 1,
    })
    .select()
    .single()

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  // 4. 設定系統主管角色全開權限（所有模組、所有分頁）
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

  // 6. 建立第一個系統主管員工（必須要有一個員工，才能登入）
  if (adminName) {
    const { error: empError } = await supabase.from('employees').insert({
      workspace_id: workspaceId,
      employee_number: adminEmployeeNumber,
      chinese_name: adminName,
      display_name: adminName,
      email: adminEmail || null,
      roles: ['admin'],
      role_id: adminRole.id, // 🔑 連結到剛建立的系統主管角色（權限檢查用）
      job_info: { role_id: adminRole.id, position: '系統主管' },
      is_active: true,
      is_bot: false,
      must_change_password: true, // 首次登入強制改密碼
    })
    if (empError) {
      // 員工建失敗不回滾（workspace 已建成），但 log 出來

      console.error('建立系統主管員工失敗:', empError)
    }
  }

  return NextResponse.json({
    success: true,
    workspace,
    message: '租戶建立完成，已開啟基本功能、建立系統主管角色與第一個系統主管員工',
  })
}
