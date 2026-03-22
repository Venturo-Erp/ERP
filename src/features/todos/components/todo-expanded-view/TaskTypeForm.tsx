'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Hotel, Utensils, Bus, Ticket, PartyPopper, FileText } from 'lucide-react'
import { useToursSlim, useOrdersSlim, useEmployeesSlim } from '@/data'
import { toast } from 'sonner'
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
  return (
    <div className="space-y-3">
      <p className="text-sm text-morandi-secondary">訂票表單（待實作）</p>
      <Button onClick={onClose} variant="outline" className="w-full">
        關閉
      </Button>
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
