'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Visa } from '@/stores/types'
import { findActiveOrderConflicts, type ActiveOrderConflict } from '@/lib/utils/sync-passport-image'

// 從 URL 提取檔名並刪除舊照片（僅處理 storage URL，忽略 base64）
async function deleteOldPassportImage(oldUrl: string | null | undefined): Promise<void> {
  if (!oldUrl || oldUrl.startsWith('data:')) return // 跳過 base64 字串
  try {
    const { supabase } = await import('@/lib/supabase/client')
    const match = oldUrl.match(/passport-images\/(.+)$/)
    if (match) {
      const oldFileName = decodeURIComponent(match[1])
      await supabase.storage.from('passport-images').remove([oldFileName])
      logger.log(`已刪除舊護照照片: ${oldFileName}`)
    }
  } catch (error) {
    logger.error('刪除舊護照照片失敗:', error)
  }
}

export interface PassportOCRResult {
  fileName: string
  success: boolean
  imageBase64?: string
  customer?: {
    name: string
    passport_name: string
    passport_number: string
    passport_expiry: string
    birth_date: string
    gender: string
    national_id: string
  }
  error?: string
}

export interface MatchedItem {
  ocrResult: PassportOCRResult
  matchedVisa: Visa | null
  manualVisaId: string | null // 手動選擇的簽證 ID
  updateCustomer: boolean // 是否更新顧客資訊
}

interface UseBatchPickupProps {
  pendingVisas: Visa[]
  updateVisa: (id: string, data: Partial<Visa>) => void
  onComplete: (updatedVisaIds: string[]) => void
}

export function useBatchPickup({ pendingVisas, updateVisa, onComplete }: UseBatchPickupProps) {
  // 步驟：upload -> matching -> confirm
  const [step, setStep] = useState<'upload' | 'matching'>('upload')

  // 上傳相關
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 配對結果
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([])
  const [pickupDate, setPickupDate] = useState(getTodayString())

  // 衝突 Dialog 狀態
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflicts, setConflicts] = useState<ActiveOrderConflict[]>([])
  const [conflictPassportData, setConflictPassportData] = useState<{
    passport_number?: string | null
    passport_name?: string | null
    passport_expiry?: string | null
    birth_date?: string | null
    gender?: string | null
    national_id?: string | null
  } | null>(null)

  // 重置狀態
  const resetState = () => {
    setStep('upload')
    setFiles([])
    setMatchedItems([])
    setPickupDate(getTodayString())
    setIsProcessing(false)
  }

  // 處理檔案選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      setFiles(prev => [...prev, ...Array.from(selectedFiles)])
    }
  }

  // 拖曳處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles) {
      const imageFiles = Array.from(droppedFiles).filter(file => file.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        setFiles(prev => [...prev, ...imageFiles])
      }
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 壓縮圖片
  const compressImage = async (file: File, quality = 0.6): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = e => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

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
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            async blob => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })

                if (compressedFile.size > 800 * 1024 && quality > 0.2) {
                  resolve(await compressImage(file, quality - 0.1))
                } else {
                  resolve(compressedFile)
                }
              } else {
                reject(new Error('壓縮失敗'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  // 開始辨識
  const handleStartOCR = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    try {
      // 壓縮圖片
      const compressedFiles = await Promise.all(files.map(file => compressImage(file)))

      // 呼叫 OCR API
      const formData = new FormData()
      compressedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/ocr/passport', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('OCR 辨識失敗')
      }

      const result = await response.json()
      const ocrResults: PassportOCRResult[] = result.results

      // 進行配對
      const matched: MatchedItem[] = ocrResults.map(ocr => {
        let matchedVisa: Visa | null = null

        if (ocr.success && ocr.customer) {
          // 用護照拼音比對「已送件」的簽證
          const romanization = ocr.customer.passport_name?.toUpperCase()
          const name = ocr.customer.name

          // 先找完全匹配的
          matchedVisa =
            pendingVisas.find(v => {
              // 比對申請人姓名（中文）
              if (v.applicant_name === name) return true
              return false
            }) || null

          // 如果沒找到，試著用護照拼音的姓氏比對
          if (!matchedVisa && romanization) {
            // 護照拼音格式通常是 "WANG/XIAOMING"，取姓氏
            const surname = romanization.split('/')[0]
            if (surname) {
              matchedVisa =
                pendingVisas.find(v => {
                  // 簡單的姓氏比對（中文姓氏通常在最前面）
                  const applicantSurname = v.applicant_name?.charAt(0)
                  // 這裡可以加入更複雜的拼音轉換邏輯
                  return false // 暫時不用這個邏輯
                }) || null
            }
          }
        }

        return {
          ocrResult: ocr,
          matchedVisa,
          manualVisaId: matchedVisa?.id || null,
          updateCustomer: true, // 預設更新顧客資訊
        }
      })

      setMatchedItems(matched)
      setStep('matching')
    } catch (error) {
      logger.error('OCR 辨識錯誤:', error)
      toast.error('辨識失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsProcessing(false)
    }
  }

  // 更新手動選擇的簽證
  const handleManualSelect = (index: number, visaId: string | null) => {
    setMatchedItems(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        manualVisaId: visaId,
        matchedVisa: visaId ? pendingVisas.find(v => v.id === visaId) || null : null,
      }
      return updated
    })
  }

  // 更新是否更新顧客資訊
  const handleToggleUpdateCustomer = (index: number) => {
    setMatchedItems(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        updateCustomer: !updated[index].updateCustomer,
      }
      return updated
    })
  }

  // 確認下件
  const handleConfirmPickup = async () => {
    const itemsToProcess = matchedItems.filter(item => item.manualVisaId)

    if (itemsToProcess.length === 0) {
      toast.error('請至少選擇一筆簽證')
      return
    }

    setIsProcessing(true)
    try {
      const updatedVisaIds: string[] = []
      const allConflicts: ActiveOrderConflict[] = []
      let lastPData: typeof conflictPassportData = null

      for (const item of itemsToProcess) {
        if (!item.manualVisaId) continue

        // 更新簽證狀態
        await updateVisa(item.manualVisaId, {
          status: 'collected',
          pickup_date: pickupDate,
          documents_returned_date: pickupDate,
        })
        updatedVisaIds.push(item.manualVisaId)

        // 如果勾選更新顧客資訊，更新 CRM
        if (item.updateCustomer && item.ocrResult.success && item.ocrResult.customer) {
          try {
            const { updateCustomer } = await import('@/data')
            const { supabase } = await import('@/lib/supabase/client')

            // 找到對應的顧客（用姓名比對）
            const visa = pendingVisas.find(v => v.id === item.manualVisaId)
            if (visa) {
              const { data: customer } = await supabase
                .from('customers')
                .select('id, code, name, english_name, phone, email, national_id, birth_date, gender, address, passport_number, passport_expiry, passport_name, passport_name_print, passport_image_url, vip_level, is_vip, member_type, emergency_contact, notes, nickname, source, company, workspace_id, created_at, updated_at')
                .eq('name', visa.applicant_name)
                .single()

              if (customer) {
                // 如果有新圖片且顧客有舊的 storage 圖片，先記錄舊 URL
                const oldPassportUrl = item.ocrResult.imageBase64
                  ? customer.passport_image_url
                  : null

                await updateCustomer(customer.id, {
                  passport_number:
                    item.ocrResult.customer.passport_number || customer.passport_number,
                  passport_name: item.ocrResult.customer.passport_name || customer.passport_name,
                  passport_expiry:
                    item.ocrResult.customer.passport_expiry || customer.passport_expiry,
                  birth_date: item.ocrResult.customer.birth_date || customer.birth_date,
                  gender: item.ocrResult.customer.gender || customer.gender,
                  passport_image_url: item.ocrResult.imageBase64 || customer.passport_image_url,
                })

                // 更新成功後刪除舊照片
                if (oldPassportUrl) {
                  await deleteOldPassportImage(oldPassportUrl)
                }

                logger.log(`已更新顧客護照資訊: ${customer.name}`)

                // 檢查未出發訂單衝突
                const ocrCustomer = item.ocrResult.customer
                if (ocrCustomer) {
                  const pData = {
                    passport_number: ocrCustomer.passport_number || null,
                    passport_name: ocrCustomer.passport_name || null,
                    passport_expiry: ocrCustomer.passport_expiry || null,
                    birth_date: ocrCustomer.birth_date || null,
                    gender: ocrCustomer.gender || null,
                    national_id: ocrCustomer.national_id || null,
                  }
                  const custConflicts = await findActiveOrderConflicts({
                    customerId: customer.id,
                    passportData: pData,
                  })
                  if (custConflicts.length > 0) {
                    allConflicts.push(...custConflicts)
                    lastPData = pData
                  }
                }
              }
            }
          } catch (err) {
            logger.error('更新顧客資訊失敗:', err)
          }
        }
      }

      // 如果有衝突，顯示 Dialog
      if (allConflicts.length > 0) {
        setConflicts(allConflicts)
        setConflictPassportData(lastPData)
        setConflictDialogOpen(true)
      }

      toast.success(`已完成 ${updatedVisaIds.length} 筆下件`)
      onComplete(updatedVisaIds)
      resetState()
    } catch (error) {
      logger.error('批次下件失敗:', error)
      toast.error('下件失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  // 取得已選擇的簽證 ID 列表（用於過濾下拉選單）
  const selectedVisaIds = matchedItems
    .map(item => item.manualVisaId)
    .filter((id): id is string => id !== null)

  // 計算可確認的數量
  const confirmableCount = matchedItems.filter(item => item.manualVisaId).length

  return {
    // State
    step,
    files,
    isDragging,
    isProcessing,
    fileInputRef,
    matchedItems,
    pickupDate,
    selectedVisaIds,
    confirmableCount,

    // 衝突 Dialog
    conflictDialogOpen,
    setConflictDialogOpen,
    conflicts,
    conflictPassportData,

    // Actions
    setStep,
    setPickupDate,
    resetState,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    handleStartOCR,
    handleManualSelect,
    handleToggleUpdateCustomer,
    handleConfirmPickup,
  }
}
