'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Clock, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface OvertimeRequest {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  hours: number
  reason: string | null
  status: string
  approved_by: string | null
  created_at: string
  employee_name?: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待審核', color: 'bg-status-warning-bg text-status-warning' },
  approved: { label: '已核准', color: 'bg-morandi-green/10 text-morandi-green' },
  rejected: { label: '已駁回', color: 'bg-morandi-red/10 text-morandi-red' },
  cancelled: { label: '已取消', color: 'bg-morandi-container text-morandi-muted' },
}

export default function OvertimePage() {
  const { user } = useAuthStore()
  const { isAdmin } = useAuthStore()
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formDate, setFormDate] = useState('')
  const [formStart, setFormStart] = useState('18:00')
  const [formEnd, setFormEnd] = useState('20:00')
  const [formReason, setFormReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      let query = supabase
        .from('overtime_requests' as never)
        .select('*, employee:employees!overtime_requests_employee_id_fkey(display_name, chinese_name)')
        .order('created_at', { ascending: false })
        .limit(50)

      // 非管理員只看自己的
      if (!isAdmin) {
        query = query.eq('employee_id', user.id)
      }

      const { data } = await query
      const mapped = (data || []).map((r: Record<string, unknown>) => {
        const emp = r.employee as { display_name: string | null; chinese_name: string | null } | null
        return { ...r, employee_name: emp?.display_name || emp?.chinese_name || '未知' } as OvertimeRequest
      })
      setRequests(mapped)
    } catch (err) {
      logger.error('載入加班申請失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, isAdmin])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleSubmit = async () => {
    if (!formDate || !formStart || !formEnd) { toast.error('請填寫完整'); return }
    setSaving(true)
    try {
      const startParts = formStart.split(':').map(Number)
      const endParts = formEnd.split(':').map(Number)
      const hours = (endParts[0] - startParts[0]) + (endParts[1] - startParts[1]) / 60

      await supabase.from('overtime_requests' as never).insert({
        workspace_id: user?.workspace_id,
        employee_id: user?.id,
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        hours: Math.round(hours * 100) / 100,
        reason: formReason || null,
      } as never)

      // 通知主管（找管理員）
      const { data: admins } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', user?.workspace_id || '')
        .in('role', ['admin', 'super_admin'] as never[])
        .limit(5)

      if (admins?.length) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: admins.map(a => a.id),
            title: `${user?.display_name || user?.chinese_name} 提交了加班申請`,
            message: `日期：${formDate}，${formStart}-${formEnd}（${hours.toFixed(1)} 小時）`,
            module: 'hr',
            type: 'action',
            action_url: '/hr/overtime',
          }),
        })
      }

      toast.success('加班申請已提交')
      setShowAddDialog(false)
      setFormDate('')
      setFormReason('')
      fetchRequests()
    } catch (err) {
      logger.error('提交加班申請失敗:', err)
      toast.error('提交失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleApproval = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/hr/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_type: 'overtime', request_id: id, action }),
      })
      if (res.ok) {
        toast.success(action === 'approve' ? '已核准' : '已駁回')
        fetchRequests()
      } else {
        const data = await res.json()
        toast.error(data.error)
      }
    } catch { toast.error('操作失敗') }
  }

  return (
    <ContentPageLayout
      title="加班申請"
      icon={Clock}
      headerActions={
        <Button onClick={() => setShowAddDialog(true)} className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
          <Plus size={16} className="mr-1" /> 申請加班
        </Button>
      }
    >
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-morandi-container/40 border-b border-border/60">
              {isAdmin && <th className="text-left px-4 py-2 font-medium text-morandi-secondary">員工</th>}
              <th className="text-left px-4 py-2 font-medium text-morandi-secondary">日期</th>
              <th className="text-left px-4 py-2 font-medium text-morandi-secondary">時間</th>
              <th className="text-left px-4 py-2 font-medium text-morandi-secondary">時數</th>
              <th className="text-left px-4 py-2 font-medium text-morandi-secondary">原因</th>
              <th className="text-left px-4 py-2 font-medium text-morandi-secondary">狀態</th>
              {isAdmin && <th className="text-left px-4 py-2 font-medium text-morandi-secondary">操作</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-morandi-muted">載入中...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-morandi-muted">沒有加班申請</td></tr>
            ) : (
              requests.map(r => {
                const s = STATUS_MAP[r.status] || STATUS_MAP.pending
                return (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-morandi-container/20">
                    {isAdmin && <td className="px-4 py-2 font-medium text-morandi-primary">{r.employee_name}</td>}
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2 font-mono">{r.start_time?.slice(0, 5)}-{r.end_time?.slice(0, 5)}</td>
                    <td className="px-4 py-2">{r.hours}h</td>
                    <td className="px-4 py-2 text-morandi-secondary truncate max-w-[200px]">{r.reason || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', s.color)}>{s.label}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        {r.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleApproval(r.id, 'approve')} className="p-1 text-morandi-green hover:bg-morandi-green/10 rounded"><Check size={14} /></button>
                            <button onClick={() => handleApproval(r.id, 'reject')} className="p-1 text-morandi-red hover:bg-morandi-red/10 rounded"><X size={14} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader><DialogTitle>申請加班</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>日期</Label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>開始時間</Label>
                <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>結束時間</Label>
                <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>原因</Label>
              <Input value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="加班原因" className="mt-1" />
            </div>
            <Button onClick={handleSubmit} disabled={saving} className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white">
              {saving ? '提交中...' : '提交申請'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
