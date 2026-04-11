'use client'

import React, { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { BarChart3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

interface EmployeeSummary {
  employee_id: string
  employee_name: string
  total_days: number
  present_days: number
  late_days: number
  absent_days: number
  leave_days: number
  total_hours: number
  overtime_hours: number
}

export default function HRReportsPage() {
  const { user } = useAuthStore()
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (!user?.workspace_id) return
    const load = async () => {
      setLoading(true)
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`

        // 撈所有員工出勤
        const { data: records } = await supabase
          .from('attendance_records')
          .select(`
            employee_id, date, clock_in, clock_out, work_hours, overtime_hours, status,
            employee:employees!attendance_records_employee_id_fkey(display_name, chinese_name)
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('employee_id')

        if (!records) { setSummaries([]); return }

        // 按員工彙總
        const map = new Map<string, EmployeeSummary>()
        for (const r of records) {
          const emp = r.employee as { display_name: string | null; chinese_name: string | null } | null
          const name = emp?.display_name || emp?.chinese_name || '未知'

          if (!map.has(r.employee_id)) {
            map.set(r.employee_id, {
              employee_id: r.employee_id,
              employee_name: name,
              total_days: 0, present_days: 0, late_days: 0, absent_days: 0, leave_days: 0,
              total_hours: 0, overtime_hours: 0,
            })
          }
          const s = map.get(r.employee_id)!
          s.total_days++
          if (r.status === 'present') s.present_days++
          if (r.status === 'late') s.late_days++
          if (r.status === 'absent') s.absent_days++
          if (r.status === 'on_leave') s.leave_days++
          s.total_hours += r.work_hours || 0
          s.overtime_hours += r.overtime_hours || 0
        }

        setSummaries(Array.from(map.values()))
      } catch (err) {
        logger.error('載入出勤報表失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.workspace_id, year, month])

  const totalEmployees = summaries.length
  const totalHours = summaries.reduce((sum, s) => sum + s.total_hours, 0)
  const totalOvertime = summaries.reduce((sum, s) => sum + s.overtime_hours, 0)
  const totalLate = summaries.reduce((sum, s) => sum + s.late_days, 0)

  return (
    <ContentPageLayout title="出勤月報" icon={BarChart3}>
      <div className="space-y-4">
        {/* 月份選擇 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-morandi-secondary">年</Label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 h-8 text-sm" />
            <Label className="text-sm text-morandi-secondary">月</Label>
            <Input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-16 h-8 text-sm" />
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 text-center rounded-xl border border-border">
            <p className="text-2xl font-bold text-morandi-primary">{totalEmployees}</p>
            <p className="text-xs text-morandi-muted mt-1">員工數</p>
          </Card>
          <Card className="p-4 text-center rounded-xl border border-border">
            <p className="text-2xl font-bold text-morandi-primary">{totalHours.toFixed(0)}</p>
            <p className="text-xs text-morandi-muted mt-1">總工時</p>
          </Card>
          <Card className="p-4 text-center rounded-xl border border-border">
            <p className="text-2xl font-bold text-morandi-gold">{totalOvertime.toFixed(0)}</p>
            <p className="text-xs text-morandi-muted mt-1">總加班時數</p>
          </Card>
          <Card className="p-4 text-center rounded-xl border border-border">
            <p className="text-2xl font-bold text-status-warning">{totalLate}</p>
            <p className="text-xs text-morandi-muted mt-1">遲到次數</p>
          </Card>
        </div>

        {/* 員工出勤彙總表 */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-morandi-container/40 border-b border-border/60">
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">員工</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">出勤天數</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">正常</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">遲到</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">缺勤</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">請假</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">工時</th>
                <th className="text-center px-3 py-2 font-medium text-morandi-secondary">加班</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-morandi-muted">載入中...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-morandi-muted">本月無資料</td></tr>
              ) : (
                summaries.map(s => (
                  <tr key={s.employee_id} className="border-b border-border/30 hover:bg-morandi-container/20">
                    <td className="px-4 py-2 font-medium text-morandi-primary">{s.employee_name}</td>
                    <td className="text-center px-3 py-2">{s.total_days}</td>
                    <td className="text-center px-3 py-2 text-morandi-green">{s.present_days}</td>
                    <td className="text-center px-3 py-2 text-status-warning">{s.late_days || '-'}</td>
                    <td className="text-center px-3 py-2 text-morandi-red">{s.absent_days || '-'}</td>
                    <td className="text-center px-3 py-2 text-status-info">{s.leave_days || '-'}</td>
                    <td className="text-center px-3 py-2">{s.total_hours.toFixed(1)}</td>
                    <td className="text-center px-3 py-2 text-morandi-gold">{s.overtime_hours.toFixed(1)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ContentPageLayout>
  )
}
