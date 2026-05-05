/**
 * /api/hr/leave-requests
 *
 * GET → 拿請假紀錄
 *   - 預設：自己的（依登入員工）
 *   - admin / 主管帶 ?scope=workspace 拿整個 workspace
 *   - 帶 ?status=pending 過濾
 *
 * POST → 提交請假
 *   - server-side 重算 minutes / days / 預估扣薪
 *   - 檢查餘額（total - used - pending >= 申請）
 *   - 寫 leave_requests + 更新 leave_balances.pending_days
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { calcTotalMinutes, calcLeaveDeduction } from '@/lib/hr/leave-calc'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') ?? 'mine'
    const status = url.searchParams.get('status')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)

    const supabase = getSupabaseAdminClient()
    let q = supabase
      .from('leave_requests')
      .select(
        'id, employee_id, leave_type_id, start_at, end_at, total_minutes, total_days, reason, status, approver_id, approved_at, reject_reason, estimated_deduction_amount, created_at, leave_types (code, name, pay_type, attendance_bonus_flag), employees!leave_requests_employee_id_fkey (display_name, employee_number)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (scope !== 'workspace') {
      q = q.eq('employee_id', auth.data.employeeId)
    }
    if (status) {
      q = q.eq('status', status)
    }

    const { data, error } = await q

    if (error) {
      logger.error('查 leave_requests 失敗', error)
      return NextResponse.json({ error: '查請假紀錄失敗' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET /api/hr/leave-requests 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

interface CreatePayload {
  leave_type_id: string
  start_at: string
  end_at: string
  reason: string
  attachments?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const body = (await req.json()) as CreatePayload
    if (!body?.leave_type_id || !body.start_at || !body.end_at || !body.reason?.trim()) {
      return NextResponse.json(
        { error: '假別 / 起訖時間 / 事由必填' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // 拿假別規則
    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('id, code, name, pay_type, attendance_bonus_flag, requires_attachment, attachment_threshold_days, supports_hourly, default_days_per_year')
      .eq('id', body.leave_type_id)
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (!leaveType) {
      return NextResponse.json({ error: '假別不存在' }, { status: 400 })
    }

    // 算時數
    const { minutes, days } = calcTotalMinutes(body.start_at, body.end_at)
    if (minutes <= 0) {
      return NextResponse.json({ error: '結束時間必須晚於開始時間' }, { status: 400 })
    }

    // 拿員工資料（要 monthly_salary 算扣薪）+ 餘額
    const [empRes, balRes] = await Promise.all([
      supabase
        .from('employees')
        .select('monthly_salary, salary_info')
        .eq('id', auth.data.employeeId)
        .single(),
      supabase
        .from('leave_balances')
        .select('id, total_days, used_days, pending_days')
        .eq('employee_id', auth.data.employeeId)
        .eq('leave_type_id', body.leave_type_id)
        .eq('year', new Date(body.start_at).getFullYear())
        .maybeSingle(),
    ])

    if (empRes.error) {
      logger.error('查 employee 失敗', empRes.error)
      return NextResponse.json({ error: '查員工資料失敗' }, { status: 500 })
    }

    // 餘額檢查（event_based / no_limit 跳過）
    const isQuotaBound = balRes.data != null
    if (isQuotaBound) {
      const remaining =
        Number(balRes.data!.total_days) -
        Number(balRes.data!.used_days) -
        Number(balRes.data!.pending_days)
      if (remaining < days) {
        return NextResponse.json(
          { error: `假額不足，剩餘 ${remaining.toFixed(2)} 天、申請 ${days.toFixed(2)} 天` },
          { status: 400 }
        )
      }
    }

    // 算預估扣薪
    const monthlySalary = Number(empRes.data?.monthly_salary ?? 0)
    const salaryInfo = (empRes.data?.salary_info ?? {}) as { attendance_bonus?: number }
    const attendanceBonus = Number(salaryInfo.attendance_bonus ?? 0)
    const deduction = calcLeaveDeduction({
      monthlySalary,
      attendanceBonus,
      leaveMinutes: minutes,
      rules: {
        pay_type: leaveType.pay_type as 'full' | 'half' | 'unpaid',
        attendance_bonus_flag: leaveType.attendance_bonus_flag as 'protected' | 'proportional' | 'deductible',
      },
    })

    // 寫請假申請
    const { data: inserted, error: insertErr } = await supabase
      .from('leave_requests')
      .insert({
        workspace_id: auth.data.workspaceId,
        employee_id: auth.data.employeeId,
        leave_type_id: body.leave_type_id,
        start_at: body.start_at,
        end_at: body.end_at,
        total_minutes: minutes,
        total_days: days,
        reason: body.reason.trim(),
        attachments: body.attachments ?? [],
        estimated_deduction_amount: deduction.total,
        status: 'pending',
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      })
      .select('id, status')
      .single()

    if (insertErr) {
      logger.error('insert leave_requests 失敗', insertErr)
      return NextResponse.json({ error: '送審失敗' }, { status: 500 })
    }

    // 預扣 leave_balances.pending_days
    if (isQuotaBound && balRes.data) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Number(balRes.data.pending_days) + days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', balRes.data.id)
    }

    return NextResponse.json({
      id: inserted.id,
      status: inserted.status,
      total_days: days,
      total_minutes: minutes,
      estimated_deduction: deduction,
    })
  } catch (err) {
    logger.error('POST /api/hr/leave-requests 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
