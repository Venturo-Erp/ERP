import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const DEFAULT_ROLES = [
  {
    name: '管理員',
    description: '擁有 workspace 內所有管理權限',
    is_admin: true,
    sort_order: 1,
  },
  {
    name: '業務',
    description: '可建立報價單、管理客戶和訂單',
    is_admin: false,
    sort_order: 2,
  },
  {
    name: '會計',
    description: '可管理財務、付款和會計相關功能',
    is_admin: false,
    sort_order: 3,
  },
  {
    name: '助理',
    description: '可協助處理訂單、客戶和一般行政工作',
    is_admin: false,
    sort_order: 4,
  },
]

const PERMISSION_ROUTES = [
  '/tours',
  '/orders',
  '/quotes',
  '/finance/payments',
  '/finance/requests',
  '/finance/treasury',
  '/accounting',
  '/database',
  '/customers',
  '/hr',
  '/calendar',
  '/channel',
  '/todos',
  '/itinerary',
  '/settings',
]

async function createDefaultRoles() {
  console.log('🔧 為所有 workspace 建立預設角色...\n')

  // 查詢所有 workspace
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, code, name')

  if (wsError) {
    console.error('❌ 查詢 workspace 失敗:', wsError)
    return
  }

  console.log(`✅ 找到 ${workspaces.length} 個 workspace\n`)

  for (const workspace of workspaces) {
    console.log(`📍 處理 ${workspace.code} (${workspace.name})...`)

    // 檢查是否已有角色
    const { data: existingRoles } = await supabase
      .from('workspace_roles')
      .select('name')
      .eq('workspace_id', workspace.id)

    if (existingRoles && existingRoles.length > 0) {
      console.log(`   ⏭️  已有 ${existingRoles.length} 個角色，跳過`)
      continue
    }

    // 建立 4 個預設角色
    for (const roleTemplate of DEFAULT_ROLES) {
      const { data: role, error: roleError } = await supabase
        .from('workspace_roles')
        .insert({
          workspace_id: workspace.id,
          name: roleTemplate.name,
          description: roleTemplate.description,
          is_admin: roleTemplate.is_admin,
          sort_order: roleTemplate.sort_order,
        })
        .select()
        .single()

      if (roleError) {
        console.error(`   ❌ 建立角色 ${roleTemplate.name} 失敗:`, roleError)
        continue
      }

      console.log(`   ✅ ${roleTemplate.name}`)

      // 如果是管理員，給所有權限
      if (roleTemplate.is_admin) {
        const permissions = PERMISSION_ROUTES.map(route => ({
          workspace_id: workspace.id,
          role_id: role.id,
          route,
          can_read: true,
          can_write: true,
        }))

        const { error: permError } = await supabase
          .from('role_route_permissions')
          .insert(permissions)

        if (permError) {
          console.error(`   ❌ 設定管理員權限失敗:`, permError)
        } else {
          console.log(`      → 已設定 ${permissions.length} 個權限`)
        }
      }
      // 業務權限
      else if (roleTemplate.name === '業務') {
        const salesPermissions = PERMISSION_ROUTES.filter(route =>
          ['/tours', '/orders', '/quotes', '/customers', '/calendar', '/channel', '/todos', '/itinerary', '/finance/payments'].includes(route)
        ).map(route => ({
          workspace_id: workspace.id,
          role_id: role.id,
          route,
          can_read: true,
          can_write: true,
        }))

        await supabase.from('role_route_permissions').insert(salesPermissions)
        console.log(`      → 已設定 ${salesPermissions.length} 個權限`)
      }
      // 會計權限
      else if (roleTemplate.name === '會計') {
        const accountantPermissions = PERMISSION_ROUTES.filter(route =>
          ['/finance/payments', '/finance/requests', '/finance/treasury', '/accounting', '/tours', '/orders', '/customers', '/database', '/calendar', '/channel', '/todos'].includes(route)
        ).map(route => ({
          workspace_id: workspace.id,
          role_id: role.id,
          route,
          can_read: true,
          can_write: true,
        }))

        await supabase.from('role_route_permissions').insert(accountantPermissions)
        console.log(`      → 已設定 ${accountantPermissions.length} 個權限`)
      }
      // 助理權限
      else if (roleTemplate.name === '助理') {
        const assistantPermissions = PERMISSION_ROUTES.filter(route =>
          ['/orders', '/customers', '/tours', '/calendar', '/channel', '/todos'].includes(route)
        ).map(route => ({
          workspace_id: workspace.id,
          role_id: role.id,
          route,
          can_read: true,
          can_write: route !== '/tours', // 旅遊團只能讀
        }))

        await supabase.from('role_route_permissions').insert(assistantPermissions)
        console.log(`      → 已設定 ${assistantPermissions.length} 個權限`)
      }
    }

    console.log('')
  }

  console.log('🎉 完成！所有 workspace 已建立預設角色')
}

createDefaultRoles().then(() => process.exit(0))
