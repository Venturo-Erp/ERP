/**
 * GET /api/hr/payroll/runs/[id]/export
 * 匯出記帳士格式 CSV
 *
 * 欄位：員工編號 / 姓名 / 月份 / 應發 / 勞保 / 健保 / 勞退 / 請假扣 / 全勤扣 / 其他扣 / 實領 / 雇主勞保 / 雇主健保 / 雇主勞退 / 警示
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

interface PayslipRow {
  period_year: number
  period_month: number
  base_salary: number
  overtime_pay: number
  attendance_bonus: number
  other_allowances: number
  gross_amount: number
  leave_deduction: number
  attendance_bonus_deduction: number
  labor_insurance_employee: number
  health_insurance_employee: number
  pension_voluntary: number
  income_tax: number
  other_deductions: number
  net_amount: number
  labor_insurance_employer: number
  health_insurance_employer: number
  pension_employer: number
  has_warnings: boolean
  warnings: { message: string }[]
  employees: { display_name: string | null; employee_number: string | null } | null
}

function escapeCSV(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: payslips, error } = await supabase
      .from('payslips')
      .select(
        '*, employees!payslips_employee_id_fkey (display_name, employee_number)'
      )
      .eq('payroll_run_id', id)
      .eq('workspace_id', auth.data.workspaceId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('查 payslips 失敗', error)
      return NextResponse.json({ error: '查薪資失敗' }, { status: 500 })
    }

    const rows = (payslips ?? []) as unknown as PayslipRow[]

    const headers = [
      '員工編號',
      '姓名',
      '年月',
      '本薪',
      '加班費',
      '全勤獎金',
      '其他津貼',
      '應發合計',
      '請假扣薪',
      '全勤扣減',
      '勞保(員工)',
      '健保(員工)',
      '勞退(員工自願)',
      '所得稅',
      '其他扣項',
      '實領',
      '勞保(雇主)',
      '健保(雇主)',
      '勞退(雇主)',
      '警示',
    ]

    const lines: string[] = [headers.join(',')]
    for (const r of rows) {
      const period = `${r.period_year}-${String(r.period_month).padStart(2, '0')}`
      const warningStr = r.has_warnings
        ? (r.warnings ?? []).map(w => w.message).join(' | ')
        : ''
      lines.push(
        [
          escapeCSV(r.employees?.employee_number),
          escapeCSV(r.employees?.display_name),
          escapeCSV(period),
          r.base_salary,
          r.overtime_pay,
          r.attendance_bonus,
          r.other_allowances,
          r.gross_amount,
          r.leave_deduction,
          r.attendance_bonus_deduction,
          r.labor_insurance_employee,
          r.health_insurance_employee,
          r.pension_voluntary,
          r.income_tax,
          r.other_deductions,
          r.net_amount,
          r.labor_insurance_employer,
          r.health_insurance_employer,
          r.pension_employer,
          escapeCSV(warningStr),
        ].join(',')
      )
    }

    const bom = '﻿' // Excel UTF-8 BOM
    const csv = bom + lines.join('\n')
    const filename = `payroll_${id.slice(0, 8)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error('GET payroll export 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
