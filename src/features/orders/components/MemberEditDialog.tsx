'use client'
/**
 * MemberEditDialog - 成員編輯/驗證對話框
 *
 * 功能：
 * - 編輯成員資料
 * - 驗證護照資料（OCR 後確認）
 * - 護照圖片編輯（使用統一的 ImageEditor 元件）
 * - 護照重新辨識
 *
 * 2025-06-27: 改用統一的 ImageEditor 元件
 */

import React, { useState, useCallback } from 'react'
import { AlertTriangle, Pencil, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MemberInfoForm } from './member-edit/MemberInfoForm'
import { PassportSection } from './member-edit/PassportSection'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '../types/order-member.types'
import { COMP_ORDERS_LABELS } from '../constants/labels'

type EditMode = 'edit' | 'verify'

export interface EditFormData {
  chinese_name?: string
  passport_name?: string
  passport_name_print?: string
  birth_date?: string
  gender?: string
  id_number?: string
  passport_number?: string
  passport_expiry?: string
  special_meal?: string
  remarks?: string
}

// 圖片壓縮函數
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = ev => {
      const img = new Image()
      img.src = ev.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxDimension = 1200
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error(COMP_ORDERS_LABELS.無法取得_canvas_context))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              reject(new Error(COMP_ORDERS_LABELS.壓縮失敗))
            }
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

interface MemberEditDialogProps {
  isOpen: boolean
  editMode: EditMode
  editingMember: OrderMember | null
  editFormData: EditFormData
  isSaving: boolean
  isRecognizing: boolean
  onClose: () => void
  onFormDataChange: (data: EditFormData) => void
  onMemberChange: (member: OrderMember) => void
  onSave: () => void
  onRecognize: (imageUrl: string) => Promise<void>
}

export function MemberEditDialog({
  isOpen,
  editMode,
  editingMember,
  editFormData,
  isSaving,
  isRecognizing,
  onClose,
  onFormDataChange,
  onMemberChange,
  onSave,
  onRecognize,
}: MemberEditDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  // 從顧客主檔同步資料
  const handleSyncFromCustomer = useCallback(async () => {
    if (!editingMember?.customer_id) {
      toast.error(COMP_ORDERS_LABELS.此成員尚未關聯顧客)
      return
    }

    setIsSyncing(true)
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, code, name, english_name, phone, email, national_id, birth_date, gender, address, passport_number, passport_expiry, passport_name, passport_name_print, passport_image_url, vip_level, is_vip, member_type, emergency_contact, notes, nickname, source, company, workspace_id, created_at, updated_at')
        .eq('id', editingMember.customer_id)
        .single()

      if (error || !customer) {
        toast.error(COMP_ORDERS_LABELS.找不到關聯的顧客資料)
        return
      }

      // 更新表單資料
      onFormDataChange({
        ...editFormData,
        passport_name: customer.passport_name || editFormData.passport_name,
        passport_number: customer.passport_number || editFormData.passport_number,
        passport_expiry: customer.passport_expiry || editFormData.passport_expiry,
        birth_date: customer.birth_date || editFormData.birth_date,
        id_number: customer.national_id || editFormData.id_number,
        gender: customer.gender || editFormData.gender,
      })

      // 如果顧客有護照照片，也更新成員的護照照片
      if (
        customer.passport_image_url &&
        customer.passport_image_url !== editingMember.passport_image_url
      ) {
        onMemberChange({
          ...editingMember,
          passport_image_url: customer.passport_image_url,
        })
      }

      toast.success(COMP_ORDERS_LABELS.已從顧客主檔同步資料)
    } catch {
      toast.error(COMP_ORDERS_LABELS.同步失敗)
    } finally {
      setIsSyncing(false)
    }
  }, [editingMember, editFormData, onFormDataChange, onMemberChange])

  // 上傳護照照片
  const handleUploadPassport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !editingMember) return

      try {
        const compressedFile = await compressImage(file)
        const random = Math.random().toString(36).substring(2, 8)
        const fileName = `passport_${Date.now()}_${random}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('passport-images')
          .upload(fileName, compressedFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData, error: urlError } = await supabase.storage
          .from('passport-images')
          .createSignedUrl(fileName, 3600 * 24 * 365) // 1 year signed URL

        if (urlError) throw urlError

        onMemberChange({
          ...editingMember,
          passport_image_url: urlData.signedUrl,
        })

        toast.success(COMP_ORDERS_LABELS.護照照片已上傳)

        // 自動進行 OCR
        if (onRecognize) {
          try {
            await onRecognize(urlData.signedUrl)
          } catch {
            // OCR 失敗不影響上傳
          }
        }
      } catch (error) {
        logger.error(COMP_ORDERS_LABELS.上傳護照照片失敗, error)
        toast.error(COMP_ORDERS_LABELS.上傳失敗_請稍後再試)
      }
    },
    [editingMember, onMemberChange, onRecognize]
  )

  // 再次辨識
  const handleRecognize = useCallback(async () => {
    if (!editingMember?.passport_image_url) return
    await onRecognize(editingMember.passport_image_url)
  }, [editingMember, onRecognize])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        nested
        level={2}
        className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {editMode === 'verify' ? (
              <>
                <AlertTriangle className="text-status-warning" size={20} />
                {COMP_ORDERS_LABELS.驗證成員資料}
              </>
            ) : (
              <>
                <Pencil className="text-morandi-blue" size={20} />
                {COMP_ORDERS_LABELS.編輯成員資料}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4 flex-1 overflow-y-auto">
          {/* 左邊：護照照片 */}
          <PassportSection
            editingMember={editingMember}
            editMode={editMode}
            isRecognizing={isRecognizing}
            onMemberChange={onMemberChange}
            onRecognize={handleRecognize}
            onUploadPassport={handleUploadPassport}
          />

          {/* 右邊：表單 */}
          <MemberInfoForm formData={editFormData} onChange={onFormDataChange} />
        </div>

        {/* 按鈕區域 - 固定在底部 */}
        <div className="flex-shrink-0 flex justify-between pt-4 pb-2 border-t">
          {/* 左邊：從顧客同步按鈕 */}
          <div>
            {editingMember?.customer_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-morandi-blue border-morandi-blue/30 hover:bg-morandi-blue/10"
                onClick={handleSyncFromCustomer}
                disabled={isSyncing || isSaving}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {COMP_ORDERS_LABELS.從顧客同步}
              </Button>
            )}
          </div>

          {/* 右邊：取消和儲存按鈕 */}
          <div className="flex gap-3">
            <Button variant="outline" className="gap-1" onClick={onClose} disabled={isSaving}>
              <X size={16} />
              {COMP_ORDERS_LABELS.取消}
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              size="lg"
              className={
                editMode === 'verify'
                  ? 'bg-status-success hover:bg-morandi-green text-white px-8 font-medium'
                  : 'bg-morandi-gold hover:bg-morandi-gold-hover text-white px-8 font-medium'
              }
            >
              {isSaving
                ? COMP_ORDERS_LABELS.儲存中
                : editMode === 'verify'
                  ? COMP_ORDERS_LABELS.確認驗證
                  : COMP_ORDERS_LABELS.儲存變更}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
