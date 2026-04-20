'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToursListSlim } from '@/hooks/useListSlim'
import { useEligibleEmployees } from '@/data/hooks/useEligibleEmployees'
import { COMP_ORDERS_LABELS } from '../constants/labels'

export interface OrderFormData {
  tour_id: string
  contact_person: string
  sales_person: string
  assistant: string
  member_count?: number
  total_amount?: number
}

interface AddOrderFormProps {
  tourId?: string // 如果從旅遊團頁面打開，會帶入 tour_id

  // 獨立模式（用於 Dialog）
  onSubmit?: (orderData: OrderFormData) => void
  onCancel?: () => void

  // 嵌入模式（用於嵌入其他表單）
  value?: Partial<OrderFormData>
  onChange?: (orderData: Partial<OrderFormData>) => void
}

export function AddOrderForm({ tourId, onSubmit, onCancel, value, onChange }: AddOrderFormProps) {
  const { items: tours } = useToursListSlim()

  // 下拉資格：查「職務有 tours.as_sales / tours.as_assistant can_write=true」的員工
  const { employees: salesPersons } = useEligibleEmployees('tours', 'as_sales')
  const { employees: assistants } = useEligibleEmployees('tours', 'as_assistant')

  // 判斷是否為嵌入模式
  const isEmbedded = !!onChange

  // 內部 state（獨立模式使用）
  const [internalFormData, setInternalFormData] = useState<Partial<OrderFormData>>({
    tour_id: tourId || '',
    contact_person: '',
    sales_person: '',
    assistant: '',
  })

  // 使用外部 state 或內部 state
  const formData = isEmbedded ? value || {} : internalFormData
  const updateFormData = isEmbedded ? onChange : setInternalFormData

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && !isEmbedded) {
      onSubmit(formData as OrderFormData)
    }
  }

  // 嵌入模式用 div，獨立模式用 form
  const Container = isEmbedded ? 'div' : 'form'
  const containerProps = isEmbedded ? {} : { onSubmit: handleSubmit }

  return (
    <Container {...containerProps} className="space-y-4">
      {/* 選擇旅遊團（如果沒有預設 tour_id） */}
      {!tourId && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {COMP_ORDERS_LABELS.SELECT_448}
          </label>
          <Combobox
            options={tours.map(tour => ({
              value: tour.id,
              label: `${tour.code} - ${tour.name}`,
              data: tour,
            }))}
            value={formData.tour_id || ''}
            onChange={value => updateFormData?.({ ...formData, tour_id: value })}
            placeholder={COMP_ORDERS_LABELS.搜尋或選擇旅遊團}
            emptyMessage={COMP_ORDERS_LABELS.找不到旅遊團}
            className="mt-1"
            disablePortal={true}
          />
        </div>
      )}

      {/* 聯絡人 */}
      <div>
        <label className="text-sm font-medium text-morandi-primary">
          {COMP_ORDERS_LABELS.LABEL_7009}
        </label>
        <Input
          value={formData.contact_person || ''}
          onChange={e => updateFormData?.({ ...formData, contact_person: e.target.value })}
          placeholder={COMP_ORDERS_LABELS.輸入聯絡人姓名}
          className="mt-1"
          required={!isEmbedded}
        />
      </div>

      {/* 業務和助理 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {COMP_ORDERS_LABELS.LABEL_8362}
            {/* 如果有填聯絡人，業務為必填 */}
            {formData.contact_person?.trim() && <span className="text-morandi-red ml-1">*</span>}
          </label>
          <Combobox
            options={salesPersons.map(emp => ({
              value: emp.display_name || emp.english_name || '',
              label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
            }))}
            value={formData.sales_person || ''}
            onChange={value => updateFormData?.({ ...formData, sales_person: value })}
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
            value={formData.assistant || ''}
            onChange={value => updateFormData?.({ ...formData, assistant: value })}
            placeholder={COMP_ORDERS_LABELS.選擇助理}
            emptyMessage={COMP_ORDERS_LABELS.找不到助理}
            showSearchIcon={true}
            showClearButton={true}
            className="mt-1"
            disablePortal={true}
          />
        </div>
      </div>

      {/* 按鈕（只在獨立模式顯示） */}
      {!isEmbedded && (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {COMP_ORDERS_LABELS.取消}
          </Button>
          <Button
            type="submit"
            disabled={!formData.tour_id || !formData.contact_person}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            新增訂單 <span className="ml-1 text-xs opacity-70">(Enter)</span>
          </Button>
        </div>
      )}
    </Container>
  )
}
