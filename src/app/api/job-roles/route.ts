import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/job-roles
 * 取得當前租戶的職務標籤列表
 */
export async function GET() {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('workspace_job_roles')
    .select('id, name, sort_order, created_at')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/job-roles
 * 建立新職務標籤
 */
export async function POST(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '缺少職務名稱' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('workspace_job_roles')
    .select('sort_order')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('workspace_job_roles')
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '此職務名稱已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/job-roles
 * 刪除職務標籤（body: { id })
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workspace_job_roles')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
