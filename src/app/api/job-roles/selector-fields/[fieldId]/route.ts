import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * PUT /api/job-roles/selector-fields/[fieldId]
 * 更新選人欄位 + 重建映射
 * body: { name, level, is_required, role_ids }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const body = await request.json()
  const { name, level, is_required, role_ids } = body

  // 更新欄位
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updateData.name = name.trim()
  if (level !== undefined) updateData.level = level
  if (is_required !== undefined) updateData.is_required = is_required

  const { data: field, error } = await supabase
    .from('workspace_selector_fields')
    .update(updateData)
    .eq('id', fieldId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '此欄位名稱已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 重建映射（刪除舊的 + 插入新的）
  if (role_ids !== undefined) {
    await supabase.from('selector_field_roles').delete().eq('field_id', fieldId)

    if (role_ids.length > 0) {
      const mappings = role_ids.map((role_id: string) => ({
        field_id: fieldId,
        role_id,
      }))

      const { error: mapError } = await supabase.from('selector_field_roles').insert(mappings)

      if (mapError) {
        return NextResponse.json({ error: mapError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json(field)
}

/**
 * DELETE /api/job-roles/selector-fields/[fieldId]
 * 刪除選人欄位（CASCADE 會自動刪映射）
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const { error } = await supabase
    .from('workspace_selector_fields')
    .delete()
    .eq('id', fieldId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
