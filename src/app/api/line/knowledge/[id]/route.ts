import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * PUT /api/line/knowledge/[id]
 * 更新知識庫項目
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: '缺少 ID' }, { status: 400 })
    }

    const body = await request.json()
    const { category, question, answer, keywords, is_active } = body

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (category !== undefined) updateData.category = category
    if (question !== undefined) updateData.question = question
    if (answer !== undefined) updateData.answer = answer
    if (keywords !== undefined) updateData.keywords = keywords
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('knowledge_base 更新失敗:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API PUT /api/line/knowledge/[id] 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * DELETE /api/line/knowledge/[id]
 * 刪除知識庫項目（軟刪除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: '缺少 ID' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 軟刪除：設定 is_active 為 false
    const { error } = await supabase
      .from('knowledge_base')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('knowledge_base 刪除失敗:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API DELETE /api/line/knowledge/[id] 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
