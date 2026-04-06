import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function fixAdminPerms() {
  const { data: ws } = await supabase.from('workspaces').select('id').eq('code', 'CORNER').single()

  const { data: role } = await supabase
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', ws!.id)
    .eq('name', '管理員')
    .single()

  const routes = [
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

  const perms = routes.map(route => ({
    role_id: role!.id,
    route,
    can_read: true,
    can_write: true,
  }))

  const { error } = await supabase.from('role_route_permissions').insert(perms)

  console.log(error ? '❌ ' + error.message : '✅ 管理員權限已設定')
}

fixAdminPerms().then(() => process.exit(0))
