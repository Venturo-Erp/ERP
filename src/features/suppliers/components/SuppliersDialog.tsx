'use client'
/**
 * SuppliersDialog - 供應商對話框（完整資訊）
 */

import React from 'react'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LABELS } from '../constants/labels'
import type { SupplierType } from '@/types/supplier.types'

const SUPPLIER_TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: 'hotel', label: '飯店' },
  { value: 'restaurant', label: '餐廳' },
  { value: 'transport', label: '交通' },
  { value: 'attraction', label: '景點' },
  { value: 'guide', label: '導遊' },
  { value: 'agency', label: '旅行社' },
  { value: 'ticketing', label: '票務' },
  { value: 'other', label: '其他' },
]

type SupplierFormData = {
  name: string
  type: SupplierType | ''
  contact_person: string
  phone: string
  email: string
  tax_id: string
  bank_name: string
  bank_account_name: string
  bank_account: string
  notes: string
}

interface SuppliersDialogProps {
  isOpen: boolean
  onClose: () => void
  formData: SupplierFormData
  onFormFieldChange: <K extends keyof SupplierFormData>(
    field: K,
    value: SupplierFormData[K]
  ) => void
  onSubmit: () => void
  isEditMode?: boolean
}

export const SuppliersDialog: React.FC<SuppliersDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormFieldChange,
  onSubmit,
  isEditMode = false,
}) => {
  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={isEditMode ? LABELS.editSupplier : LABELS.addSupplier}
      subtitle={isEditMode ? LABELS.editSubtitle : LABELS.addSubtitle}
      onSubmit={onSubmit}
      submitLabel={isEditMode ? LABELS.saveChanges : LABELS.addSupplier}
      submitDisabled={!formData.name}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* 必填：名稱 + 類別 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>
              {LABELS.supplierName} <span className="text-morandi-red">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={e => onFormFieldChange('name', e.target.value)}
              placeholder={LABELS.supplierNamePlaceholder}
              className="mt-1"
            />
          </div>
          <div>
            <Label>
              類別 <span className="text-morandi-red">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={value => onFormFieldChange('type', value as SupplierType)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="選擇類別" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 選填：左右兩欄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-morandi-muted">聯絡人</Label>
              <Input
                value={formData.contact_person}
                onChange={e => onFormFieldChange('contact_person', e.target.value)}
                placeholder="例：王小明"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">電話</Label>
              <Input
                value={formData.phone}
                onChange={e => onFormFieldChange('phone', e.target.value)}
                placeholder="例：02-2345-6789"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => onFormFieldChange('email', e.target.value)}
                placeholder="例：contact@hotel.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">統編</Label>
              <Input
                value={formData.tax_id}
                onChange={e => onFormFieldChange('tax_id', e.target.value)}
                placeholder="例：12345678"
                maxLength={8}
                className="mt-1"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-morandi-muted">銀行名稱</Label>
              <Input
                value={formData.bank_name}
                onChange={e => onFormFieldChange('bank_name', e.target.value)}
                placeholder="例：台灣銀行"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">戶名</Label>
              <Input
                value={formData.bank_account_name}
                onChange={e => onFormFieldChange('bank_account_name', e.target.value)}
                placeholder="例：XX旅行社有限公司"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">銀行帳號</Label>
              <Input
                value={formData.bank_account}
                onChange={e => onFormFieldChange('bank_account', e.target.value)}
                placeholder="例：1234-5678-9012-3456"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-muted">備註</Label>
              <Input
                value={formData.notes}
                onChange={e => onFormFieldChange('notes', e.target.value)}
                placeholder="例：常用供應商"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
