'use client'

import useSWR from 'swr'

export interface PayrollRun {
  id: string
  workspace_id: string
  period_year: number
  period_month: number
  status: 'draft' | 'reviewing' | 'finalized' | 'paid'
  total_employees: number
  total_gross_amount: number
  total_deduction_amount: number
  total_net_amount: number
  law_version: string | null
  finalized_at: string | null
  created_at: string
}

export interface Payslip {
  id: string
  employee_id: string
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
  warnings: { code: string; severity: string; message: string }[]
  calc_breakdown: { log: string[]; law_version?: string }
  employee_snapshot: { display_name?: string; employee_number?: string }
  employees: { display_name: string | null; employee_number: string | null } | null
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })

export function usePayrollRuns() {
  return useSWR<PayrollRun[]>('/api/hr/payroll/runs', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

export function usePayrollRun(id: string | null) {
  return useSWR<{ run: PayrollRun; payslips: Payslip[] }>(
    id ? `/api/hr/payroll/runs/${id}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  )
}
