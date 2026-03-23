'use client'

/**
 * TicketRequestDialog - 機票需求對話框
 * 
 * 簡單流程：選指派人 → 建立 ticket 待辦
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Plane, Users, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useEmployeesSlim } from '@/data'
import { toast } from 'sonner'

interface TicketRequestDialogProps {
  open: boolean
  onClose: () => void
  tour: {
    id: string
    code: string
    name: string
    departure_date?: string
    return_date?: string
    outbound_flight?: any
    return_flight?: any
  } | null
  totalPax: number
}

export function TicketRequestDialog({
  open,
  onClose,
  tour,
  totalPax,
}: TicketRequestDialogProps) {
  const { user } = useAuthStore()
  const { employees } = useEmployeesSlim()
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [memberCount, setMemberCount] = useState(0)

  // 讀取團員數量
  useEffect(() => {
    if (!tour?.id || !open) return

    const fetchMembers = async () => {
      const { count } = await supabase
        .from('order_members')
        .select('id', { count: 'exact', head: true })
        .eq('orders.tour_id', tour.id)

      setMemberCount(count || 0)
    }

    fetchMembers()
  }, [tour?.id, open])

  // 格式化航班
  const formatFlight = (flight: any) => {
    if (!flight) return '未設定'
    const f = Array.isArray(flight) ? flight[0] : flight
    return f?.flightNumber || '未設定'
  }

  // 發送需求
  const handleSubmit = async () => {
    if (!tour || !user || !selectedEmployee) {
      toast.error('請選擇指派人')
      return
    }

    setSubmitting(true)
    try {
      // 建立 ticket 待辦
      const todoTitle = `${tour.code} 訂機票`
      const { error: todoError } = await supabase.from('todos').insert({
        title: todoTitle,
        priority: 3,
        status: 'pending',
        created_by: user.id,
        created_by_legacy: user.id,
        assignee: selectedEmployee,
        visibility: [user.id, selectedEmployee].filter(Boolean),
        task_type: 'ticket',
        tour_id: tour.id,
        workspace_id: user.workspace_id,
        related_items: [],
        sub_tasks: [],
        notes: [],
        enabled_quick_actions: ['pnr'],
      } as never)

      if (todoError) {
        throw todoError
      }

      // 查員工資訊發通知
      const { data: empData } = await supabase
        .from('employees')
        .select('name, line_user_id')
        .eq('id', selectedEmployee)
        .single()

      // 發送頻道通知
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'ticket_request',
            tourId: tour.id,
            tourCode: tour.code,
            assignee: empData?.name || '同事',
            assigneeId: selectedEmployee,
            outboundFlight: formatFlight(tour.outbound_flight),
            returnFlight: formatFlight(tour.return_flight),
            pax: totalPax || memberCount,
          }),
        })
      } catch (notifyError) {
        console.error('通知失敗:', notifyError)
      }

      toast.success(`已建立訂票任務，指派給 ${empData?.name || '同事'}`)
      onClose()
    } catch (error) {
      console.error('建立訂票任務失敗:', error)
      toast.error('建立失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (!tour) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane size={20} className="text-morandi-sky" />
            發送訂票任務
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 團資訊 */}
          <div className="bg-morandi-background/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="font-medium">{tour.code} {tour.name}</p>
            <p className="text-morandi-muted">
              {tour.departure_date} ~ {tour.return_date}
            </p>
          </div>

          {/* 航班資訊 */}
          <div className="bg-morandi-sky/10 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-morandi-sky font-medium">
              <Plane size={14} />
              航班資訊
            </div>
            <p>去程：{formatFlight(tour.outbound_flight)}</p>
            <p>回程：{formatFlight(tour.return_flight)}</p>
          </div>

          {/* 團員人數 */}
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-morandi-muted" />
            <span>團員人數：{totalPax || memberCount} 人</span>
          </div>

          {/* 指派人 */}
          <div className="space-y-2">
            <Label>指派給</Label>
            <Combobox
              options={employees.map(e => ({
                value: e.id,
                label: e.name,
              }))}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="選擇同事"
            />
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEmployee || submitting}
            className="flex-1 bg-morandi-sky hover:bg-morandi-sky/90 text-white"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Plane size={16} className="mr-2" />
            )}
            發送任務
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
