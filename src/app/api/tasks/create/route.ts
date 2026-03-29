import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * POST /api/tasks/create
 * 建立任務
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const workspaceId = await getCurrentWorkspaceId()

    if (!workspaceId) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority = 'P1', assignees = [], created_by = 'william' } = body

    if (!title) {
      return NextResponse.json({ error: '缺少任務標題' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title,
        description: description || null,
        priority,
        assignees,
        created_by,
        status: 'todo',
        progress: 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      task: data,
    })
  } catch {
    return NextResponse.json({ error: '建立任務失敗' }, { status: 500 })
  }
}
