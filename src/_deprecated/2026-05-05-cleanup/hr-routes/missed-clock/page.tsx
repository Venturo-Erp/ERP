'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { ClockArrowUp, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Row {
  id: string
  employee_id: string
  date: string
  clock_type: 'clock_in' | 'clock_out'
  requested_time: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reject_reason: string | null
  created_at: string
  employees: { display_name: string | null; employee_number: string | null } | null
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })

export default function MissedClockPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const url = `/api/hr/missed-clock-requests?scope=workspace${filter === 'pending' ? '&status=pending' : ''}`
  const { data, mutate, isLoading } = useSWR<Row[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  const handle = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | null = null
    if (action === 'reject') {
      reason = window.prompt('請輸入駁回事由')
      if (!reason?.trim()) return
    }
    setBusy(id)
    try {
      const res = await fetch(`/api/hr/missed-clock-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: action === 'reject' ? JSON.stringify({ reason }) : undefined,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      toast.success(action === 'approve' ? '已核准（已寫入打卡紀錄）' : '已駁回')
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="補打卡審核"
        icon={ClockArrowUp}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '補打卡審核', href: '/hr/missed-clock' },
        ]}
        tabs={[
          { value: '/hr/attendance', label: '出勤管理' },
          { value: '/hr/leave', label: '請假管理' },
          { value: '/hr/overtime', label: '加班審核' },
          { value: '/hr/missed-clock', label: '補打卡審核' },
        ]}
        activeTab="/hr/missed-clock"
        onTabChange={href => router.push(href)}
      />

      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'pending' ? 'default' : 'ghost'} onClick={() => setFilter('pending')}>
          待審
        </Button>
        <Button size="sm" variant={filter === 'all' ? 'default' : 'ghost'} onClick={() => setFilter('all')}>
          全部
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-morandi-muted">
          <Loader2 className="w-4 h-4 mx-auto animate-spin" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center text-sm text-morandi-muted">
          {filter === 'pending' ? '目前沒有待審核補打卡申請' : '無補打卡紀錄'}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map(r => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-morandi-primary">
                      {r.employees?.display_name ?? '—'}
                      <span className="text-xs text-morandi-muted ml-1">{r.employees?.employee_number}</span>
                    </span>
                    <StatusBadge status={r.status} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-container/50 text-morandi-secondary">
                      {r.clock_type === 'clock_in' ? '上班補卡' : '下班補卡'}
                    </span>
                  </div>
                  <div className="text-xs text-morandi-secondary">
                    {r.date} · 補打 {r.requested_time}
                  </div>
                  <div className="text-xs text-morandi-muted">{r.reason}</div>
                  {r.reject_reason && (
                    <div className="text-xs text-status-danger">駁回事由：{r.reject_reason}</div>
                  )}
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => handle(r.id, 'approve')}
                      className="h-8 bg-morandi-green/15 text-morandi-green border border-morandi-green/30"
                    >
                      {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '核准'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() => handle(r.id, 'reject')}
                      className="h-8 text-status-danger"
                    >
                      駁回
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    pending: { label: '待審', icon: AlertCircle, cls: 'bg-status-warning/15 text-status-warning' },
    approved: { label: '已核准', icon: CheckCircle2, cls: 'bg-morandi-green/15 text-morandi-green' },
    rejected: { label: '已駁回', icon: XCircle, cls: 'bg-status-danger/15 text-status-danger' },
    cancelled: { label: '已撤銷', icon: XCircle, cls: 'bg-morandi-muted/15 text-morandi-muted' },
  }
  const tone = map[status as keyof typeof map] ?? map.pending
  const Icon = tone.icon
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1', tone.cls)}>
      <Icon size={10} />
      {tone.label}
    </span>
  )
}
