import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/employees/create
 * 建立新員工（包含 Supabase Auth 帳號）
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ message: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const { password, ...employeeData } = body

    if (!employeeData.employee_number || !employeeData.chinese_name) {
      return NextResponse.json({ message: '缺少必填欄位' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. 取得當前用戶的 workspace_id
    const { data: currentUser } = await supabaseAdmin
      .from('employees')
      .select('workspace_id')
      .eq('id', auth.data.employeeId)
      .single()

    if (!currentUser?.workspace_id) {
      return NextResponse.json({ message: '無法取得租戶資訊' }, { status: 400 })
    }

    // 2. 取得 workspace code + 員工上限
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('code, max_employees')
      .eq('id', currentUser.workspace_id)
      .single()

    const workspaceCode = workspace?.code?.toLowerCase() || 'corner'

    // 2.5 檢查員工數量上限
    const maxEmployees = (workspace as Record<string, unknown>)?.max_employees as number | null
    if (maxEmployees != null) {
      const { count } = await supabaseAdmin
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentUser.workspace_id)
        .neq('status', 'terminated')

      if (count != null && count >= maxEmployees) {
        return NextResponse.json(
          { message: `已達員工數量上限（${maxEmployees} 人），請升級方案或聯繫管理員` },
          { status: 403 }
        )
      }
    }

    // 3. 建立 Supabase Auth 帳號
    const authEmail = `${workspaceCode}_${employeeData.employee_number.toLowerCase()}@venturo.com`

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: password || '12345678',
      email_confirm: true,
    })

    if (authError) {
      logger.error('Failed to create auth user:', authError)
      return NextResponse.json({ message: '建立登入帳號失敗' }, { status: 500 })
    }

    // 4. 建立員工資料
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        ...employeeData,
        workspace_id: currentUser.workspace_id,
        supabase_user_id: authUser.user.id,
        must_change_password: true,
      })
      .select('id, employee_number')
      .single()

    if (empError) {
      // Rollback: 刪除剛建立的 auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      logger.error('Failed to create employee:', empError)
      return NextResponse.json({ message: empError.message }, { status: 500 })
    }

    logger.log(`Employee created: ${employee.employee_number}`)

    // 5. 請假餘額初始化（2026-04-23：leave_types/balances 整族砍除、邏輯移除）
    // 之後重做 HR 請假系統時、在這裡恢復初始化邏輯

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_number: employee.employee_number,
      },
    })
  } catch (error) {
    logger.error('Create employee error:', error)
    return NextResponse.json({ message: '伺服器錯誤' }, { status: 500 })
  }
}
