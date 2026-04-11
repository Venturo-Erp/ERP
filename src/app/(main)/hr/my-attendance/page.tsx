'use client'

import React, { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  overtime_hours: number | null
  status: string | null
  notes: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  present: { label: '正常', color: 'bg-morandi-green/10 text-morandi-green' },
  late: { label: '遲到', color: 'bg-status-warning-bg text-status-warning' },
  absent: { label: '缺勤', color: 'bg-morandi-red/10 text-morandi-red' },
  early_leave: { label: '早退', color: 'bg-status-warning-bg text-status-warning' },
  on_leave: { label: '請假', color: 'bg-status-info-bg text-status-info' },
}

export default function MyAttendancePage() {
  const user = useAuthStore(state => state.user)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`

        const { data } = await supabase
          .from('attendance_records')
          .select('id, date, clock_in, clock_out, work_hours, overtime_hours, status, notes')
          .eq('employee_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })

        setRecords(data || [])
      } catch (err) {
        logger.error('載入出勤紀錄失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, year, month])

  const totalDays = records.length
  const presentDays = records.filter(r => r.status === 'present').length
  const lateDays = records.filter(r => r.status === 'late').length
  const totalHours = records.reduce((sum, r) => sum + (r.work_hours || 0), 0)
  const totalOvertime = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)

  return (
    <ContentPageLayout title="我的出勤" icon={Calendar}>
      <div className="space-y-4">
        {/* 月份選擇 + 統計 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-morandi-secondary">年</Label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 h-8 text-sm" />
            <Label className="text-sm text-morandi-secondary">月</Label>
            <Input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-16 h-8 text-sm" />
          </div>
          <div className="flex items-center gap-4 text-xs text-morandi-secondary">
            <span>出勤 <b className="text-morandi-primary">{presentDays}</b> 天</span>
            <span>遲到 <b className="text-status-warning">{lateDays}</b> 天</span>
            <span>工時 <b className="text-morandi-primary">{totalHours.toFixed(1)}</b>h</span>
            <span>加班 <b className="text-morandi-gold">{totalOvertime.toFixed(1)}</b>h</span>
          </div>
        </div>

        {/* 出勤表格 */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-morandi-container/40 border-b border-border/60">
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">日期</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">星期</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">上班</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">下班</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">工時</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">加班</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">狀態</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-morandi-muted">載入中...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-morandi-muted">本月無出勤紀錄</td></tr>
              ) : (
                records.map(r => {
                  const d = new Date(r.date)
                  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
                  const statusInfo = STATUS_MAP[r.status || ''] || { label: '-', color: '' }
                  return (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-morandi-container/20">
                      <td className="px-4 py-2 text-morandi-primary">{r.date}</td>
                      <td className="px-4 py-2 text-morandi-secondary">{weekday}</td>
                      <td className="px-4 py-2 font-mono">{r.clock_in?.slice(0, 5) || '-'}</td>
                      <td className="px-4 py-2 font-mono">{r.clock_out?.slice(0, 5) || '-'}</td>
                      <td className="px-4 py-2">{r.work_hours ? `${r.work_hours.toFixed(1)}h` : '-'}</td>
                      <td className="px-4 py-2 text-morandi-gold">{r.overtime_hours ? `${r.overtime_hours.toFixed(1)}h` : '-'}</td>
                      <td className="px-4 py-2">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ContentPageLayout>
  )
}
