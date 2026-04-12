import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/todo-columns — 取得當前 workspace 的看板欄位
 */
export async function GET() {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { data, error } = await supabase
    .from('todo_columns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

/**
 * POST /api/todo-columns — 新增欄位
 */
export async function POST(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const body = await request.json()
  const { name, color = 'gray', sort_order } = body

  if (!name) return NextResponse.json({ error: '需要 name' }, { status: 400 })

  // 如果沒給 sort_order，放到最後
  let finalSortOrder = sort_order
  if (typeof finalSortOrder !== 'number') {
    const { data: maxData } = await supabase
      .from('todo_columns')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()
    finalSortOrder = (maxData?.sort_order || 0) + 1
  }

  const { data, error } = await supabase
    .from('todo_columns')
    .insert({ workspace_id: workspaceId, name, color, sort_order: finalSortOrder, is_system: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * PUT /api/todo-columns — 更新欄位（名稱、顏色、排序）
 * Body: { id, name?, color?, sort_order? }
 * 或批量排序：{ reorder: [{ id, sort_order }, ...] }
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()

  // 批量重新排序
  if (body.reorder && Array.isArray(body.reorder)) {
    for (const item of body.reorder) {
      await supabase
        .from('todo_columns')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    }
    return NextResponse.json({ success: true })
  }

  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: '需要 id' }, { status: 400 })

  const { data, error } = await supabase
    .from('todo_columns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/todo-columns?id=xxx — 刪除欄位（系統欄位不可刪）
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createApiClient()
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '需要 id' }, { status: 400 })

  const { data: column } = await supabase
    .from('todo_columns')
    .select('is_system')
    .eq('id', id)
    .single()

  if (column?.is_system) {
    return NextResponse.json({ error: '系統欄位不可刪除' }, { status: 403 })
  }

  const { error } = await supabase.from('todo_columns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
