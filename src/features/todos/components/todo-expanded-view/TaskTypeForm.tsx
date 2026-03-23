'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Hotel, Utensils, Bus, Ticket, PartyPopper, FileText, Plane, Users, Copy, Check } from 'lucide-react'
import { useToursSlim, useOrdersSlim, useEmployeesSlim } from '@/data'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import type { Todo, TodoTaskType } from '@/types/base.types'

interface TaskTypeFormProps {
  taskType: TodoTaskType
  todo: Todo
  onUpdate: (data: Partial<Todo>) => void
  onClose: () => void
}

const TASK_TYPE_CONFIG: Record<
  TodoTaskType,
  {
    icon: React.ElementType
    label: string
    color: string
  }
> = {
  accommodation: { icon: Hotel, label: '訂房', color: 'text-blue-600' },
  restaurant: { icon: Utensils, label: '訂餐廳', color: 'text-orange-600' },
  transport: { icon: Bus, label: '訂交通', color: 'text-green-600' },
  ticket: { icon: Ticket, label: '訂票', color: 'text-purple-600' },
  activity: { icon: PartyPopper, label: '訂活動', color: 'text-pink-600' },
  general: { icon: FileText, label: '一般任務', color: 'text-morandi-secondary' },
}

export function TaskTypeForm({ taskType, todo, onUpdate, onClose }: TaskTypeFormProps) {
  const config = TASK_TYPE_CONFIG[taskType] || TASK_TYPE_CONFIG.general
  const Icon = config.icon

  // 根據任務類型顯示不同的表單
  const renderForm = () => {
    switch (taskType) {
      case 'accommodation':
        return <AccommodationForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
      case 'restaurant':
        return <RestaurantForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
      case 'transport':
        return <TransportForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
      case 'ticket':
        return <TicketForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
      case 'activity':
        return <ActivityForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
      default:
        return <GeneralForm todo={todo} onUpdate={onUpdate} onClose={onClose} />
    }
  }

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div className="flex items-center gap-2 pb-3 border-b border-morandi-container/20">
        <div className={`p-1.5 bg-morandi-container/20 rounded-lg ${config.color}`}>
          <Icon size={16} />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-morandi-primary">{config.label}</h5>
          <p className="text-xs text-morandi-secondary">填寫完成後自動更新系統</p>
        </div>
      </div>

      {/* 表單內容 */}
      {renderForm()}
    </div>
  )
}

// ============================================
// 各類型表單
// ============================================

interface FormProps {
  todo: Todo
  onUpdate: (data: Partial<Todo>) => void
  onClose: () => void
}

function AccommodationForm({ todo, onUpdate, onClose }: FormProps) {
  const { items: tours } = useToursSlim()
  const { items: orders } = useOrdersSlim()
  const { items: employees } = useEmployeesSlim()

  const [formData, setFormData] = React.useState({
    hotelName: '',
    roomType: '',
    quantity: 1,
    amount: 0,
    confirmationNumber: '',
    paymentStatus: 'unpaid' as 'unpaid' | 'paid' | 'advanced',
    // 請款相關
    tourId: todo.tour_id || '',
    orderId: '',
    advancedBy: '',
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // 篩選該團的訂單
  const filteredOrders = orders.filter(o => o.tour_id === formData.tourId)

  // 團選項
  const tourOptions = tours.map(t => ({
    value: t.id,
    label: `${t.code} ${t.name}`,
  }))

  // 訂單選項
  const orderOptions = filteredOrders.map(o => ({
    value: o.id,
    label: `${o.order_number || o.code} - ${o.contact_person || '未命名'}`,
  }))

  // 員工選項（代墊人）
  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: e.display_name || e.english_name || '未命名',
  }))

  const handleSubmit = async () => {
    if (!formData.hotelName) {
      toast.error('請填寫飯店名稱')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. 更新核心表（如果有 tour_request_id）
      if (todo.tour_request_id) {
        const { supabase } = await import('@/lib/supabase/client')
        await supabase
          .from('tour_requests')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', todo.tour_request_id)
      }

      // 2. 如果有付款，建立請款單
      if (formData.paymentStatus !== 'unpaid' && formData.amount > 0) {
        const { supabase } = await import('@/lib/supabase/client')
        const requestDate = new Date().toISOString().split('T')[0]
        const requestNumber = `PR${Date.now()}`

        await supabase.from('payment_requests').insert({
          code: requestNumber,
          request_number: requestNumber,
          tour_id: formData.tourId || null,
          order_id: formData.orderId || null,
          supplier_name: formData.hotelName,
          notes: `訂房 - ${formData.roomType} x ${formData.quantity}`,
          amount: formData.amount,
          total_amount: formData.amount,
          status: 'pending',
          request_type: formData.paymentStatus === 'advanced' ? '員工代墊' : '供應商支出',
          request_date: requestDate,
        })

        toast.success('已建立請款單')
      }

      // 3. 標記待辦完成
      onUpdate({ status: 'completed', completed: true })
      toast.success('任務已完成')
      onClose()
    } catch (error) {
      console.error('提交失敗:', error)
      toast.error('提交失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">飯店名稱</Label>
        <Input
          value={formData.hotelName}
          onChange={e => setFormData(prev => ({ ...prev, hotelName: e.target.value }))}
          placeholder="The Royal Park Hotel"
          className="h-9 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">房型</Label>
          <Input
            value={formData.roomType}
            onChange={e => setFormData(prev => ({ ...prev, roomType: e.target.value }))}
            placeholder="雙人房"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">數量</Label>
          <Input
            type="number"
            value={formData.quantity}
            onChange={e =>
              setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
            }
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">金額</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={e =>
              setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))
            }
            placeholder="0"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">確認號</Label>
          <Input
            value={formData.confirmationNumber}
            onChange={e => setFormData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
            placeholder="ABC123"
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">付款狀態</Label>
        <Select
          value={formData.paymentStatus}
          onValueChange={(value: 'unpaid' | 'paid' | 'advanced') =>
            setFormData(prev => ({ ...prev, paymentStatus: value }))
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unpaid">未付款</SelectItem>
            <SelectItem value="paid">已刷卡（公司卡）</SelectItem>
            <SelectItem value="advanced">代墊</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 付款相關欄位 */}
      {formData.paymentStatus !== 'unpaid' && (
        <div className="space-y-3 pt-2 border-t border-border/40">
          <p className="text-xs text-morandi-secondary font-medium">請款資訊</p>

          {/* 如果待辦已帶團號，顯示團號資訊；否則顯示選擇 */}
          {todo.tour_id ? (
            <div className="bg-morandi-container/50 rounded-md p-2">
              <Label className="text-xs text-morandi-primary">團號</Label>
              <p className="text-sm font-medium text-morandi-primary">
                {tours.find(t => t.id === todo.tour_id)?.code || ''}{' '}
                {tours.find(t => t.id === todo.tour_id)?.name || ''}
              </p>
            </div>
          ) : (
            <div>
              <Label className="text-xs">選擇團</Label>
              <Combobox
                options={tourOptions}
                value={formData.tourId}
                onChange={value => setFormData(prev => ({ ...prev, tourId: value, orderId: '' }))}
                placeholder="選擇團..."
                className="h-9"
              />
            </div>
          )}

          {formData.tourId && (
            <div>
              <Label className="text-xs">選擇訂單</Label>
              <Combobox
                options={orderOptions}
                value={formData.orderId}
                onChange={value => setFormData(prev => ({ ...prev, orderId: value }))}
                placeholder="選擇訂單..."
                className="h-9"
              />
            </div>
          )}
          {formData.paymentStatus === 'advanced' && (
            <div>
              <Label className="text-xs">代墊人</Label>
              <Combobox
                options={employeeOptions}
                value={formData.advancedBy}
                onChange={value => setFormData(prev => ({ ...prev, advancedBy: value }))}
                placeholder="選擇代墊人..."
                className="h-9"
              />
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white"
      >
        {isSubmitting ? '提交中...' : '提交並完成任務'}
      </Button>
    </div>
  )
}

function RestaurantForm({ todo, onUpdate, onClose }: FormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-morandi-secondary">訂餐廳表單（待實作）</p>
      <Button onClick={onClose} variant="outline" className="w-full">
        關閉
      </Button>
    </div>
  )
}

function TransportForm({ todo, onUpdate, onClose }: FormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-morandi-secondary">訂交通表單（待實作）</p>
      <Button onClick={onClose} variant="outline" className="w-full">
        關閉
      </Button>
    </div>
  )
}

function TicketForm({ todo, onUpdate, onClose }: FormProps) {
  const [flightInfo, setFlightInfo] = useState<{
    outbound: any
    return: any
    tourCode: string
    tourName: string
  } | null>(null)
  const [members, setMembers] = useState<{
    id: string
    chinese_name: string
    english_name: string
    pnr?: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [pnrInput, setPnrInput] = useState('')
  const [copied, setCopied] = useState(false)

  // 讀取航班和團員資料
  useEffect(() => {
    async function fetchData() {
      if (!todo.tour_id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 讀取團的航班資訊
        const { data: tour } = await supabase
          .from('tours')
          .select('code, name, outbound_flight, return_flight')
          .eq('id', todo.tour_id)
          .single()

        if (tour) {
          setFlightInfo({
            outbound: tour.outbound_flight,
            return: tour.return_flight,
            tourCode: tour.code,
            tourName: tour.name,
          })
        }

        // 讀取團員名單（透過 orders）
        const { data: orderMembers } = await supabase
          .from('order_members')
          .select(`
            id,
            chinese_name,
            english_name,
            orders!inner(tour_id)
          `)
          .eq('orders.tour_id', todo.tour_id)

        if (orderMembers) {
          setMembers(orderMembers.map(m => ({
            id: m.id,
            chinese_name: m.chinese_name || '',
            english_name: m.english_name || '',
          })))
        }
      } catch (error) {
        console.error('讀取訂票資料失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [todo.tour_id])

  // 格式化航班資訊
  const formatFlight = (flight: any) => {
    if (!flight) return '未設定'
    if (Array.isArray(flight) && flight.length > 0) {
      const f = flight[0]
      if (f.flightNumber) return f.flightNumber
      return '未設定'
    }
    if (typeof flight === 'object' && flight.flightNumber) {
      return flight.flightNumber
    }
    return '未設定'
  }

  // 複製團員名單
  const handleCopyMembers = () => {
    const text = members
      .map(m => `${m.chinese_name}\t${m.english_name}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('已複製團員名單')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-morandi-gold" />
      </div>
    )
  }

  if (!todo.tour_id) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-morandi-secondary">請先關聯團才能查看訂票資訊</p>
        <Button onClick={onClose} variant="outline" className="w-full">
          關閉
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 航班資訊 */}
      <div className="bg-morandi-sky/10 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-morandi-sky">
          <Plane size={16} />
          <span className="text-sm font-medium">航班資訊</span>
        </div>
        {flightInfo && (
          <div className="text-xs space-y-1 text-morandi-primary">
            <p className="font-medium">{flightInfo.tourCode} {flightInfo.tourName}</p>
            <p>去程：{formatFlight(flightInfo.outbound)}</p>
            <p>回程：{formatFlight(flightInfo.return)}</p>
          </div>
        )}
      </div>

      {/* 團員名單 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-morandi-primary">
            <Users size={16} />
            <span className="text-sm font-medium">團員名單 ({members.length}人)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyMembers}
            className="h-7 text-xs"
          >
            {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
            {copied ? '已複製' : '複製'}
          </Button>
        </div>
        
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-morandi-background/50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-morandi-muted">中文姓名</th>
                <th className="px-2 py-1.5 text-left font-medium text-morandi-muted">英文姓名</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-border/50">
                  <td className="px-2 py-1.5">{member.chinese_name || '-'}</td>
                  <td className="px-2 py-1.5 font-mono text-morandi-secondary">
                    {member.english_name || '-'}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-2 py-4 text-center text-morandi-muted">
                    尚無團員資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PNR 輸入 */}
      <div className="space-y-2">
        <Label className="text-sm">PNR 電報</Label>
        <Textarea
          placeholder="貼上 Amadeus 電報內容..."
          value={pnrInput}
          onChange={(e) => setPnrInput(e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
        <p className="text-xs text-morandi-muted">
          貼上電報後，系統會自動解析旅客和航班資訊
        </p>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => {
            onUpdate({ status: 'completed', completed: true })
            onClose()
          }}
          className="flex-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
        >
          標記完成
        </Button>
        <Button onClick={onClose} variant="outline">
          關閉
        </Button>
      </div>
    </div>
  )
}

function ActivityForm({ todo, onUpdate, onClose }: FormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-morandi-secondary">訂活動表單（待實作）</p>
      <Button onClick={onClose} variant="outline" className="w-full">
        關閉
      </Button>
    </div>
  )
}

function GeneralForm({ todo, onUpdate, onClose }: FormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-morandi-secondary">一般任務（無專屬表單）</p>
      <Button
        onClick={() => {
          onUpdate({ status: 'completed', completed: true })
          onClose()
        }}
        className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white"
      >
        標記完成
      </Button>
    </div>
  )
}
