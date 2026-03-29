'use client'
/**
 * 顧客詳情/編輯對話框（統一組件）
 * 
 * mode:
 * - 'view': 檢視模式（唯讀）
 * - 'edit': 編輯模式（可修改）
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Edit, Upload, ImageOff, Save, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { FormField } from '@/components/ui/form-field'
import { ManagedDialog, useDirtyState } from '@/components/dialog'
import type { Customer } from '@/types/customer.types'
import { CUSTOMER_DETAIL_LABELS as L } from '../constants/labels'

interface CustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  mode: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  onSave?: (data: Partial<Customer>) => Promise<void>
}

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  mode,
  onModeChange,
  onSave,
}: CustomerDialogProps) {
  const isEdit = mode === 'edit'

  // 表單資料
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    birth_date: '',
    passport_name: '',
    passport_number: '',
    passport_expiry: '',
    dietary_restrictions: '',
  })

  // 追蹤變更
  const { isDirty, resetDirty, setOriginalData, checkDirty } = useDirtyState()
  const [saving, setSaving] = useState(false)

  // 當 customer 或 open 變化時，重置表單
  useEffect(() => {
    if (open && customer) {
      const data = {
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        national_id: customer.national_id || '',
        birth_date: customer.birth_date || '',
        passport_name: customer.passport_name || '',
        passport_number: customer.passport_number || '',
        passport_expiry: customer.passport_expiry || '',
        dietary_restrictions: customer.dietary_restrictions || '',
      }
      setFormData(data)
      setOriginalData(data)
      resetDirty()
    }
  }, [open, customer, setOriginalData, resetDirty])

  // 更新欄位
  const updateField = useCallback(
    <K extends keyof typeof formData>(field: K, value: string) => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value }
        checkDirty(updated)
        return updated
      })
    },
    [checkDirty]
  )

  // 儲存
  const handleSave = async () => {
    if (!customer || !onSave) return
    setSaving(true)
    try {
      await onSave(formData)
      resetDirty()
      onModeChange?.('view')
    } finally {
      setSaving(false)
    }
  }

  if (!customer) return null

  return (
    <ManagedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={L.title_detail}
      maxWidth="4xl"
      showFooter={false}
      confirmOnDirtyClose={isEdit}
      externalDirty={isDirty}
    >
      <div className="grid grid-cols-2 gap-6 py-4">
        {/* 左側：護照照片（橫向） */}
        <div className="space-y-3">
          <div className="aspect-[3/2] rounded-lg overflow-hidden bg-morandi-container relative group">
            {customer.passport_image_url ? (
              <>
                <img
                  src={customer.passport_image_url}
                  alt={L.passport_alt(customer.name)}
                  className="w-full h-full object-cover"
                />
                {isEdit && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary" className="gap-1.5">
                      <Upload size={14} />
                      {L.btn_change_photo}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-morandi-muted">
                <ImageOff size={32} className="mb-2 opacity-50" />
                <span className="text-xs">{L.no_passport_photo}</span>
                {isEdit && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5">
                    <Upload size={14} />
                    {L.btn_upload_photo}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 驗證狀態 */}
          {customer.verification_status === 'verified' ? (
            <div className="text-center text-xs text-morandi-green font-medium">
              ✓ {L.status_verified}
            </div>
          ) : (
            <div className="text-center text-xs text-status-warning font-medium">
              ⚠ {L.status_unverified}
            </div>
          )}
        </div>

        {/* 右側：資料欄位 */}
        <div className="space-y-3">
          {/* 基本資料 - 2 欄 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <FormField label={L.label_name} labelClassName="text-xs text-morandi-secondary">
              <Input
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                disabled={!isEdit}
                className="h-9"
              />
            </FormField>

            <FormField label={L.label_passport_name} labelClassName="text-xs text-morandi-secondary">
              <Input
                value={formData.passport_name}
                onChange={e => updateField('passport_name', e.target.value.toUpperCase())}
                disabled={!isEdit}
                className="h-9 font-mono"
              />
            </FormField>

            <FormField label={L.label_passport_number} labelClassName="text-xs text-morandi-secondary">
              <Input
                value={formData.passport_number}
                onChange={e => updateField('passport_number', e.target.value)}
                disabled={!isEdit}
                className="h-9 font-mono"
              />
            </FormField>

            <FormField label={L.label_passport_expiry} labelClassName="text-xs text-morandi-secondary">
              <DatePicker
                value={formData.passport_expiry}
                onChange={date => updateField('passport_expiry', date)}
                disabled={!isEdit}
                className="h-9"
              />
            </FormField>

            <FormField label={L.label_birth_date} labelClassName="text-xs text-morandi-secondary">
              <DatePicker
                value={formData.birth_date}
                onChange={date => updateField('birth_date', date)}
                disabled={!isEdit}
                className="h-9"
              />
            </FormField>

            <FormField label={L.label_national_id} labelClassName="text-xs text-morandi-secondary">
              <Input
                value={formData.national_id}
                onChange={e => updateField('national_id', e.target.value)}
                disabled={!isEdit}
                className="h-9 font-mono"
              />
            </FormField>

            <FormField label={L.label_phone} labelClassName="text-xs text-morandi-secondary">
              <Input
                value={formData.phone}
                onChange={e => updateField('phone', e.target.value)}
                disabled={!isEdit}
                className="h-9"
              />
            </FormField>

            <FormField label={L.label_email} labelClassName="text-xs text-morandi-secondary">
              <Input
                type="email"
                value={formData.email}
                onChange={e => updateField('email', e.target.value)}
                disabled={!isEdit}
                className="h-9"
              />
            </FormField>
          </div>

          {/* 飲食禁忌 - 獨立一行 */}
          <FormField label={L.label_dietary} labelClassName="text-xs text-morandi-secondary">
            <Input
              value={formData.dietary_restrictions}
              onChange={e => updateField('dietary_restrictions', e.target.value)}
              disabled={!isEdit}
              placeholder={isEdit ? L.placeholder_dietary : ''}
              className="h-9"
            />
          </FormField>
        </div>
      </div>

      {/* 底部按鈕 */}
      <div className="flex justify-end gap-2 pt-4 border-t border-morandi-border">
        {isEdit ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                resetDirty()
                onModeChange?.('view')
              }}
              className="gap-1.5"
            >
              <X size={14} />
              {L.btn_cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="gap-1.5 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Save size={14} />
              {saving ? L.btn_saving : L.btn_confirm}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-1.5"
            >
              <X size={14} />
              {L.btn_close}
            </Button>
            <Button
              onClick={() => onModeChange?.('edit')}
              className="gap-1.5 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <ExternalLink size={14} />
              {L.btn_edit}
            </Button>
          </>
        )}
      </div>
    </ManagedDialog>
  )
}
