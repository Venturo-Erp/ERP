import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 先用 employee_number 查
  let { data, error } = await supabase
    .from('employees')
    .select('id, employee_number, display_name, english_name, email, avatar, status, workspace_id, job_info, is_active')
    .eq('employee_number', ref)
    .single()

  // 如果查不到，用 display_name 查
  if (!data) {
    const result = await supabase.from('employees').select('id, employee_number, display_name, english_name, email, avatar, status, workspace_id, job_info, is_active').eq('display_name', ref).single()
    data = result.data
    error = result.error
  }

  if (error || !data) {
    return NextResponse.json({ error: '找不到業務' }, { status: 404 })
  }

  return NextResponse.json(data)
}
