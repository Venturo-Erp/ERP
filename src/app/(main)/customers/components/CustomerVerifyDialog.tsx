'use client'
/**
 * 顧客資料驗證對話框
 * 功能：護照圖片檢視、編輯、OCR 辨識、資料比對
 *
 * 2025-06-27: 改用統一的 ImageEditor 元件
 * 2025-06-27: 改用 i18n 多語系
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Check, AlertTriangle, RefreshCw, X, Upload, ImageOff, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Customer, UpdateCustomerData } from '@/types/customer.types'
import { useOcrRecognition } from '@/hooks'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'
import { deletePassportImage, getPassportDisplayUrl } from '@/lib/passport-storage'

interface CustomerVerifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onUpdate: (id: string, data: Partial<UpdateCustomerData>) => Promise<void>
}

function CustomerVerifyDialog({
  open,
  onOpenChange,
  customer,
  onUpdate,
}: CustomerVerifyDialogProps) {
  const t = useTranslations()

  // 表單資料
  const [formData, setFormData] = useState<Partial<UpdateCustomerData>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null)

  // 圖片編輯器狀態
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // OCR Hook
  const { isRecognizing, recognizePassport } = useOcrRecognition()

  // 重置狀態
  const handleClose = useCallback(() => {
    setFormData({})
    setLocalImageUrl(null)
    setIsEditorOpen(false)
    onOpenChange(false)
  }, [onOpenChange])

  // 上傳新照片
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !customer) return

    try {
      // 統一格式：passport_{timestamp}_{random}.jpg
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `passport_${Date.now()}_${random}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // 本地記錄 bare filename、顯示時現場簽
      setLocalImageUrl(fileName)

      toast.success(t('passport.uploadSuccess'))

      // OCR 需要真的能 HTTP GET 的 URL、臨時簽一個
      try {
        const signed = await getPassportDisplayUrl(fileName)
        if (signed) {
          await recognizePassport(signed, result => {
            setFormData(prev => ({
              ...prev,
              ...result,
            }))
          })
        }
      } catch {
        // OCR 失敗不影響上傳成功
      }
    } catch (error) {
      logger.error('Failed to upload passport photo:', error)
      toast.error(t('passport.uploadFailed'))
    }
  }

  // 初始化表單（當 customer 改變時）
  const initFormData = useCallback(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        passport_name: customer.passport_name || '',
        passport_number: customer.passport_number || '',
        passport_expiry: customer.passport_expiry || '',
        birth_date: customer.birth_date || '',
        national_id: customer.national_id || '',
      })
    }
  }, [customer])

  // 當對話框打開或 customer 改變時，初始化表單
  useEffect(() => {
    if (open && customer) {
      initFormData()
      setLocalImageUrl(null)
    }
  }, [open, customer, initFormData])

  // 儲存驗證結果
  const handleSave = async () => {
    if (!customer) return
    setIsSaving(true)
    try {
      // 如果有本地圖片URL（新上傳的），需要更新到資料庫
      const updateData: Partial<UpdateCustomerData> = {
        ...formData,
        verification_status: 'verified',
      }

      if (localImageUrl) {
        updateData.passport_image_url = localImageUrl
        // 刪除舊照片
        await deletePassportImage(customer.passport_image_url)
      }

      await onUpdate(customer.id, updateData)
      toast.success(t('customer.customerVerified'))
      handleClose()
    } catch (error) {
      toast.error(t('messages.saveFailed'))
      logger.error('Verification failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // OCR 再次辨識
  const handleReOcr = async () => {
    const stored = localImageUrl || customer?.passport_image_url
    if (!stored) return
    try {
      const signed = await getPassportDisplayUrl(stored)
      if (!signed) throw new Error('Failed to sign passport URL')
      await recognizePassport(signed, result => {
        setFormData(prev => ({
          ...prev,
          ...result,
        }))
      })
    } catch (error) {
      toast.error(t('passport.recognizeFailed'))
    }
  }

  // 圖片編輯器存檔（不做裁切，只保存設定）
  const handleEditorSave = (settings: ImageEditorSettings) => {
    // 目前護照不需要保存位置設定
    logger.log('ImageEditor settings saved:', settings)
  }

  // 圖片編輯器裁切並存檔
  const handleEditorCropAndSave = async (blob: Blob, _settings: ImageEditorSettings) => {
    if (!customer) return

    try {
      const oldStored = localImageUrl || customer.passport_image_url

      // 上傳裁切後的圖片；DB 只存 bare filename、顯示時動態簽 15 分鐘
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `passport_${Date.now()}_${random}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(fileName, blob, { upsert: true })

      if (uploadError) throw uploadError

      // 更新本地顯示（存 bare filename）
      setLocalImageUrl(fileName)

      // 刪除舊照片
      await deletePassportImage(oldStored)

      toast.success(t('passport.imageSaved'))
      setIsEditorOpen(false)
    } catch (error) {
      logger.error('Failed to save edited image:', error)
      toast.error(t('messages.saveFailed'))
    }
  }

  const currentStored = localImageUrl || customer?.passport_image_url
  const displayUrl = usePassportImageUrl(currentStored)

  if (!customer) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent level={1} className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {customer.verification_status === 'verified' ? (
                <>
                  <Check className="text-status-success" size={20} />
                  {t('customer.customerDetail')} ({t('customer.verified')})
                </>
              ) : (
                <>
                  <AlertTriangle className="text-status-warning" size={20} />
                  {t('customer.verifyCustomer')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4 flex-1 overflow-y-auto">
            {/* 左邊：護照照片 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-morandi-primary">{t('passport.image')}</h3>
                {currentStored && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold rounded transition-colors"
                    >
                      <Pencil size={12} />
                      {t('passport.editImage')}
                    </button>
                    <Button
                      type="button"
                      variant="soft-gold"
                      size="xs"
                      onClick={handleReOcr}
                      disabled={isRecognizing}
                      className="px-2 py-1 text-xs gap-1.5"
                    >
                      <RefreshCw size={12} className={isRecognizing ? 'animate-spin' : ''} />
                      {isRecognizing ? t('passport.recognizing') : t('passport.reRecognize')}
                    </Button>
                  </div>
                )}
              </div>

              {/* 圖片容器 */}
              {currentStored ? (
                <div
                  className="relative overflow-hidden rounded-lg border bg-muted group cursor-pointer"
                  style={{ height: '320px' }}
                  onClick={() => setIsEditorOpen(true)}
                >
                  <img
                    src={displayUrl ?? ''}
                    alt={t('passport.title')}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  {/* 重新上傳按鈕 */}
                  <label
                    htmlFor="customer-passport-reupload"
                    className="absolute bottom-2 right-2 p-2 bg-card/90 hover:bg-card rounded-lg cursor-pointer shadow-sm border"
                    title={t('passport.reupload')}
                    onClick={e => e.stopPropagation()}
                  >
                    <Upload size={16} className="text-morandi-gold" />
                    <input
                      id="customer-passport-reupload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadPhoto}
                    />
                  </label>
                  {/* 編輯提示 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {t('passport.clickToEdit')}
                    </span>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="customer-passport-upload"
                  className="w-full h-80 bg-morandi-container/30 rounded-lg flex flex-col items-center justify-center text-morandi-primary border-2 border-dashed border-morandi-secondary/30 hover:border-morandi-gold hover:bg-morandi-gold/5 cursor-pointer transition-all"
                >
                  <ImageOff size={48} className="mb-3 text-morandi-muted" />
                  <span className="text-sm font-medium">{t('passport.upload')}</span>
                  <span className="text-xs mt-1 text-morandi-muted">JPG, PNG</span>
                  <input
                    id="customer-passport-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPhoto}
                  />
                </label>
              )}
            </div>

            {/* 右邊：表單 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-morandi-primary">
                {t('customer.customerDetail')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-morandi-primary">
                    {t('customer.chineseName')}
                  </label>
                  <Input
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary">
                    {t('customer.passportName')}
                  </label>
                  <Input
                    value={formData.passport_name || ''}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, passport_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary">
                    {t('customer.passportNumber')}
                  </label>
                  <Input
                    value={formData.passport_number || ''}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, passport_number: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary">
                    {t('customer.passportExpiry')}
                  </label>
                  <DatePicker
                    value={formData.passport_expiry || ''}
                    onChange={date => setFormData(prev => ({ ...prev, passport_expiry: date }))}
                    placeholder={t('common.select')}
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary">{t('customer.birthDate')}</label>
                  <DatePicker
                    value={formData.birth_date || ''}
                    onChange={date => setFormData(prev => ({ ...prev, birth_date: date }))}
                    placeholder={t('common.select')}
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary">{t('customer.idNumber')}</label>
                  <Input
                    value={formData.national_id || ''}
                    onChange={e => setFormData(prev => ({ ...prev, national_id: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="soft-gold" onClick={handleClose} className="gap-2">
              <X size={16} />
              {t('common.cancel')}
            </Button>
            <Button variant="soft-gold"
              onClick={handleSave}
              disabled={isSaving}
 className="gap-2"
            >
              <Check size={16} />
              {isSaving ? t('common.saving') : t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 圖片編輯器 */}
      {currentStored && displayUrl && (
        <ImageEditor
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageSrc={displayUrl}
          aspectRatio={3 / 2} // 護照比例
          onSave={handleEditorSave}
          onCropAndSave={handleEditorCropAndSave}
          showAi={false} // 護照不需要 AI 美化
        />
      )}
    </>
  )
}
