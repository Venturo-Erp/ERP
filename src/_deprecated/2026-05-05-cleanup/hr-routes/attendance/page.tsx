'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Calendar, Loader2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClockRow {
  id: string
  employee_id: string
  clock_type: 'clock_in' | 'clock_out'
  clock_at: string
  clock_date: string
  source: string
  is_remote: boolean
  status: string
  late_minutes: number
  note: string | null
  employees: { display_name: string | null; employee_number: string | null } | null
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })

export default function AttendancePage() {
  const router = useRouter()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [filter, setFilter] = useState<'all' | 'abnormal'>('all')

  const url = `/api/hr/clock-records?month=${month}${filter === 'abnormal' ? '&status=abnormal' : ''}`
  const { data, isLoading } = useSWR<ClockRow[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  const rows = data ?? []

  const stats = useMemo(() => {
    const total = rows.length
    const abnormal = rows.filter(r => r.status !== 'normal').length
    const remote = rows.filter(r => r.is_remote).length
    const employees = new Set(rows.map(r => r.employee_id)).size
    return { total, abnormal, remote, employees }
  }, [rows])

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="出勤管理"
        icon={Calendar}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '出勤', href: '/hr/attendance' },
        ]}
        tabs={[
          { value: '/hr/attendance', label: '出勤管理' },
          { value: '/hr/leave', label: '請假管理' },
          { value: '/hr/overtime', label: '加班審核' },
          { value: '/hr/missed-clock', label: '補打卡審核' },
        ]}
        activeTab="/hr/attendance"
        onTabChange={href => router.push(href)}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-morandi-primary">月份</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/60 bg-card/50 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-morandi-primary">過濾</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as 'all' | 'abnormal')}
            className="h-10 px-3 rounded-md border border-border/60 bg-card/50 text-sm"
          >
            <option value="all">全部</option>
            <option value="abnormal">只看異常</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="打卡次數" value={stats.total.toString()} />
        <KpiCard label="員工數" value={stats.employees.toString()} />
        <KpiCard label="異常次數" value={stats.abnormal.toString()} tone={stats.abnormal > 0 ? 'warn' : 'default'} />
        <KpiCard label="外勤打卡" value={stats.remote.toString()} tone={stats.remote > 0 ? 'info' : 'default'} />
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-morandi-secondary">
            <tr>
              <th className="text-left p-3 font-medium">員工</th>
              <th className="text-left p-3 font-medium">日期</th>
              <th className="text-left p-3 font-medium">時間</th>
              <th className="text-left p-3 font-medium">類型</th>
              <th className="text-left p-3 font-medium">來源</th>
              <th className="text-center p-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-morandi-muted">
                  <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-morandi-muted">
                  此月份無打卡紀錄
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className={cn('hover:bg-card/40', r.status !== 'normal' && 'bg-status-warning/5')}>
                  <td className="p-3">
                    <div className="font-medium text-morandi-primary">
                      {r.employees?.display_name ?? '—'}
                    </div>
                    <div className="text-[11px] text-morandi-muted font-mono">
                      {r.employees?.employee_number ?? '—'}
                    </div>
                  </td>
                  <td className="p-3 text-morandi-primary tabular-nums">{r.clock_date}</td>
                  <td className="p-3 text-morandi-primary tabular-nums">
                    {new Date(r.clock_at).toTimeString().slice(0, 5)}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full',
                        r.clock_type === 'clock_in'
                          ? 'bg-morandi-green/15 text-morandi-green'
                          : 'bg-morandi-gold/15 text-morandi-gold'
                      )}
                    >
                      {r.clock_type === 'clock_in' ? '上班' : '下班'}
                    </span>
                  </td>
                  <td className="p-3 text-morandi-secondary text-xs">
                    {r.is_remote && (
                      <span className="inline-flex items-center gap-1 text-status-warning mr-2">
                        <MapPin size={10} /> 外勤
                      </span>
                    )}
                    {r.source}
                  </td>
                  <td className="p-3 text-center">
                    {r.status === 'late' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-status-warning">
                        <AlertTriangle size={10} /> 遲到 {r.late_minutes}min
                      </span>
                    ) : r.status === 'normal' ? (
                      <CheckCircle2 size={12} className="inline text-morandi-green" />
                    ) : (
                      <span className="text-[11px] text-morandi-muted">{r.status}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' | 'info' }) {
  const cls = {
    default: 'text-morandi-primary',
    warn: 'text-status-warning',
    info: 'text-morandi-blue',
  }[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="text-[11px] text-morandi-muted">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums mt-1', cls)}>{value}</div>
    </div>
  )
}
