import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/roles?workspace_id=xxx
 * 取得租戶的角色列表
 */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspace_id')
  
  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workspace_roles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/roles
 * 建立新角色
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { workspace_id, name, description } = body

  if (!workspace_id || !name) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 取得最大 sort_order
  const { data: maxOrder } = await supabase
    .from('workspace_roles')
    .select('sort_order')
    .eq('workspace_id', workspace_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id,
      name,
      description,
      is_admin: false,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
