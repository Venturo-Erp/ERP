import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'

/**
 * DELETE /api/roles/[roleId]
 * 刪除角色（系統主管角色擋下）
 *
 * 2026-05-06：補上 capability 守門（之前只靠 RLS 兜底）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const guard = await requireCapability('hr.roles.write')
  if (!guard.ok) return guard.response

  const { roleId } = await params
  const supabase = await createApiClient()

  // 檢查職務是否擁有管理員資格
  const { data: role } = await supabase
    .from('workspace_roles')
    .select('is_admin')
    .eq('id', roleId)
    .single()

  if (role?.is_admin) {
    return NextResponse.json({ error: '無法刪除擁有管理員資格的職務' }, { status: 400 })
  }

  const { error } = await supabase.from('workspace_roles').delete().eq('id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
