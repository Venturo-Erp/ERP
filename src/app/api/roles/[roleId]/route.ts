import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * DELETE /api/roles/[roleId]
 * 刪除角色（管理員角色擋下）
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

  const { error } = await supabase.from('workspace_roles').delete().eq('id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
