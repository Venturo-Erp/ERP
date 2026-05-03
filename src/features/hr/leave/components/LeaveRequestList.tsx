'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveRequest } from '../hooks/use-leave-data'

const STATUS_TONE: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  pending: { bg: 'bg-status-warning/10', text: 'text-status-warning', icon: Clock, label: '待審' },
  approved: { bg: 'bg-morandi-green/10', text: 'text-morandi-green', icon: CheckCircle2, label: '已核准' },
  rejected: { bg: 'bg-status-danger/10', text: 'text-status-danger', icon: XCircle, label: '已駁回' },
  cancelled: { bg: 'bg-morandi-muted/15', text: 'text-morandi-muted', icon: X, label: '已撤銷' },
  draft: { bg: 'bg-morandi-muted/15', text: 'text-morandi-muted', icon: Clock, label: '草稿' },
}

interface Props {
  requests: LeaveRequest[]
  mode: 'mine' | 'review'
  onActionDone: () => void
}

export function LeaveRequestList({ requests, mode, onActionDone }: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  const fmtDate = (s: string) => {
    const d = new Date(s)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const handleApprove = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/hr/leave-requests/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('已核准')
      onActionDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '核准失敗')
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('請輸入駁回事由')
    if (!reason?.trim()) return
    setBusy(id)
    try {
      const res = await fetch(`/api/hr/leave-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('已駁回')
      onActionDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '駁回失敗')
    } finally {
      setBusy(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('確定要撤銷這筆請假？')) return
    setBusy(id)
    try {
      const res = await fetch(`/api/hr/leave-requests/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('已撤銷')
      onActionDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setBusy(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center text-sm text-morandi-muted">
        {mode === 'mine' ? '尚無請假紀錄' : '目前沒有待審核的請假單'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {requests.map(r => {
        const tone = STATUS_TONE[r.status] ?? STATUS_TONE.pending
        const Icon = tone.icon
        return (
          <div
            key={r.id}
            className="rounded-xl border border-border/60 bg-card/70 p-4 hover:border-border/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {mode === 'review' && r.employees && (
                    <span className="text-sm font-semibold text-morandi-primary">
                      {r.employees.display_name ?? '—'}
                      <span className="text-xs text-morandi-muted ml-1">
                        {r.employees.employee_number}
                      </span>
                    </span>
                  )}
                  <span className="text-sm font-medium text-morandi-primary">
                    {r.leave_types?.name ?? '—'}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1',
                      tone.bg,
                      tone.text
                    )}
                  >
                    <Icon size={10} />
                    {tone.label}
                  </span>
                </div>
                <div className="text-xs text-morandi-secondary">
                  {fmtDate(r.start_at)} → {fmtDate(r.end_at)} · {r.total_days.toFixed(2)} 天
                  {r.estimated_deduction_amount != null && r.estimated_deduction_amount > 0 && (
                    <span className="ml-2 text-status-warning">
                      預估扣薪 NT$ {r.estimated_deduction_amount.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-morandi-muted line-clamp-2">{r.reason}</div>
                {r.reject_reason && (
                  <div className="text-xs text-status-danger">駁回事由：{r.reject_reason}</div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 items-end shrink-0">
                {mode === 'review' && r.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => handleApprove(r.id)}
                      className="h-8 bg-morandi-green/15 text-morandi-green border border-morandi-green/30 hover:bg-morandi-green/25"
                    >
                      {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '核准'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() => handleReject(r.id)}
                      className="h-8 text-status-danger hover:bg-status-danger/10"
                    >
                      駁回
                    </Button>
                  </>
                )}
                {mode === 'mine' && r.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === r.id}
                    onClick={() => handleCancel(r.id)}
                    className="h-8 text-morandi-muted hover:text-status-danger"
                  >
                    {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '撤銷'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
