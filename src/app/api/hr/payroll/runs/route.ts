/**
 * /api/hr/payroll/runs
 *
 * GET → 列出 workspace 的薪資批次（最近 12 期）
 * POST → 產生新薪資批次（draft、依月份算所有員工 payslips）
 *
 * POST body：{ period_year, period_month }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import {
  computePayslip,
  type EmployeeInput,
  type LeaveEntry,
  type OvertimeEntry,
} from '@/lib/hr/payroll-engine'
import { LAW_VERSION, checkLawValidity } from '@/lib/hr/law-constants'

interface EmployeeRow {
  id: string
  display_name: string | null
  employee_number: string | null
  monthly_salary: number | null
  salary_info: { attendance_bonus?: number; other_allowances?: number; insured_salary?: number; pension_voluntary_rate?: number } | null
  status: string
}

interface LeaveRequestRow {
  employee_id: string
  total_minutes: number
  total_days: number
  leave_types: { code: string; pay_type: string; attendance_bonus_flag: string } | null
}

interface OvertimeRow {
  employee_id: string
  hours: number
  overtime_type: string
}

export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('workspace_id', auth.data.workspaceId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12)

    if (error) {
      logger.error('查 payroll_runs 失敗', error)
      return NextResponse.json({ error: '查薪資批次失敗' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET /api/hr/payroll/runs 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

interface CreatePayload {
  period_year: number
  period_month: number
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const body = (await req.json()) as CreatePayload
    if (!body?.period_year || !body?.period_month) {
      return NextResponse.json({ error: '需要 period_year + period_month' }, { status: 400 })
    }

    const lawCheck = checkLawValidity()

    const supabase = getSupabaseAdminClient()

    // 防重複建（同月已有 → 回既有）
    const { data: existing } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('period_year', body.period_year)
      .eq('period_month', body.period_month)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'finalized') {
        return NextResponse.json(
          { error: `${body.period_year}-${body.period_month} 已 finalized、無法重新計算` },
          { status: 400 }
        )
      }
      // draft / reviewing 狀態 → 重算 payslips、不建新 run
      // 簡化：先回 existing id、由 client 拉明細
      return NextResponse.json({ id: existing.id, recomputed: false, message: '本月份已有 draft 批次' })
    }

    // 拿在職員工
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, display_name, employee_number, monthly_salary, salary_info, status')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'active')
      .neq('employee_type', 'bot')

    if (empErr) {
      logger.error('查 employees 失敗', empErr)
      return NextResponse.json({ error: '查員工失敗' }, { status: 500 })
    }

    const empList = (employees ?? []) as EmployeeRow[]
    if (empList.length === 0) {
      return NextResponse.json({ error: '當前 workspace 沒有在職員工' }, { status: 400 })
    }

    // 期間範圍
    const periodStart = new Date(body.period_year, body.period_month - 1, 1).toISOString()
    const periodEnd = new Date(body.period_year, body.period_month, 1).toISOString()

    // 拿該月所有已核准請假
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select(
        'employee_id, total_minutes, total_days, leave_types (code, pay_type, attendance_bonus_flag)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'approved')
      .gte('start_at', periodStart)
      .lt('start_at', periodEnd)

    const leaveByEmp = new Map<string, LeaveEntry[]>()
    for (const l of (leaves ?? []) as unknown as LeaveRequestRow[]) {
      if (!l.leave_types) continue
      const arr = leaveByEmp.get(l.employee_id) ?? []
      arr.push({
        leave_type_code: l.leave_types.code,
        pay_type: l.leave_types.pay_type as 'full' | 'half' | 'unpaid',
        attendance_bonus_flag: l.leave_types.attendance_bonus_flag as 'protected' | 'proportional' | 'deductible',
        total_minutes: l.total_minutes,
        total_days: Number(l.total_days),
      })
      leaveByEmp.set(l.employee_id, arr)
    }

    // 拿該月所有已核准加班
    const { data: ots } = await supabase
      .from('overtime_requests')
      .select('employee_id, hours, overtime_type')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'approved')
      .gte('date', periodStart.slice(0, 10))
      .lt('date', periodEnd.slice(0, 10))

    const otByEmp = new Map<string, OvertimeEntry[]>()
    for (const o of (ots ?? []) as OvertimeRow[]) {
      const arr = otByEmp.get(o.employee_id) ?? []
      // 簡化：直接用 overtime_type 對應 OVERTIME_RATES key
      const typeMap: Record<string, OvertimeEntry['type']> = {
        weekday: 'weekday_first_2h',
        rest_day: 'rest_day_first_2h',
        holiday: 'holiday_first_8h',
        official_holiday: 'holiday_first_8h',
      }
      arr.push({ hours: Number(o.hours), type: typeMap[o.overtime_type] ?? 'weekday_first_2h' })
      otByEmp.set(o.employee_id, arr)
    }

    // 拿該年累計病假天數（給 2026 保護期警示）
    const { data: yearlySick } = await supabase
      .from('leave_requests')
      .select('employee_id, total_days, leave_types!inner(code)')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('status', 'approved')
      .gte('start_at', new Date(body.period_year, 0, 1).toISOString())
      .lt('start_at', new Date(body.period_year + 1, 0, 1).toISOString())
      .eq('leave_types.code', 'sick')

    const yearlySickByEmp = new Map<string, number>()
    for (const r of (yearlySick ?? []) as { employee_id: string; total_days: number }[]) {
      yearlySickByEmp.set(r.employee_id, (yearlySickByEmp.get(r.employee_id) ?? 0) + Number(r.total_days))
    }

    // 建 payroll_run
    const { data: runRow, error: runErr } = await supabase
      .from('payroll_runs')
      .insert({
        workspace_id: auth.data.workspaceId,
        period_year: body.period_year,
        period_month: body.period_month,
        status: 'draft',
        total_employees: 0,
        total_gross_amount: 0,
        total_deduction_amount: 0,
        total_net_amount: 0,
        law_version: LAW_VERSION,
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      })
      .select('id')
      .single()

    if (runErr || !runRow) {
      logger.error('insert payroll_run 失敗', runErr)
      return NextResponse.json({ error: '建批次失敗' }, { status: 500 })
    }

    // 對每位員工算 payslip + insert
    let totalGross = 0
    let totalDed = 0
    let totalNet = 0
    let warningCount = 0

    const payslipsToInsert = empList.map(emp => {
      const empInput: EmployeeInput = {
        id: emp.id,
        display_name: emp.display_name,
        employee_number: emp.employee_number,
        monthly_salary: Number(emp.monthly_salary ?? 30000),
        attendance_bonus: Number(emp.salary_info?.attendance_bonus ?? 0),
        other_allowances: Number(emp.salary_info?.other_allowances ?? 0),
        pension_voluntary_rate: Number(emp.salary_info?.pension_voluntary_rate ?? 0),
        insured_salary: emp.salary_info?.insured_salary ?? null,
      }
      const result = computePayslip({
        employee: empInput,
        overtimes: otByEmp.get(emp.id) ?? [],
        leaves: leaveByEmp.get(emp.id) ?? [],
        yearlySickDays: yearlySickByEmp.get(emp.id) ?? 0,
      })

      totalGross += result.gross_amount
      totalDed += result.total_deductions + result.leave_deduction + result.attendance_bonus_deduction
      totalNet += result.net_amount
      if (result.warnings.length > 0) warningCount++

      return {
        workspace_id: auth.data.workspaceId,
        payroll_run_id: runRow.id,
        employee_id: emp.id,
        period_year: body.period_year,
        period_month: body.period_month,
        employee_snapshot: {
          display_name: emp.display_name,
          employee_number: emp.employee_number,
          monthly_salary: empInput.monthly_salary,
          attendance_bonus: empInput.attendance_bonus,
        },
        gross_amount: result.gross_amount,
        base_salary: result.base_salary,
        overtime_pay: result.overtime_pay,
        attendance_bonus: result.attendance_bonus,
        other_allowances: result.other_allowances,
        leave_deduction: result.leave_deduction,
        attendance_bonus_deduction: result.attendance_bonus_deduction,
        labor_insurance_employee: result.labor_insurance_employee,
        health_insurance_employee: result.health_insurance_employee,
        pension_voluntary: result.pension_voluntary,
        income_tax: result.income_tax,
        other_deductions: result.other_deductions,
        labor_insurance_employer: result.labor_insurance_employer,
        health_insurance_employer: result.health_insurance_employer,
        pension_employer: result.pension_employer,
        calc_breakdown: { log: result.breakdown_log, law_version: result.law_version },
        has_warnings: result.warnings.length > 0,
        warnings: JSON.parse(JSON.stringify(result.warnings)),
        net_amount: result.net_amount,
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      }
    })

    const { error: psErr } = await supabase.from('payslips').insert(payslipsToInsert)
    if (psErr) {
      logger.error('insert payslips 失敗', psErr)
      return NextResponse.json({ error: '建薪資單失敗' }, { status: 500 })
    }

    // 更新 run 統計
    await supabase
      .from('payroll_runs')
      .update({
        total_employees: empList.length,
        total_gross_amount: Math.round(totalGross),
        total_deduction_amount: Math.round(totalDed),
        total_net_amount: Math.round(totalNet),
        updated_by: auth.data.employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runRow.id)

    return NextResponse.json({
      id: runRow.id,
      total_employees: empList.length,
      total_gross: Math.round(totalGross),
      total_net: Math.round(totalNet),
      warning_count: warningCount,
      law_check: lawCheck,
    })
  } catch (err) {
    logger.error('POST /api/hr/payroll/runs 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
