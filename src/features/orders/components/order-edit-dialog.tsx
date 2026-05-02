'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  type DialogLevel,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { updateOrder } from '@/data'
import type { Order } from '@/stores/types'
import { X } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { COMP_ORDERS_LABELS } from '../constants/labels'
import { useEligibleEmployees } from '@/data/hooks/useEligibleEmployees'

interface OrderEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  level?: DialogLevel
}

export function OrderEditDialog({ open, onOpenChange, order, level = 2 }: OrderEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    contact_person: '',
    sales_person: '',
    assistant: '',
  })

  // 下拉資格：查「職務有 tours.as_sales / as_assistant can_write=true」的員工
  const { employees: salesPersons } = useEligibleEmployees('tours', 'as_sales')
  const { employees: assistants } = useEligibleEmployees('tours', 'as_assistant')

  // 當 order 變更時重設表單
  useEffect(() => {
    if (order) {
      setFormData({
        contact_person: order.contact_person || '',
        sales_person: order.sales_person || '',
        assistant: order.assistant || '',
      })
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    setIsSubmitting(true)
    try {
      await updateOrder(order.id, {
        contact_person: formData.contact_person,
        sales_person: formData.sales_person || null,
        assistant: formData.assistant || null,
      })
      onOpenChange(false)
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.OrderEditDialog_更新訂單失敗, error)
      alert(error instanceof Error ? error.message : COMP_ORDERS_LABELS.更新訂單失敗_請稍後再試)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={level} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>編輯訂單 {order?.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 訂單資訊（唯讀） */}
          <div className="p-3 bg-morandi-container/30 rounded-lg space-y-1">
            <div className="text-xs text-morandi-secondary">
              旅遊團：<span className="font-medium text-morandi-primary">{order?.tour_name}</span>
            </div>
          </div>

          {/* 聯絡人 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {COMP_ORDERS_LABELS.LABEL_7009}
            </label>
            <Input
              value={formData.contact_person}
              onChange={e => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              placeholder={COMP_ORDERS_LABELS.輸入聯絡人姓名}
              className="mt-1"
              required
            />
          </div>

          {/* 業務和助理 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_ORDERS_LABELS.LABEL_8362}
                {formData.contact_person?.trim() && (
                  <span className="text-morandi-red ml-1">*</span>
                )}
              </label>
              <Combobox
                options={salesPersons.map(emp => ({
                  value: emp.display_name || emp.english_name || '',
                  label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
                }))}
                value={formData.sales_person}
                onChange={value => setFormData(prev => ({ ...prev, sales_person: value }))}
                placeholder={COMP_ORDERS_LABELS.選擇業務人員}
                emptyMessage={COMP_ORDERS_LABELS.找不到業務人員}
                showSearchIcon={true}
                showClearButton={true}
                className="mt-1"
                disablePortal={true}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_ORDERS_LABELS.LABEL_7412}
              </label>
              <Combobox
                options={assistants.map(emp => ({
                  value: emp.display_name || emp.english_name || '',
                  label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
                }))}
                value={formData.assistant}
                onChange={value => setFormData(prev => ({ ...prev, assistant: value }))}
                placeholder={COMP_ORDERS_LABELS.選擇助理}
                emptyMessage={COMP_ORDERS_LABELS.找不到助理}
                showSearchIcon={true}
                showClearButton={true}
                className="mt-1"
                disablePortal={true}
              />
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X size={16} />
              {COMP_ORDERS_LABELS.取消}
            </Button>
            <Button variant="soft-gold"
              type="submit"
              disabled={!formData.contact_person || isSubmitting}
 
            >
              {isSubmitting ? COMP_ORDERS_LABELS.儲存中 : COMP_ORDERS_LABELS.儲存}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
