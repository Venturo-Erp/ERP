'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Wallet, Plus, ChevronRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePayrollRuns } from '@/features/hr/payroll/hooks/use-payroll-data'

export default function PayrollPage() {
  const router = useRouter()
  const { data: runs, mutate, isLoading } = usePayrollRuns()
  const [creating, setCreating] = useState(false)

  const now = new Date()
  const defaultYear = now.getFullYear()
  const defaultMonth = now.getMonth() + 1

  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/hr/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ period_year: year, period_month: month }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`已建立 ${year}-${month} 薪資批次（${data.total_employees} 位員工、${data.warning_count} 筆警示）`)
      mutate()
      router.push(`/hr/payroll/${data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="薪資管理"
        icon={Wallet}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資', href: '/hr/payroll' },
        ]}
        tabs={[
          { value: '/hr/payroll', label: '薪資管理' },
          { value: '/hr/deductions', label: '扣款與津貼' },
          { value: '/hr/reports', label: '出勤月報' },
        ]}
        activeTab="/hr/payroll"
        onTabChange={href => router.push(href)}
      />

      {/* 建批次區塊 */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-morandi-primary">產生薪資批次</h2>
          <span className="text-[10px] text-morandi-muted">
            選定月份後、系統會自動拉出在職員工的出勤 / 請假 / 加班、套規則計算
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-morandi-primary">年</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="h-10 px-3 rounded-md border border-border/60 bg-card/50 text-sm"
            >
              {[year - 2, year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-morandi-primary">月</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="h-10 px-3 rounded-md border border-border/60 bg-card/50 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25"
          >
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            產生批次
          </Button>
        </div>
        <p className="text-[11px] text-morandi-muted leading-relaxed">
          ⚠️ MVP 簡化版：勞健保用估算費率（不含完整 11 / 58 / 62 級對照表）、所得稅暫不算。
          實際以勞保局申報為準。
        </p>
      </div>

      {/* 批次列表 */}
      <div>
        <h2 className="text-sm font-semibold text-morandi-primary mb-2">最近 12 期</h2>
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center text-sm text-morandi-muted">
            <Loader2 className="w-4 h-4 mx-auto animate-spin mb-2" />
            載入中…
          </div>
        ) : !runs || runs.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center text-sm text-morandi-muted">
            尚未建立任何薪資批次
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map(r => (
              <button
                key={r.id}
                onClick={() => router.push(`/hr/payroll/${r.id}`)}
                className="w-full rounded-xl border border-border/60 bg-card/70 p-4 hover:border-border/80 hover:bg-card transition-colors text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-morandi-primary tabular-nums">
                        {r.period_year}-{String(r.period_month).padStart(2, '0')}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-morandi-secondary mt-1 flex flex-wrap gap-x-3">
                      <span>{r.total_employees} 位員工</span>
                      <span>應發 NT$ {r.total_gross_amount.toLocaleString()}</span>
                      <span>實發 NT$ {r.total_net_amount.toLocaleString()}</span>
                      {r.law_version && (
                        <span className="text-morandi-muted">法規 {r.law_version}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-morandi-muted shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    draft: { label: '草稿', cls: 'bg-morandi-muted/15 text-morandi-secondary', icon: null },
    reviewing: { label: '審核中', cls: 'bg-status-warning/15 text-status-warning', icon: AlertTriangle },
    finalized: { label: '已確定', cls: 'bg-morandi-green/15 text-morandi-green', icon: CheckCircle2 },
    paid: { label: '已發放', cls: 'bg-morandi-gold/15 text-morandi-gold', icon: CheckCircle2 },
  }
  const tone = map[status as keyof typeof map] ?? map.draft
  const Icon = tone.icon
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1', tone.cls)}>
      {Icon && <Icon size={10} />}
      {tone.label}
    </span>
  )
}
