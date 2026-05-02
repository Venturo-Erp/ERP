import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerAuth } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  // 🔒 D3 P0 修復：必須登入 + 限定當前 workspace
  // 之前 service_role + employee_number / display_name 純值查、可枚舉跨租戶員工
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }
  const workspaceId = auth.data.workspaceId

  const { ref } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 先用 employee_number 查（限定 workspace）
  let { data, error } = await supabase
    .from('employees')
    .select(
      'id, employee_number, display_name, english_name, email, avatar_url, status, workspace_id, job_info'
    )
    .eq('workspace_id', workspaceId)
    .eq('employee_number', ref)
    .single()

  // 如果查不到，用 display_name 查（同樣限定 workspace）
  if (!data) {
    const result = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, email, avatar_url, status, workspace_id, job_info'
      )
      .eq('workspace_id', workspaceId)
      .eq('display_name', ref)
      .single()
    data = result.data
    error = result.error
  }

  if (error || !data) {
    return NextResponse.json({ error: '找不到業務' }, { status: 404 })
  }

  return NextResponse.json(data)
}
