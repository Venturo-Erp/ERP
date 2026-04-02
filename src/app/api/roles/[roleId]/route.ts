import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/roles/[roleId]
 * 取得單一角色（RLS 自動過濾）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('workspace_roles')
    .select('id, name, description, is_admin, sort_order, workspace_id, created_at, updated_at')
    .eq('id', roleId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/roles/[roleId]
 * 刪除角色
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params
  const supabase = await createApiClient()

  // 檢查是否為管理員角色
  const { data: role } = await supabase
    .from('workspace_roles')
    .select('is_admin')
    .eq('id', roleId)
    .single()

  if (role?.is_admin) {
    return NextResponse.json({ error: '無法刪除管理員角色' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workspace_roles')
    .delete()
    .eq('id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
