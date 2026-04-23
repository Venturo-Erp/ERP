'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ClockStatus {
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  status: string | null
}

export function ClockInWidget() {
  const user = useAuthStore(state => state.user)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/hr/clock-in')
      if (res.ok) setClockStatus(await res.json())
    } catch (err) {
      logger.error('查詢打卡狀態失敗:', err)
    }
  }, [user?.id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setLoading(true)
    try {
      const res = await fetch('/api/hr/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, source: 'web' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        fetchStatus()
      } else toast.error(data.error)
    } catch {
      toast.error('打卡失敗')
    } finally {
      setLoading(false)
    }
  }

  const twTime = new Date(currentTime.getTime() + 8 * 60 * 60 * 1000)
  const timeStr = twTime.toISOString().split('T')[1].slice(0, 8)
  const dateStr = currentTime.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Taipei',
  })

  const hasClockedIn = !!clockStatus?.clock_in
  const hasClockedOut = !!clockStatus?.clock_out

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-muted via-card to-morandi-container/30">
        <div className="p-4 space-y-3 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'rounded-full p-2 text-white shadow-sm shadow-black/10',
                'bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60',
                'ring-1 ring-border/50'
              )}
            >
              <LogIn className="w-4 h-4 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                打卡
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1">{dateStr}</p>
            </div>
          </div>

          {/* 時間顯示 */}
          <div className="rounded-xl bg-card/70 p-4 shadow-md border border-border/40 flex-1 flex items-center justify-center">
            <div className="text-center w-full">
              <div className="text-4xl font-mono font-bold text-morandi-primary tracking-wider tabular-nums">
                {timeStr}
              </div>
              {hasClockedIn && (
                <div className="flex items-center justify-center gap-3 mt-3 text-xs text-morandi-secondary">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-morandi-green" />
                    上班 {clockStatus?.clock_in?.slice(0, 5)}
                  </span>
                  {hasClockedOut && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-morandi-gold" />
                      下班 {clockStatus?.clock_out?.slice(0, 5)}
                    </span>
                  )}
                  {clockStatus?.work_hours && (
                    <span className="text-morandi-muted">{clockStatus.work_hours.toFixed(1)}h</span>
                  )}
                </div>
              )}
              {clockStatus?.status === 'late' && (
                <p className="text-xs text-status-warning mt-1">遲到</p>
              )}
            </div>
          </div>

          {/* 打卡按鈕 */}
          <div className="flex gap-3 flex-shrink-0">
            <Button
              size="sm"
              disabled={loading || hasClockedIn}
              onClick={() => handleClock('clock_in')}
              className={cn(
                'flex-1 rounded-xl transition-all duration-200 font-semibold',
                hasClockedIn
                  ? 'bg-gradient-to-br from-morandi-green/10 to-morandi-green/20 border border-morandi-green/30 text-morandi-green'
                  : 'bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg'
              )}
            >
              {hasClockedIn ? '已上班' : '上班'}
            </Button>
            <Button
              size="sm"
              disabled={loading || !hasClockedIn || hasClockedOut}
              onClick={() => handleClock('clock_out')}
              className={cn(
                'flex-1 rounded-xl transition-all duration-200 font-semibold',
                hasClockedOut
                  ? 'bg-gradient-to-br from-morandi-gold/10 to-morandi-gold/20 border border-morandi-gold/30 text-morandi-gold'
                  : hasClockedIn
                    ? 'bg-gradient-to-br from-card to-morandi-container/30 border border-border/60 text-morandi-primary hover:from-morandi-gold hover:to-morandi-gold-hover hover:text-white hover:shadow-md'
                    : 'bg-gradient-to-br from-card to-morandi-container/20 border border-border/60 text-morandi-muted'
              )}
            >
              {hasClockedOut ? '已下班' : '下班'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
