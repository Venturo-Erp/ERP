'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveType, LeaveBalance } from '../hooks/use-leave-data'
import { calcTotalMinutes, calcLeaveDeduction } from '@/lib/hr/leave-calc'

interface Props {
  leaveTypes: LeaveType[]
  balances: LeaveBalance[]
  monthlySalary: number
  attendanceBonus: number
  onSubmitted: () => void
}

export function LeaveRequestForm({
  leaveTypes,
  balances,
  monthlySalary,
  attendanceBonus,
  onSubmitted,
}: Props) {
  const [leaveTypeId, setLeaveTypeId] = useState<string>('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedType = useMemo(
    () => leaveTypes.find(t => t.id === leaveTypeId) ?? null,
    [leaveTypes, leaveTypeId]
  )
  const selectedBalance = useMemo(
    () => balances.find(b => b.leave_type_id === leaveTypeId) ?? null,
    [balances, leaveTypeId]
  )

  // 即時計算
  const calc = useMemo(() => {
    if (!startAt || !endAt || !selectedType) return null
    const { minutes, days } = calcTotalMinutes(startAt, endAt)
    if (minutes <= 0) return { minutes: 0, days: 0, deduction: null }
    const ded = calcLeaveDeduction({
      monthlySalary,
      attendanceBonus,
      leaveMinutes: minutes,
      rules: {
        pay_type: selectedType.pay_type,
        attendance_bonus_flag: selectedType.attendance_bonus_flag,
      },
    })
    return { minutes, days, deduction: ded }
  }, [startAt, endAt, selectedType, monthlySalary, attendanceBonus])

  const balanceWarning = useMemo(() => {
    if (!calc || !selectedBalance) return null
    if (calc.days > selectedBalance.remaining_days) {
      return `假額不足：剩餘 ${selectedBalance.remaining_days.toFixed(2)} 天、申請 ${calc.days.toFixed(2)} 天`
    }
    return null
  }, [calc, selectedBalance])

  const handleSubmit = async () => {
    if (!leaveTypeId || !startAt || !endAt || !reason.trim()) {
      toast.error('請填寫所有必填欄位')
      return
    }
    if (balanceWarning) {
      toast.error(balanceWarning)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leave_type_id: leaveTypeId,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          reason: reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '送審失敗')
      toast.success(`已送審、預估扣薪 NT$ ${data.estimated_deduction?.total ?? 0}`)
      setLeaveTypeId('')
      setStartAt('')
      setEndAt('')
      setReason('')
      onSubmitted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '送審失敗'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-morandi-primary">新增請假</h3>
        {selectedType?.legal_basis && (
          <span className="text-[10px] text-morandi-muted">{selectedType.legal_basis}</span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">假別 *</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="選擇假別" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map(t => {
                const bal = balances.find(b => b.leave_type_id === t.id)
                const remaining = bal?.remaining_days
                return (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span>{t.name}</span>
                      {remaining != null && (
                        <span className="text-[10px] text-morandi-muted">
                          (剩 {remaining.toFixed(1)} 天)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5" />

        <div className="space-y-1.5">
          <Label className="text-xs">開始時間 *</Label>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={e => setStartAt(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">結束時間 *</Label>
          <Input
            type="datetime-local"
            value={endAt}
            onChange={e => setEndAt(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">請假事由 *</Label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="簡述請假事由（200 字以內）"
            maxLength={200}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      {/* 即時預覽 */}
      {calc && calc.minutes > 0 && (
        <div
          className={cn(
            'rounded-lg p-4 border space-y-1 text-sm',
            balanceWarning
              ? 'bg-status-danger/10 border-status-danger/30 text-status-danger'
              : 'bg-morandi-container/30 border-border/60'
          )}
        >
          <div className="flex justify-between">
            <span className="text-morandi-secondary">總時數</span>
            <span className="font-semibold tabular-nums">
              {(calc.minutes / 60).toFixed(2)} 小時 = {calc.days.toFixed(2)} 天
            </span>
          </div>
          {calc.deduction && (
            <>
              <div className="flex justify-between">
                <span className="text-morandi-secondary">預估扣薪</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    calc.deduction.total > 0 ? 'text-status-warning' : 'text-morandi-green'
                  )}
                >
                  NT$ {calc.deduction.total.toFixed(0)}
                </span>
              </div>
              <div className="text-[11px] text-morandi-muted leading-relaxed">
                {calc.deduction.breakdown}
              </div>
            </>
          )}
          {balanceWarning && (
            <div className="text-xs font-semibold mt-2">⚠ {balanceWarning}</div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !!balanceWarning || !leaveTypeId}
          className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          送出審核
        </Button>
      </div>
    </div>
  )
}
