'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LogIn, LogOut, CheckCircle2, Calendar, Clock, FileText,
  ChevronRight, Send,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import Link from 'next/link'

interface ClockStatus {
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  status: string | null
}

interface LeaveTypeOption {
  id: string
  name: string
  code: string
}

export function ClockInWidget() {
  const user = useAuthStore(state => state.user)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([])

  // 請假表單
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveDays, setLeaveDays] = useState(1)
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveSaving, setLeaveSaving] = useState(false)

  // 即時時鐘
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

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // 載入假別
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('leave_types')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (data) setLeaveTypes(data)
    }
    load()
  }, [])

  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setLoading(true)
    try {
      const res = await fetch('/api/hr/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, source: 'web' }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchStatus() }
      else toast.error(data.error)
    } catch { toast.error('打卡失敗') }
    finally { setLoading(false) }
  }

  const handleLeaveSubmit = async () => {
    if (!leaveTypeId || !leaveStart || !leaveEnd) {
      toast.error('請填寫假別、起訖日期')
      return
    }
    setLeaveSaving(true)
    try {
      const { error } = await supabase.from('leave_requests').insert({
        workspace_id: user?.workspace_id as string,
        employee_id: user?.id as string,
        leave_type_id: leaveTypeId,
        start_date: leaveStart,
        end_date: leaveEnd,
        days: leaveDays,
        reason: leaveReason || null,
        status: 'pending' as const,
      } as never)
      if (error) throw error

      // 通知管理員
      const { data: adminRoles } = await supabase
        .from('roles' as never)
        .select('id')
        .eq('is_admin', true)
      const adminRoleIds = (adminRoles || []).map((r: { id: string }) => r.id)
      if (adminRoleIds.length > 0) {
        const { data: admins } = await supabase
          .from('employees')
          .select('id')
          .eq('workspace_id', user?.workspace_id || '')
          .in('job_info->role_id' as never, adminRoleIds as never[])
          .limit(5)
        if (admins?.length) {
          const typeName = leaveTypes.find(t => t.id === leaveTypeId)?.name || '假'
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipients: admins.map(a => a.id),
              title: `${user?.display_name || user?.chinese_name} 申請${typeName}`,
              message: `${leaveStart} ~ ${leaveEnd}，共 ${leaveDays} 天`,
              module: 'hr',
              type: 'action',
              action_url: '/hr/leave',
            }),
          })
        }
      }

      toast.success('請假申請已提交')
      setShowLeaveDialog(false)
      setLeaveTypeId('')
      setLeaveStart('')
      setLeaveEnd('')
      setLeaveDays(1)
      setLeaveReason('')
    } catch (err) {
      logger.error('請假申請失敗:', err)
      toast.error('提交失敗')
    } finally {
      setLeaveSaving(false)
    }
  }

  const twTime = new Date(currentTime.getTime() + 8 * 60 * 60 * 1000)
  const timeStr = twTime.toISOString().split('T')[1].slice(0, 8)
  const dateStr = currentTime.toLocaleDateString('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Taipei',
  })

  const hasClockedIn = !!clockStatus?.clock_in
  const hasClockedOut = !!clockStatus?.clock_out

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-muted via-card to-morandi-container/30">
        <div className="p-4 space-y-3 h-full flex flex-col">
          {/* Header + 時鐘 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-morandi-secondary">{dateStr}</p>
              <p className="text-2xl font-mono font-bold text-morandi-primary tracking-wider tabular-nums">
                {timeStr}
              </p>
            </div>
            <div className="text-right">
              {hasClockedIn && (
                <div className="text-[10px] text-morandi-secondary space-y-0.5">
                  <p className="flex items-center gap-1 justify-end">
                    <CheckCircle2 size={10} className="text-morandi-green" />
                    上班 {clockStatus?.clock_in?.slice(0, 5)}
                  </p>
                  {hasClockedOut && (
                    <p className="flex items-center gap-1 justify-end">
                      <CheckCircle2 size={10} className="text-morandi-gold" />
                      下班 {clockStatus?.clock_out?.slice(0, 5)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 打卡按鈕 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading || hasClockedIn}
              onClick={() => handleClock('clock_in')}
              className={cn(
                'flex-1 rounded-xl text-xs font-semibold h-9',
                hasClockedIn
                  ? 'bg-morandi-green/10 border border-morandi-green/30 text-morandi-green'
                  : 'bg-morandi-gold text-white hover:bg-morandi-gold-hover shadow-md'
              )}
            >
              <LogIn size={14} className="mr-1" />
              {hasClockedIn ? '已上班' : '上班'}
            </Button>
            <Button
              size="sm"
              disabled={loading || !hasClockedIn || hasClockedOut}
              onClick={() => handleClock('clock_out')}
              className={cn(
                'flex-1 rounded-xl text-xs font-semibold h-9',
                hasClockedOut
                  ? 'bg-morandi-gold/10 border border-morandi-gold/30 text-morandi-gold'
                  : hasClockedIn
                    ? 'bg-card border border-border text-morandi-primary hover:bg-morandi-gold hover:text-white'
                    : 'bg-card border border-border text-morandi-muted'
              )}
            >
              <LogOut size={14} className="mr-1" />
              {hasClockedOut ? '已下班' : '下班'}
            </Button>
          </div>

          {/* 分隔線 */}
          <div className="border-t border-border/50" />

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            <button
              onClick={() => setShowLeaveDialog(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/70 border border-border/40 hover:border-morandi-gold/40 hover:bg-morandi-gold/5 transition-all text-left"
            >
              <Calendar size={14} className="text-morandi-gold flex-shrink-0" />
              <span className="text-xs font-medium text-morandi-primary">請假</span>
            </button>
            <Link
              href="/hr/overtime"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/70 border border-border/40 hover:border-morandi-gold/40 hover:bg-morandi-gold/5 transition-all"
            >
              <Clock size={14} className="text-morandi-gold flex-shrink-0" />
              <span className="text-xs font-medium text-morandi-primary">加班</span>
            </Link>
            <Link
              href="/hr/my-attendance"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/70 border border-border/40 hover:border-morandi-gold/40 hover:bg-morandi-gold/5 transition-all"
            >
              <FileText size={14} className="text-morandi-gold flex-shrink-0" />
              <span className="text-xs font-medium text-morandi-primary">出勤</span>
            </Link>
            <Link
              href="/hr/my-payslip"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/70 border border-border/40 hover:border-morandi-gold/40 hover:bg-morandi-gold/5 transition-all"
            >
              <ChevronRight size={14} className="text-morandi-gold flex-shrink-0" />
              <span className="text-xs font-medium text-morandi-primary">薪資條</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 請假 Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader><DialogTitle>申請請假</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>假別</Label>
              <select
                value={leaveTypeId}
                onChange={e => setLeaveTypeId(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm"
              >
                <option value="">選擇假別</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>開始日期</Label>
                <Input type="date" value={leaveStart} onChange={e => { setLeaveStart(e.target.value); if (!leaveEnd) setLeaveEnd(e.target.value) }} className="mt-1" />
              </div>
              <div>
                <Label>結束日期</Label>
                <Input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>天數</Label>
              <Input type="number" min={0.5} step={0.5} value={leaveDays} onChange={e => setLeaveDays(Number(e.target.value))} className="mt-1 w-24" />
            </div>
            <div>
              <Label>事由</Label>
              <Input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="請假原因" className="mt-1" />
            </div>
            <Button
              onClick={handleLeaveSubmit}
              disabled={leaveSaving || !leaveTypeId || !leaveStart || !leaveEnd}
              className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Send size={14} className="mr-1" />
              {leaveSaving ? '提交中...' : '提交申請'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
