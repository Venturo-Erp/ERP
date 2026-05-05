'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Wallet, Loader2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAYSLIP_LABELS } from './constants/labels'

interface MyPayslip {
  id: string
  period_year: number
  period_month: number
  base_salary: number
  overtime_pay: number
  attendance_bonus: number
  attendance_bonus_deduction: number
  other_allowances: number
  gross_amount: number
  leave_deduction: number
  labor_insurance_employee: number
  health_insurance_employee: number
  pension_voluntary: number
  income_tax: number
  other_deductions: number
  net_amount: number
  has_warnings: boolean
  warnings: { message: string; severity: string }[]
  calc_breakdown: { log: string[] } | null
  payroll_runs: { status: string; finalized_at: string | null } | null
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })

export default function MyPayslipPage() {
  const { data, isLoading } = useSWR<MyPayslip[]>('/api/hr/payslips', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title={PAYSLIP_LABELS.MY_PAYSLIP}
        icon={Wallet}
        breadcrumb={[{ label: PAYSLIP_LABELS.MY_PAYSLIP, href: '/payslip' }]}
      />

      {isLoading ? (
        <div className="p-8 text-center text-morandi-muted">
          <Loader2 className="w-4 h-4 mx-auto animate-spin" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/50 p-12 text-center text-sm text-morandi-muted">
          {PAYSLIP_LABELS.NO_PAYSLIP_YET}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map(p => {
            const isOpen = expanded === p.id
            const isFinalized = p.payroll_runs?.status === 'finalized' || p.payroll_runs?.status === 'paid'
            return (
              <div key={p.id} className="rounded-xl border border-border/60 bg-card/70 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-card/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div>
                      <div className="text-base font-semibold text-morandi-primary tabular-nums">
                        {p.period_year}-{String(p.period_month).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-morandi-muted">
                        {isFinalized ? PAYSLIP_LABELS.FINALIZED : PAYSLIP_LABELS.DRAFT}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-morandi-secondary">{PAYSLIP_LABELS.NET_AMOUNT}</div>
                    <div className="text-xl font-bold text-morandi-green tabular-nums">
                      NT$ {p.net_amount.toLocaleString()}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border/40 bg-card/30 p-4 space-y-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-morandi-secondary border-b border-border/40 pb-1">
                          收入
                        </div>
                        <Row label="本薪" value={p.base_salary} />
                        {p.overtime_pay > 0 && <Row label="加班費" value={p.overtime_pay} />}
                        {p.attendance_bonus > 0 && (
                          <Row
                            label="全勤獎金"
                            value={p.attendance_bonus - p.attendance_bonus_deduction}
                            note={p.attendance_bonus_deduction > 0 ? `(已扣 ${p.attendance_bonus_deduction})` : undefined}
                          />
                        )}
                        {p.other_allowances > 0 && <Row label="其他津貼" value={p.other_allowances} />}
                        <Row label="應發合計" value={p.gross_amount} bold />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-morandi-secondary border-b border-border/40 pb-1">
                          扣項
                        </div>
                        {p.leave_deduction > 0 && <Row label="請假扣薪" value={-p.leave_deduction} />}
                        {p.labor_insurance_employee > 0 && (
                          <Row label="勞保（員工）" value={-p.labor_insurance_employee} />
                        )}
                        {p.health_insurance_employee > 0 && (
                          <Row label="健保（員工）" value={-p.health_insurance_employee} />
                        )}
                        {p.pension_voluntary > 0 && (
                          <Row label="勞退自願提繳" value={-p.pension_voluntary} />
                        )}
                        <Row label="實領" value={p.net_amount} bold green />
                      </div>
                    </div>
                    {p.has_warnings && p.warnings.length > 0 && (
                      <div className="rounded bg-status-warning/10 border border-status-warning/30 p-2 text-xs">
                        {p.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-1 text-status-warning">
                            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {p.calc_breakdown?.log && (
                      <details className="text-[11px] text-morandi-muted">
                        <summary className="cursor-pointer">計算明細</summary>
                        <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                          {p.calc_breakdown.log.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  green,
  note,
}: {
  label: string
  value: number
  bold?: boolean
  green?: boolean
  note?: string
}) {
  const negative = value < 0
  return (
    <div className="flex justify-between items-baseline">
      <span className={cn('text-xs', bold ? 'text-morandi-primary font-semibold' : 'text-morandi-secondary')}>
        {label}
        {note && <span className="text-[10px] text-morandi-muted ml-1">{note}</span>}
      </span>
      <span
        className={cn(
          'tabular-nums',
          bold ? 'font-bold' : 'font-medium',
          green ? 'text-morandi-green' : negative ? 'text-status-warning' : 'text-morandi-primary'
        )}
      >
        {negative ? '−' : ''} {Math.abs(value).toLocaleString()}
      </span>
    </div>
  )
}
