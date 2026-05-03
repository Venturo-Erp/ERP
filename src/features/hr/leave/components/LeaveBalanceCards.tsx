'use client'

import { Calendar, AlertCircle, Heart, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveBalance } from '../hooks/use-leave-data'

const PAY_TYPE_TONE: Record<string, { bg: string; ring: string; label: string; text: string }> = {
  full: { bg: 'from-morandi-green/15 to-morandi-green/5', ring: 'ring-morandi-green/30', text: 'text-morandi-green', label: '工資照給' },
  half: { bg: 'from-status-warning/15 to-status-warning/5', ring: 'ring-status-warning/30', text: 'text-status-warning', label: '半薪' },
  unpaid: { bg: 'from-morandi-muted/20 to-morandi-muted/5', ring: 'ring-morandi-muted/30', text: 'text-morandi-secondary', label: '無薪' },
}

const ICON_BY_CODE: Record<string, typeof Calendar> = {
  annual: Calendar,
  sick: AlertCircle,
  personal: Coffee,
  marriage: Heart,
  bereavement: Calendar,
  menstrual: Heart,
  family_care: Heart,
  official: Calendar,
  official_injury: AlertCircle,
}

interface Props {
  balances: LeaveBalance[]
}

export function LeaveBalanceCards({ balances }: Props) {
  if (balances.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center text-sm text-morandi-muted">
        本年度沒有假額紀錄
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {balances.map(b => {
        const lt = b.leave_type
        if (!lt) return null
        const tone = PAY_TYPE_TONE[lt.pay_type] ?? PAY_TYPE_TONE.unpaid
        const Icon = ICON_BY_CODE[lt.code] ?? Calendar
        const isLow = b.remaining_days < 3 && b.remaining_days > 0
        const isEmpty = b.remaining_days <= 0
        return (
          <div
            key={b.id}
            className={cn(
              'rounded-xl border p-4 bg-gradient-to-br',
              tone.bg,
              'border-border/60 ring-1',
              tone.ring,
              isEmpty && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={cn('rounded-lg p-1.5 bg-card/60', tone.text)}>
                  <Icon size={14} />
                </div>
                <span className="text-sm font-semibold text-morandi-primary">{lt.name}</span>
              </div>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full bg-card/70', tone.text)}>
                {tone.label}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    isEmpty ? 'text-morandi-muted' : isLow ? 'text-status-warning' : 'text-morandi-primary'
                  )}
                >
                  {b.remaining_days.toFixed(1)}
                </span>
                <span className="text-xs text-morandi-secondary">/ {b.total_days.toFixed(0)} 天</span>
              </div>
              <div className="text-[10px] text-morandi-muted">
                已用 {b.used_days.toFixed(1)} · 待審 {b.pending_days.toFixed(1)}
              </div>
            </div>
            {lt.attendance_bonus_flag === 'protected' && (
              <div className="mt-2 text-[10px] text-morandi-green/80">✓ 不影響全勤獎金</div>
            )}
            {lt.attendance_bonus_flag === 'proportional' && (
              <div className="mt-2 text-[10px] text-status-warning/80">⚠ 全勤按比例扣</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
