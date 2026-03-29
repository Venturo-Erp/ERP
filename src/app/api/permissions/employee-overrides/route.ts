import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/permissions/employee-overrides?employee_id=xxx
 * 取得員工的個人權限覆寫
 */
export async function GET(request: NextRequest) {
  const supabase = await createApiClient()
  const employeeId = request.nextUrl.searchParams.get('employee_id')
  
  if (!employeeId) {
    return NextResponse.json({ error: '缺少 employee_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employee_route_overrides')
    .select('route, override_type, can_read, can_write')
    .eq('employee_id', employeeId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/permissions/employee-overrides
 * 更新員工的個人權限覆寫（覆蓋式）
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { employee_id, overrides } = body

  if (!employee_id || !Array.isArray(overrides)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 先刪除舊的覆寫
  await supabase
    .from('employee_route_overrides')
    .delete()
    .eq('employee_id', employee_id)

  // 插入新的覆寫（只插入有覆寫的）
  const toInsert = overrides
    .filter((o: { override_type?: string }) => o.override_type)
    .map((o: { route: string; override_type: string; can_read?: boolean; can_write?: boolean }) => ({
      employee_id,
      route: o.route,
      override_type: o.override_type,
      can_read: o.can_read || false,
      can_write: o.can_write || false,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('employee_route_overrides')
      .insert(toInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, count: toInsert.length })
}
