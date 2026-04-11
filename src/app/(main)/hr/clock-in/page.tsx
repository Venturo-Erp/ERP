'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, LogIn, LogOut, CheckCircle2, AlertTriangle, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

interface ClockStatus {
  date: string
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  overtime_hours: number | null
  status: string | null
}

export default function ClockInPage() {
  const user = useAuthStore(state => state.user)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // 即時時鐘
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 取得 GPS 位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationError(null)
        },
        err => {
          setLocationError('無法取得位置')
          logger.warn('GPS 錯誤:', err.message)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // 查詢今日打卡狀態
  const fetchStatus = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/hr/clock-in')
      if (res.ok) {
        const data = await res.json()
        setClockStatus(data)
      }
    } catch (err) {
      logger.error('查詢打卡狀態失敗:', err)
    }
  }, [user?.id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // 打卡
  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    if (!user?.id || !user?.workspace_id) return

    setLoading(true)
    try {
      const res = await fetch('/api/hr/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          latitude: location?.lat,
          longitude: location?.lng,
          source: 'web',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
        fetchStatus()
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('打卡失敗，請稍後再試')
      logger.error('打卡失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const twTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const timeStr = twTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = twTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const hasClockedIn = !!clockStatus?.clock_in
  const hasClockedOut = !!clockStatus?.clock_out

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 時間顯示 */}
        <div className="text-center space-y-2">
          <p className="text-morandi-secondary text-sm">{dateStr}</p>
          <p className="text-6xl font-light text-morandi-primary tracking-wider tabular-nums">
            {timeStr}
          </p>
          <p className="text-morandi-muted text-xs">
            {user?.display_name || user?.chinese_name || ''}
          </p>
        </div>

        {/* GPS 狀態 */}
        <div className="flex justify-center">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs',
            location
              ? 'bg-morandi-green/10 text-morandi-green'
              : 'bg-status-warning-bg text-status-warning'
          )}>
            <MapPin size={12} />
            {location
              ? `已定位 (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
              : locationError || '定位中...'}
          </div>
        </div>

        {/* 打卡按鈕 */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleClock('clock_in')}
            disabled={loading || hasClockedIn}
            className={cn(
              'h-24 text-lg font-medium rounded-2xl transition-all',
              hasClockedIn
                ? 'bg-morandi-green/20 text-morandi-green border-2 border-morandi-green/30'
                : 'bg-morandi-primary hover:bg-morandi-primary/90 text-white shadow-lg hover:shadow-xl'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              {hasClockedIn ? (
                <>
                  <CheckCircle2 size={24} />
                  <span className="text-sm">已打卡 {clockStatus?.clock_in?.slice(0, 5)}</span>
                </>
              ) : (
                <>
                  <LogIn size={24} />
                  <span>上班</span>
                </>
              )}
            </div>
          </Button>

          <Button
            onClick={() => handleClock('clock_out')}
            disabled={loading || !hasClockedIn || hasClockedOut}
            className={cn(
              'h-24 text-lg font-medium rounded-2xl transition-all',
              hasClockedOut
                ? 'bg-morandi-gold/20 text-morandi-gold border-2 border-morandi-gold/30'
                : hasClockedIn
                  ? 'bg-morandi-gold hover:bg-morandi-gold/90 text-white shadow-lg hover:shadow-xl'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              {hasClockedOut ? (
                <>
                  <CheckCircle2 size={24} />
                  <span className="text-sm">已打卡 {clockStatus?.clock_out?.slice(0, 5)}</span>
                </>
              ) : (
                <>
                  <LogOut size={24} />
                  <span>下班</span>
                </>
              )}
            </div>
          </Button>
        </div>

        {/* 今日狀態 */}
        {clockStatus?.status && (
          <div className="bg-card rounded-xl p-4 border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-morandi-primary">
              <History size={14} />
              今日出勤
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-morandi-muted">上班</p>
                <p className="font-medium text-morandi-primary">
                  {clockStatus.clock_in?.slice(0, 5) || '--:--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-morandi-muted">下班</p>
                <p className="font-medium text-morandi-primary">
                  {clockStatus.clock_out?.slice(0, 5) || '--:--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-morandi-muted">工時</p>
                <p className="font-medium text-morandi-primary">
                  {clockStatus.work_hours ? `${clockStatus.work_hours.toFixed(1)}h` : '--'}
                </p>
              </div>
            </div>
            {clockStatus.status === 'late' && (
              <div className="flex items-center gap-1.5 text-xs text-status-warning">
                <AlertTriangle size={12} />
                今日遲到
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
