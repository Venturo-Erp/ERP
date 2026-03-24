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
  code: string
  english_name: string
  tax_id: string
  bank_name: string
  bank_branch: string
  bank_code_legacy: string
  bank_account_name: string
  bank_account: string
  contact_person: string
  phone: string
  email: string
  address: string
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
      maxWidth="2xl"
    >
      <div className="space-y-3">
        {/* 第1列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>
              供應商名稱 <span className="text-morandi-red">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={e => onFormFieldChange('name', e.target.value)}
              placeholder="例：台銀"
              className="mt-1"
            />
          </div>
          <div>
            <Label>供應商編號</Label>
            <Input
              value={formData.code}
              onChange={e => onFormFieldChange('code', e.target.value)}
              placeholder="系統自動產生或手動輸入"
              className="mt-1"
            />
          </div>
        </div>

        {/* 第2列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>公司全名</Label>
            <Input
              value={formData.english_name}
              onChange={e => onFormFieldChange('english_name', e.target.value)}
              placeholder="例：台灣銀行股份有限公司"
              className="mt-1"
            />
          </div>
          <div>
            <Label>公司統編</Label>
            <Input
              value={formData.tax_id}
              onChange={e => onFormFieldChange('tax_id', e.target.value)}
              placeholder="例：12345678"
              maxLength={8}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第3列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>銀行／分行名稱</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input
                value={formData.bank_name}
                onChange={e => onFormFieldChange('bank_name', e.target.value)}
                placeholder="例：台灣銀行"
              />
              <Input
                value={formData.bank_branch}
                onChange={e => onFormFieldChange('bank_branch', e.target.value)}
                placeholder="例：營業部"
              />
            </div>
          </div>
          <div>
            <Label>銀行代碼</Label>
            <Input
              value={formData.bank_code_legacy}
              onChange={e => onFormFieldChange('bank_code_legacy', e.target.value)}
              placeholder="例：004"
              className="mt-1"
            />
          </div>
        </div>

        {/* 第4列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>銀行戶名</Label>
            <Input
              value={formData.bank_account_name}
              onChange={e => onFormFieldChange('bank_account_name', e.target.value)}
              placeholder="例：XX旅行社有限公司"
              className="mt-1"
            />
          </div>
          <div>
            <Label>銀行帳號</Label>
            <Input
              value={formData.bank_account}
              onChange={e => onFormFieldChange('bank_account', e.target.value)}
              placeholder="例：1234-5678-9012-3456"
              className="mt-1"
            />
          </div>
        </div>

        {/* 第5列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>聯絡窗口</Label>
            <Input
              value={formData.contact_person}
              onChange={e => onFormFieldChange('contact_person', e.target.value)}
              placeholder="例：王小明"
              className="mt-1"
            />
          </div>
          <div>
            <Label>聯絡電話</Label>
            <Input
              value={formData.phone}
              onChange={e => onFormFieldChange('phone', e.target.value)}
              placeholder="例：02-2345-6789"
              className="mt-1"
            />
          </div>
        </div>

        {/* 第6列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>電子郵件</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => onFormFieldChange('email', e.target.value)}
              placeholder="例：contact@hotel.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>通訊地址</Label>
            <Input
              value={formData.address}
              onChange={e => onFormFieldChange('address', e.target.value)}
              placeholder="例：台北市中正區..."
              className="mt-1"
            />
          </div>
        </div>

        {/* 第7列：備註（橫跨兩欄）*/}
        <div>
          <Label>備註</Label>
          <Textarea
            value={formData.notes}
            onChange={e => onFormFieldChange('notes', e.target.value)}
            placeholder="例：常用供應商，付款條件淨30天"
            rows={3}
            className="mt-1"
          />
        </div>
      </div>
    </FormDialog>
  )
}
