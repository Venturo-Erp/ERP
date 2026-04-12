import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'

/**
 * GET /api/workspaces/[workspaceId]
 * 取得租戶詳情（含員工人數、管理員資訊）
 *
 * 注意：這是 Super Admin 操作，可以查看任何租戶（使用 service_client 繞過 RLS）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, code, type, is_active, premium_enabled')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  // 查真人員工（排除機器人）
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, chinese_name, display_name, english_name, roles, is_bot, created_at')
    .eq('workspace_id', workspaceId)
    .or('is_bot.is.null,is_bot.eq.false')
    .order('created_at', { ascending: true })

  const realEmployees = (employees || []) as Array<{
    id: string
    employee_number: string | null
    chinese_name: string | null
    display_name: string | null
    english_name: string | null
    roles: string[] | null
    is_bot: boolean | null
    created_at: string
  }>

  // 找第一個 admin
  const adminEmployee = realEmployees.find(
    e => Array.isArray(e.roles) && e.roles.includes('admin')
  ) || realEmployees[0] // fallback：沒 admin 就取第一個員工

  const adminName = adminEmployee
    ? adminEmployee.display_name || adminEmployee.chinese_name || adminEmployee.english_name || '未知'
    : null

  return NextResponse.json({
    ...data,
    employee_count: realEmployees.length,
    admin_name: adminName,
    admin_id: adminEmployee?.id || null,
    admin_employee_number: adminEmployee?.employee_number || null,
  })
}
