'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Wallet, Download, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePayrollRun, type Payslip } from '@/features/hr/payroll/hooks/use-payroll-data'

export default function PayrollRunDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) ?? null
  const { data, mutate, isLoading } = usePayrollRun(id)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const run = data?.run
  const payslips = data?.payslips ?? []

  const warnings = useMemo(() => payslips.filter(p => p.has_warnings), [payslips])

  const handleFinalize = async () => {
    if (!id) return
    if (!window.confirm('確定要將此批次確定？確定後不可再修改')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/hr/payroll/runs/${id}/finalize`, {
        method: 'POST',
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('已確定批次')
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '確定失敗')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateRequests = async () => {
    if (!id) return
    if (
      !window.confirm(
        '一鍵請款：將為每位員工建立公司請款單（SAL-YYYYMM-NNN）、之後走進財務既有審核 / 出納流程。確定？'
      )
    )
      return
    setBusy(true)
    try {
      const res = await fetch(`/api/hr/payroll/runs/${id}/create-requests`, {
        method: 'POST',
        credentials: 'include',
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(
        `已建立 ${d.total_count} 筆薪資請款單、總額 NT$ ${d.total_amount.toLocaleString()}、出帳日 ${d.payday}`
      )
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '請款失敗')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!id) return
    window.open(`/api/hr/payroll/runs/${id}/export`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-morandi-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="p-8 text-center text-sm text-morandi-muted">找不到此薪資批次</div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title={`薪資批次 ${run.period_year}-${String(run.period_month).padStart(2, '0')}`}
        icon={Wallet}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資', href: '/hr/payroll' },
          { label: `${run.period_year}-${String(run.period_month).padStart(2, '0')}`, href: `/hr/payroll/${id}` },
        ]}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push('/hr/payroll')}>
          <ArrowLeft size={14} className="mr-1" />
          返回
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download size={14} className="mr-1" />
          匯出記帳士 CSV
        </Button>
        {run.status === 'draft' && (
          <Button
            size="sm"
            onClick={handleFinalize}
            disabled={busy}
            className="bg-morandi-green/15 text-morandi-green border border-morandi-green/30 hover:bg-morandi-green/25"
          >
            {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />}
            確定批次
          </Button>
        )}
        {run.status === 'finalized' && (
          <Button
            size="sm"
            onClick={handleCreateRequests}
            disabled={busy}
            className="bg-morandi-gold/15 text-morandi-gold border border-morandi-gold/30 hover:bg-morandi-gold/25"
          >
            {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <HandCoins size={14} className="mr-1" />}
            一鍵請款
          </Button>
        )}
        {run.status === 'paid' && (
          <span className="text-xs text-morandi-green flex items-center gap-1">
            <CheckCircle2 size={12} />
            已建立薪資請款單
          </span>
        )}
      </div>

      {/* 統計卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="員工數" value={run.total_employees.toString()} />
        <KpiCard label="應發合計" value={`NT$ ${run.total_gross_amount.toLocaleString()}`} />
        <KpiCard label="扣項合計" value={`NT$ ${run.total_deduction_amount.toLocaleString()}`} tone="warn" />
        <KpiCard label="實發合計" value={`NT$ ${run.total_net_amount.toLocaleString()}`} tone="green" />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-status-warning/40 bg-status-warning/10 p-4 text-sm">
          <div className="flex items-center gap-2 text-status-warning font-semibold mb-1">
            <AlertTriangle size={14} />
            {warnings.length} 位員工有警示
          </div>
          <p className="text-xs text-morandi-secondary">
            勞檢可能會看的合規問題。建議確定前 review 紅字並調整 employees.monthly_salary 或補發差額。
          </p>
        </div>
      )}

      {/* 員工明細 */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-morandi-secondary">
            <tr>
              <th className="text-left p-3 font-medium">員工</th>
              <th className="text-right p-3 font-medium">本薪</th>
              <th className="text-right p-3 font-medium">加班</th>
              <th className="text-right p-3 font-medium">應發</th>
              <th className="text-right p-3 font-medium">扣項</th>
              <th className="text-right p-3 font-medium">實領</th>
              <th className="text-center p-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {payslips.map(p => (
              <PayslipRow
                key={p.id}
                payslip={p}
                expanded={selected === p.id}
                onToggle={() => setSelected(selected === p.id ? null : p.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warn' | 'green'
}) {
  const cls = {
    default: 'text-morandi-primary',
    warn: 'text-status-warning',
    green: 'text-morandi-green',
  }[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="text-[11px] text-morandi-muted">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums mt-1', cls)}>{value}</div>
    </div>
  )
}

function PayslipRow({
  payslip,
  expanded,
  onToggle,
}: {
  payslip: Payslip
  expanded: boolean
  onToggle: () => void
}) {
  const totalDed =
    payslip.leave_deduction +
    payslip.attendance_bonus_deduction +
    payslip.labor_insurance_employee +
    payslip.health_insurance_employee +
    payslip.pension_voluntary
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn('cursor-pointer hover:bg-card/40 transition-colors', payslip.has_warnings && 'bg-status-warning/5')}
      >
        <td className="p-3">
          <div className="flex flex-col">
            <span className="font-medium text-morandi-primary">
              {payslip.employees?.display_name ?? payslip.employee_snapshot?.display_name ?? '—'}
            </span>
            <span className="text-[11px] text-morandi-muted font-mono">
              {payslip.employees?.employee_number ?? payslip.employee_snapshot?.employee_number ?? '—'}
            </span>
          </div>
        </td>
        <td className="p-3 text-right tabular-nums">{payslip.base_salary.toLocaleString()}</td>
        <td className="p-3 text-right tabular-nums">{payslip.overtime_pay.toLocaleString()}</td>
        <td className="p-3 text-right tabular-nums font-medium">{payslip.gross_amount.toLocaleString()}</td>
        <td className="p-3 text-right tabular-nums text-status-warning">−{Math.round(totalDed).toLocaleString()}</td>
        <td className="p-3 text-right tabular-nums font-semibold text-morandi-green">
          {payslip.net_amount.toLocaleString()}
        </td>
        <td className="p-3 text-center">
          {payslip.has_warnings ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-status-warning">
              <AlertTriangle size={10} />
              {payslip.warnings.length}
            </span>
          ) : (
            <CheckCircle2 size={12} className="inline text-morandi-green" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-card/30">
          <td colSpan={7} className="p-4 text-xs space-y-2">
            <div className="grid sm:grid-cols-3 gap-3">
              <DetailBlock title="收入面">
                <Detail label="本薪" value={payslip.base_salary} />
                <Detail label="加班費" value={payslip.overtime_pay} />
                <Detail label="全勤獎金" value={payslip.attendance_bonus} />
                <Detail label="其他津貼" value={payslip.other_allowances} />
              </DetailBlock>
              <DetailBlock title="扣項">
                <Detail label="請假扣薪" value={payslip.leave_deduction} negative />
                <Detail label="全勤扣減" value={payslip.attendance_bonus_deduction} negative />
                <Detail label="勞保(員工)" value={payslip.labor_insurance_employee} negative />
                <Detail label="健保(員工)" value={payslip.health_insurance_employee} negative />
                <Detail label="勞退自願" value={payslip.pension_voluntary} negative />
              </DetailBlock>
              <DetailBlock title="雇主負擔">
                <Detail label="勞保(雇主)" value={payslip.labor_insurance_employer} muted />
                <Detail label="健保(雇主)" value={payslip.health_insurance_employer} muted />
                <Detail label="勞退(雇主)" value={payslip.pension_employer} muted />
              </DetailBlock>
            </div>
            {payslip.has_warnings && (
              <div className="rounded-md bg-status-warning/10 border border-status-warning/30 p-2 space-y-1">
                {payslip.warnings.map((w, i) => (
                  <div key={i} className="text-status-warning">
                    ⚠ {w.message}
                  </div>
                ))}
              </div>
            )}
            {payslip.calc_breakdown?.log && payslip.calc_breakdown.log.length > 0 && (
              <details className="text-morandi-muted">
                <summary className="cursor-pointer hover:text-morandi-secondary">計算明細（給勞檢）</summary>
                <ul className="mt-1 space-y-0.5 pl-4 list-disc text-[11px]">
                  {payslip.calc_breakdown.log.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-morandi-secondary border-b border-border/40 pb-1">
        {title}
      </div>
      {children}
    </div>
  )
}

function Detail({
  label,
  value,
  negative,
  muted,
}: {
  label: string
  value: number
  negative?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className={muted ? 'text-morandi-muted' : 'text-morandi-secondary'}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          negative && 'text-status-warning',
          muted && 'text-morandi-muted'
        )}
      >
        {negative && value > 0 ? '−' : ''}
        {value.toLocaleString()}
      </span>
    </div>
  )
}
