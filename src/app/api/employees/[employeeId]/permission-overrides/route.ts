import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

interface PermissionOverride {
  module_code: string
  tab_code: string | null
  override_type: 'grant' | 'revoke' | null
}

/**
 * GET /api/employees/[employeeId]/permission-overrides
 * 取得員工的個人權限覆寫
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('employee_permission_overrides' as 'employees') // 型別 workaround
    .select('module_code, tab_code, override_type')
    .eq('employee_id', employeeId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/employees/[employeeId]/permission-overrides
 * 更新員工的個人權限覆寫（覆蓋式）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  const supabase = await createApiClient()
  const body = await request.json()
  const { overrides } = body as { overrides: PermissionOverride[] }

  if (!Array.isArray(overrides)) {
    return NextResponse.json({ error: '缺少 overrides 陣列' }, { status: 400 })
  }

  // 刪除舊的覆寫
  await supabase
    .from('employee_permission_overrides' as 'employees')
    .delete()
    .eq('employee_id', employeeId)

  // 只插入有覆寫的權限
  const overridesToInsert = overrides
    .filter(o => o.override_type)
    .map(o => ({
      employee_id: employeeId,
      module_code: o.module_code,
      tab_code: o.tab_code,
      override_type: o.override_type,
    }))

  if (overridesToInsert.length > 0) {
    const { error } = await supabase
      .from('employee_permission_overrides' as 'employees')
      .insert(overridesToInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
