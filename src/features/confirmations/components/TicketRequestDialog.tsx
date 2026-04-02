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
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Plane, Users, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useEmployeesSlim } from '@/data'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

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
  const { items: employees } = useEmployeesSlim()
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [showFlightInput, setShowFlightInput] = useState(false)
  const [outboundInput, setOutboundInput] = useState('')
  const [returnInput, setReturnInput] = useState('')

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

  // 檢查並建立待辦
  const handleSubmit = async () => {
    if (!tour || !user || !selectedEmployee) {
      toast.error('請選擇指派人')
      return
    }

    // 檢查航班資訊
    const hasOutbound = tour.outbound_flight && formatFlight(tour.outbound_flight) !== '未設定'
    const hasReturn = tour.return_flight && formatFlight(tour.return_flight) !== '未設定'

    if (!hasOutbound || !hasReturn) {
      // 沒有航班資訊，先彈出輸入框
      setShowFlightInput(true)
      return
    }

    // 有航班資訊，直接建立待辦
    await createTicketTodo()
  }

  // 儲存航班並建立待辦
  const handleSaveFlightAndSubmit = async () => {
    if (!outboundInput.trim() || !returnInput.trim()) {
      toast.error('請填寫去程和回程航班')
      return
    }

    setSubmitting(true)
    try {
      // 更新團的航班資訊
      const { error: updateError } = await supabase
        .from('tours')
        .update({
          outbound_flight: [{ flightNumber: outboundInput.trim() }],
          return_flight: [{ flightNumber: returnInput.trim() }],
        })
        .eq('id', tour!.id)

      if (updateError) throw updateError

      toast.success('航班資訊已儲存')
      setShowFlightInput(false)
      
      // 建立待辦
      await createTicketTodo()
    } catch (error) {
      logger.error('儲存航班失敗:', error)
      toast.error('儲存失敗')
      setSubmitting(false)
    }
  }

  // 建立訂票待辦
  const createTicketTodo = async () => {
    if (!tour || !user) return

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
        .select('*')
        .eq('id', selectedEmployee)
        .single()
      
      const empName = (empData as any)?.display_name || (empData as any)?.chinese_name || '同事'
      const lineUserId = (empData as any)?.line_user_id

      // 發送頻道通知
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'ticket_request',
            tourId: tour.id,
            tourCode: tour.code,
            assignee: empName,
            assigneeId: selectedEmployee,
            outboundFlight: formatFlight(tour.outbound_flight),
            returnFlight: formatFlight(tour.return_flight),
            pax: totalPax || memberCount,
          }),
        })
      } catch (notifyError) {
        logger.error('通知失敗:', notifyError)
      }

      toast.success(`已建立訂票任務，指派給 ${empName}`)
      onClose()
    } catch (error) {
      logger.error('建立訂票任務失敗:', error)
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

          {/* 航班輸入表單（當沒有航班資訊時顯示） */}
          {showFlightInput ? (
            <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2 text-status-warning">
                <AlertCircle size={16} className="mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">需要航班資訊</p>
                  <p className="text-xs mt-1">請填寫航班資訊後再建立訂票任務</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">去程航班</Label>
                <Input
                  placeholder="例：CI 123"
                  value={outboundInput}
                  onChange={e => setOutboundInput(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">回程航班</Label>
                <Input
                  placeholder="例：CI 456"
                  value={returnInput}
                  onChange={e => setReturnInput(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          ) : (
            <>
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
                  options={employees.map((e: any) => ({
                    value: e.id,
                    label: e.display_name || e.chinese_name || e.id,
                  }))}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder="選擇同事"
                />
              </div>
            </>
          )}
        </div>

        {/* 按鈕 */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (showFlightInput) {
                setShowFlightInput(false)
                setOutboundInput('')
                setReturnInput('')
              } else {
                onClose()
              }
            }} 
            className="flex-1"
          >
            {showFlightInput ? '返回' : '取消'}
          </Button>
          <Button
            onClick={showFlightInput ? handleSaveFlightAndSubmit : handleSubmit}
            disabled={
              showFlightInput 
                ? (!outboundInput.trim() || !returnInput.trim() || submitting)
                : (!selectedEmployee || submitting)
            }
            className="flex-1 bg-morandi-sky hover:bg-morandi-sky/90 text-white"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Plane size={16} className="mr-2" />
            )}
            {showFlightInput ? '儲存並發送' : '發送任務'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
