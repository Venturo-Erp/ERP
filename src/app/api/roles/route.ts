import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/roles
 * 取得當前租戶的角色列表
 * （不需要傳 workspace_id，自動取得）
 */
export async function GET() {
  const supabase = await createApiClient()

  // RLS 會自動過濾，只回傳當前租戶的角色
  const { data, error } = await supabase
    .from('workspace_roles')
    .select('*')
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
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description } = body

  if (!name) {
    return NextResponse.json({ error: '缺少角色名稱' }, { status: 400 })
  }

  // 取得最大 sort_order（RLS 會自動過濾）
  const { data: roles } = await supabase
    .from('workspace_roles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (roles?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
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
