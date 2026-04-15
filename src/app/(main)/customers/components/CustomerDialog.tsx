'use client'
/**
 * 顧客詳情/編輯對話框（統一組件）
 *
 * mode:
 * - 'view': 檢視模式（唯讀）
 * - 'edit': 編輯模式（可修改）
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Edit, Upload, ImageOff, Save, Pencil, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { FormField } from '@/components/ui/form-field'
import { ManagedDialog, useDirtyState } from '@/components/dialog'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
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

  // 圖片編輯
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null)

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
      setLocalImageUrl(null)
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

  // 圖片編輯存檔
  const handleEditorSave = (_settings: ImageEditorSettings) => {
    // 不需要單獨保存設定
  }

  // 圖片裁切並存檔
  const handleEditorCropAndSave = async (blob: Blob, _settings: ImageEditorSettings) => {
    if (!customer) return

    try {
      const oldUrl = localImageUrl || customer.passport_image_url

      // 上傳裁切後的圖片
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `passport_${Date.now()}_${random}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(fileName, blob, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData, error: urlError } = await supabase.storage
        .from('passport-images')
        .createSignedUrl(fileName, 3600)

      if (urlError || !urlData?.signedUrl) {
        throw urlError || new Error('Failed to create signed URL')
      }

      // 更新本地顯示
      setLocalImageUrl(urlData.signedUrl)

      // 更新資料庫
      await supabase
        .from('customers')
        .update({ passport_image_url: urlData.signedUrl })
        .eq('id', customer.id)

      // 刪除舊照片
      if (oldUrl) {
        try {
          const match = oldUrl.match(/passport-images\/(.+)$/)
          if (match) {
            const oldFileName = decodeURIComponent(match[1])
            await supabase.storage.from('passport-images').remove([oldFileName])
          }
        } catch (e) {
          logger.error('Failed to delete old image:', e)
        }
      }

      toast.success('照片已更新')
      setIsEditorOpen(false)
    } catch (error) {
      logger.error('Failed to save edited image:', error)
      toast.error('儲存失敗')
    }
  }

  if (!customer) return null

  const currentImageUrl = localImageUrl || customer.passport_image_url
  const isVerified = customer.verification_status === 'verified'

  return (
    <>
      <ManagedDialog
        open={open}
        onOpenChange={onOpenChange}
        title={L.title_detail}
        maxWidth="5xl"
        showFooter={false}
        confirmOnDirtyClose={isEdit}
        externalDirty={isDirty}
      >
        <div className="flex gap-8">
          {/* 左側：護照照片（橫向） */}
          <div className="w-1/2 rounded-lg overflow-hidden bg-morandi-container relative">
            {currentImageUrl ? (
              <>
                <img
                  src={currentImageUrl}
                  alt={L.passport_alt(customer.name)}
                  className="w-full h-full object-cover absolute inset-0"
                />
                {/* 驗證狀態 - 左上角 */}
                <div
                  className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    isVerified
                      ? 'bg-morandi-green/90 text-white'
                      : 'bg-status-warning/90 text-white'
                  }`}
                >
                  {isVerified ? <Check size={12} /> : '⚠'}
                  {isVerified ? L.status_verified : L.status_unverified}
                </div>
                {/* 編輯按鈕 - 右下角 */}
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="absolute bottom-3 right-3 p-2 bg-card/90 hover:bg-card rounded-full shadow-md transition-all opacity-80 hover:opacity-100"
                  title="編輯照片"
                >
                  <Pencil size={16} className="text-morandi-primary" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-morandi-muted">
                <ImageOff size={40} className="mb-2 opacity-50" />
                <span className="text-sm">{L.no_passport_photo}</span>
                {isEdit && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5">
                    <Upload size={14} />
                    {L.btn_upload_photo}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 右側：資料欄位 */}
          <div className="w-1/2">
            {/* 基本資料 - 2 欄 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <FormField label={L.label_name} labelClassName="text-xs text-morandi-secondary">
                <Input
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={L.label_passport_name}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.passport_name}
                  onChange={e => updateField('passport_name', e.target.value.toUpperCase())}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={L.label_passport_number}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.passport_number}
                  onChange={e => updateField('passport_number', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={L.label_passport_expiry}
                labelClassName="text-xs text-morandi-secondary"
              >
                {isEdit ? (
                  <DatePicker
                    value={formData.passport_expiry}
                    onChange={date => updateField('passport_expiry', date)}
                    className="h-10"
                  />
                ) : (
                  <Input
                    value={formData.passport_expiry || ''}
                    readOnly
                    className="h-10 bg-card cursor-default"
                  />
                )}
              </FormField>

              <FormField label={L.label_birth_date} labelClassName="text-xs text-morandi-secondary">
                {isEdit ? (
                  <DatePicker
                    value={formData.birth_date}
                    onChange={date => updateField('birth_date', date)}
                    className="h-10"
                  />
                ) : (
                  <Input
                    value={formData.birth_date || ''}
                    readOnly
                    className="h-10 bg-card cursor-default"
                  />
                )}
              </FormField>

              <FormField
                label={L.label_national_id}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.national_id}
                  onChange={e => updateField('national_id', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField label={L.label_phone} labelClassName="text-xs text-morandi-secondary">
                <Input
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField label={L.label_email} labelClassName="text-xs text-morandi-secondary">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              {/* 飲食禁忌 - 佔滿兩格 */}
              <div className="col-span-2">
                <FormField label={L.label_dietary} labelClassName="text-xs text-morandi-secondary">
                  <Input
                    value={formData.dietary_restrictions}
                    onChange={e => updateField('dietary_restrictions', e.target.value)}
                    readOnly={!isEdit}
                    placeholder={isEdit ? L.placeholder_dietary : ''}
                    className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-border/50">
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
              <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
                <X size={14} />
                {L.btn_close}
              </Button>
              <Button
                onClick={() => onModeChange?.('edit')}
                className="gap-1.5 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Edit size={14} />
                {L.btn_edit}
              </Button>
            </>
          )}
        </div>
      </ManagedDialog>

      {/* 圖片編輯器 */}
      {currentImageUrl && (
        <ImageEditor
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageSrc={currentImageUrl}
          aspectRatio={3 / 2}
          onSave={handleEditorSave}
          onCropAndSave={handleEditorCropAndSave}
          showAi={false}
        />
      )}
    </>
  )
}
