/**
 * Passport Upload Hook
 * 管理護照批次上傳功能：文件拖放、PDF轉圖片、壓縮、OCR處理
 *
 * 功能：
 * - 批次重複檢測
 * - 多重比對邏輯（身分證 → 生日 → 姓名 → 護照號碼）
 * - 簡體轉繁體中文
 * - 智慧比對：資料相同時自動更新，不同時才詢問
 * - 找到客戶時更新，未找到時新增
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'
// 不再自動同步到訂單成員，讓訂單那邊手動處理
import type { Customer } from '@/types/customer.types'
import { CUSTOMER_PASSPORT_UPLOAD_LABELS as CPL } from '../constants/labels'

// 常用簡體→繁體對照表（人名常用字）
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  陈: '陳',
  张: '張',
  刘: '劉',
  杨: '楊',
  赵: '趙',
  黄: '黃',
  周: '週',
  吴: '吳',
  郑: '鄭',
  王: '王',
  李: '李',
  林: '林',
  罗: '羅',
  梁: '梁',
  宋: '宋',
  郭: '郭',
  何: '何',
  马: '馬',
  胡: '胡',
  朱: '朱',
  高: '高',
  徐: '徐',
  孙: '孫',
  萧: '蕭',
  谢: '謝',
  韩: '韓',
  唐: '唐',
  冯: '馮',
  于: '于',
  董: '董',
  叶: '葉',
  程: '程',
  蔡: '蔡',
  彭: '彭',
  潘: '潘',
  袁: '袁',
  田: '田',
  余: '余',
  丁: '丁',
  沈: '沈',
  钱: '錢',
  姜: '姜',
  戴: '戴',
  魏: '魏',
  曹: '曹',
  崔: '崔',
  邵: '邵',
  侯: '侯',
  石: '石',
  邓: '鄧',
  龙: '龍',
  贾: '賈',
  薛: '薛',
  夏: '夏',
  贺: '賀',
  顾: '顧',
  毛: '毛',
  郝: '郝',
  龚: '龔',
  邱: '邱',
  骆: '駱',
  熊: '熊',
  向: '向',
  陆: '陸',
  乔: '喬',
  苏: '蘇',
  范: '范',
  方: '方',
  任: '任',
  鲁: '魯',
  韦: '韋',
  姚: '姚',
  廖: '廖',
  邹: '鄒',
  汪: '汪',
  连: '連',
  傅: '傅',
  尹: '尹',
  钟: '鍾',
  卢: '盧',
  丰: '豐',
  华: '華',
  兰: '蘭',
  关: '關',
  蒋: '蔣',
  万: '萬',
  东: '東',
  欧: '歐',
  阳: '陽',
  闻: '聞',
  严: '嚴',
  纪: '紀',
  齐: '齊',
  庄: '莊',
  岳: '岳',
  宛: '宛',
  屏: '屏',
  国: '國',
  伟: '偉',
  强: '強',
  军: '軍',
  明: '明',
  辉: '輝',
  杰: '傑',
  飞: '飛',
  涛: '濤',
  鹏: '鵬',
  浩: '浩',
  亮: '亮',
  峰: '峰',
  义: '義',
  龄: '齡',
  娟: '娟',
  丽: '麗',
  艳: '艷',
  红: '紅',
  敏: '敏',
  静: '靜',
  婷: '婷',
  颖: '穎',
  玲: '玲',
  娜: '娜',
  雪: '雪',
  梅: '梅',
  莲: '蓮',
  兴: '興',
  发: '發',
  达: '達',
  业: '業',
  荣: '榮',
  贵: '貴',
  财: '財',
  禄: '祿',
  寿: '壽',
  福: '福',
  礼: '禮',
  爱: '愛',
  勤: '勤',
  俭: '儉',
  忠: '忠',
  孝: '孝',
  诚: '誠',
  信: '信',
  仁: '仁',
}

// 簡體轉繁體
function toTraditional(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .split('')
    .map(char => SIMPLIFIED_TO_TRADITIONAL[char] || char)
    .join('')
}

interface UsePassportUploadOptions {
  customers: Customer[]
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  addCustomer: (data: Partial<Customer>) => Promise<Customer>
  onComplete?: () => void | Promise<void>
}

// OCR 處理結果
interface OcrProcessedItem {
  fileName: string
  ocrData: Record<string, string | null>
  compressedFile: File
  imageUrl: string
  storageFileName: string
  existingCustomer?: Customer
  matchReason?: string
  chineseName?: string
  normalizedGender: 'M' | 'F' | null
  hasRealDifference?: boolean // 是否有真正的資料差異
  differences?: string[] // 差異欄位列表
}

export function usePassportUpload(options: UsePassportUploadOptions) {
  const { customers, updateCustomer, addCustomer, onComplete } = options
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // 📁 文件變更處理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    logger.log('📁 handlePassportFileChange triggered', e.target.files)
    const newFiles = e.target.files
    if (newFiles && newFiles.length > 0) {
      logger.log(
        '📁 Adding files:',
        Array.from(newFiles).map(f => f.name)
      )
      setFiles(prev => [...prev, ...Array.from(newFiles)])
    }
  }, [])

  // 🖱️ 拖放事件處理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    logger.log(
      '📥 Files dropped:',
      droppedFiles.map(f => f.name)
    )

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }, [])

  // 🗑️ 移除文件
  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 📄 PDF 轉圖片（每頁轉成一張圖）
  const convertPdfToImages = useCallback(async (pdfFile: File): Promise<File[]> => {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`

    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const images: File[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2.0 })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise

      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9)
      })

      const fileName = pdfFile.name.replace('.pdf', `_page${i}.jpg`)
      const imageFile = new File([blob], fileName, { type: 'image/jpeg' })
      images.push(imageFile)
    }

    return images
  }, [])

  // 🗜️ 壓縮圖片（確保小於 800KB）
  const compressImage = useCallback(async (file: File, quality = 0.6): Promise<File> => {
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
                reject(new Error(CPL.COMPRESS_FAILED))
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
  }, [])

  // 性別格式轉換
  const normalizeGender = (gender: string | null | undefined): 'M' | 'F' | null => {
    if (!gender) return null
    const g = gender.toUpperCase()
    if (g === 'M' || g === 'MALE' || gender === '男') return 'M'
    if (g === 'F' || g === 'FEMALE' || gender === '女') return 'F'
    return null
  }

  // 📤 批次上傳
  const handleBatchUpload = useCallback(async () => {
    if (files.length === 0) {
      void alert(CPL.SELECT_FILE, 'error')
      return
    }

    setIsUploading(true)

    // 分類結果
    const newCustomerItems: OcrProcessedItem[] = []
    const matchedItems: OcrProcessedItem[] = []
    const duplicateItems: string[] = []
    const failedItems: string[] = []
    const processedPassports = new Set<string>()

    try {
      // === 階段 1: 處理所有文件（PDF 轉圖片）===
      const allFiles: File[] = []
      for (const file of files) {
        if (file.type === 'application/pdf') {
          logger.log(`📄 Converting PDF: ${file.name}`)
          const images = await convertPdfToImages(file)
          allFiles.push(...images)
        } else {
          allFiles.push(file)
        }
      }

      logger.log(`📤 開始處理 ${allFiles.length} 個檔案`)
      let googleVisionError: string | null = null

      // === 階段 2: OCR 辨識所有檔案並分類 ===
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        logger.log(`處理 ${i + 1}/${allFiles.length}: ${file.name}`)

        try {
          // 壓縮圖片
          const compressedFile = await compressImage(file)
          logger.log(`✅ 壓縮完成: ${file.name}`)

          // 呼叫 OCR API
          const formData = new FormData()
          formData.append('files', compressedFile)

          const ocrResponse = await fetch('/api/ocr/passport', {
            method: 'POST',
            body: formData,
          })

          if (!ocrResponse.ok) {
            throw new Error(CPL.OCR_FAILED)
          }

          const ocrResult = await ocrResponse.json()
          const gvErr = ocrResult.data?.googleVisionError || ocrResult.googleVisionError
          if (gvErr && !googleVisionError) googleVisionError = gvErr
          const results = ocrResult.data?.results || ocrResult.results

          if (results?.[0]?.success && results[0].customer) {
            const ocrData = results[0].customer
            const passportNumber = ocrData.passport_number
            const nationalId = ocrData.national_id
            const birthDate = ocrData.birth_date
            // 轉換簡體為繁體（移除括號和警告符號）
            const rawName = ocrData.name
              ?.replace(/[()（）]/g, '')
              .replace(/⚠️/g, '')
              .split('/')[0]
              ?.trim()
            const chineseName = toTraditional(rawName)

            // 檢查本次批次內重複
            if (passportNumber && processedPassports.has(passportNumber)) {
              duplicateItems.push(CPL.BATCH_DUPLICATE(file.name))
              continue
            }

            // 多重比對邏輯
            let existingCustomer: Customer | undefined
            let matchReason = ''

            // 1. 身分證字號比對
            if (nationalId) {
              existingCustomer = customers.find(c => c.national_id === nationalId)
              if (existingCustomer) matchReason = CPL.MATCH_ID(nationalId)
            }

            // 2. 生日比對
            if (!existingCustomer && birthDate) {
              const sameBirthday = customers.filter(c => c.birth_date === birthDate)
              if (sameBirthday.length === 1) {
                existingCustomer = sameBirthday[0]
                matchReason = CPL.MATCH_BIRTHDAY(birthDate)
              } else if (sameBirthday.length > 1 && chineseName) {
                existingCustomer = sameBirthday.find(
                  c => c.name?.includes(chineseName) || chineseName.includes(c.name || '')
                )
                if (existingCustomer) matchReason = CPL.MATCH_BIRTHDAY_NAME
              }
            }

            // 3. 姓名比對
            if (!existingCustomer && chineseName && chineseName.length >= 2) {
              existingCustomer = customers.find(c => c.name === chineseName)
              if (existingCustomer) matchReason = CPL.MATCH_NAME(chineseName)
            }

            // 4. 護照號碼比對（完全重複）
            if (!existingCustomer && passportNumber) {
              existingCustomer = customers.find(c => c.passport_number === passportNumber)
              if (existingCustomer) {
                duplicateItems.push(CPL.PASSPORT_EXISTS(file.name, existingCustomer.name))
                processedPassports.add(passportNumber)
                continue
              }
            }

            // 性別判斷
            let gender = ocrData.sex || ocrData.gender
            if (!gender && nationalId) {
              const secondChar = nationalId.charAt(1)
              if (secondChar === '1') gender = 'M'
              else if (secondChar === '2') gender = 'F'
            }

            // 上傳圖片到 storage
            const random = Math.random().toString(36).substring(2, 8)
            const storageFileName = `passport_${Date.now()}_${random}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('passport-images')
              .upload(storageFileName, compressedFile)

            if (uploadError) throw uploadError

            // 簽 1 小時 URL 僅供 OCR 確認 dialog 的預覽 HTML 使用
            // DB 只存 storageFileName（bare filename）、顯示時再動態簽 15 分鐘
            const { data: urlData, error: urlError } = await supabase.storage
              .from('passport-images')
              .createSignedUrl(storageFileName, 3600) // 1 hour for preview only
            if (urlError || !urlData?.signedUrl)
              throw urlError || new Error('Failed to create signed URL')

            // 檢查與現有資料的差異
            const differences: string[] = []
            let hasRealDifference = false

            if (existingCustomer) {
              // 比較護照號碼
              if (passportNumber && existingCustomer.passport_number !== passportNumber) {
                differences.push(
                  CPL.INFO_PASSPORT(
                    `${existingCustomer.passport_number || '無'} → ${passportNumber}`
                  )
                )
                hasRealDifference = true
              }
              // 比較護照效期
              if (
                ocrData.passport_expiry &&
                existingCustomer.passport_expiry !== ocrData.passport_expiry
              ) {
                differences.push(
                  CPL.INFO_EXPIRY(
                    `${existingCustomer.passport_expiry || '無'} → ${ocrData.passport_expiry}`
                  )
                )
                hasRealDifference = true
              }
              // 比較護照拼音
              if (
                ocrData.passport_name &&
                existingCustomer.passport_name !== ocrData.passport_name
              ) {
                differences.push(
                  CPL.INFO_PINYIN(
                    `${existingCustomer.passport_name || '無'} → ${ocrData.passport_name}`
                  )
                )
                hasRealDifference = true
              }
              // 比較身分證（如果現有的為空才算更新）
              if (nationalId && !existingCustomer.national_id) {
                differences.push(CPL.INFO_ID_NEW(nationalId))
                hasRealDifference = true
              }
              // 比較生日（如果現有的為空才算更新）
              if (birthDate && !existingCustomer.birth_date) {
                differences.push(CPL.INFO_BIRTHDAY_NEW(birthDate))
                hasRealDifference = true
              }
              // 比較性別（如果現有的為空才算更新）
              const normalizedGenderValue = normalizeGender(gender)
              if (normalizedGenderValue && !existingCustomer.gender) {
                differences.push(
                  CPL.INFO_GENDER_NEW(normalizedGenderValue === 'M' ? CPL.MALE : CPL.FEMALE)
                )
                hasRealDifference = true
              }
            }

            const item: OcrProcessedItem = {
              fileName: file.name,
              ocrData,
              compressedFile,
              imageUrl: urlData.signedUrl,
              storageFileName,
              existingCustomer,
              matchReason,
              chineseName,
              normalizedGender: normalizeGender(gender),
              hasRealDifference,
              differences,
            }

            if (existingCustomer) {
              matchedItems.push(item)
            } else {
              newCustomerItems.push(item)
            }

            if (passportNumber) {
              processedPassports.add(passportNumber)
            }
          } else {
            failedItems.push(CPL.RECOGNIZE_FAILED(file.name))
          }
        } catch (error) {
          logger.error(`❌ 處理失敗: ${file.name}`, error)
          failedItems.push(CPL.PROCESS_FAILED(file.name))
        }
      }

      // === 階段 3: 智慧分類：無差異自動更新，有差異才詢問 ===
      const autoUpdateItems = matchedItems.filter(item => !item.hasRealDifference)
      const needConfirmItems = matchedItems.filter(item => item.hasRealDifference)
      let confirmedUpdates: OcrProcessedItem[] = [...autoUpdateItems] // 無差異的直接加入

      // 有差異的項目才需要確認
      if (needConfirmItems.length > 0) {
        const matchListHtml = needConfirmItems
          .map(
            (item, idx) => `
          <div style="display: flex; gap: 12px; padding: 12px; background: ${idx % 2 === 0 ? '#f9fafb' : '#fff'}; border-radius: 6px; margin-bottom: 8px;">
            <img src="${item.imageUrl}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />
            <div style="flex: 1; font-size: 12px;">
              <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">
                ${item.existingCustomer?.name} (${item.matchReason})
              </div>
              <div style="color: #dc2626; font-size: 11px;">
                ${item.differences?.join(' | ') || CPL.PASSPORT_IMAGE_UPDATE}
              </div>
            </div>
          </div>
        `
          )
          .join('')

        const confirmHtml = `
          <div style="max-height: 300px; overflow-y: auto; margin-top: 12px;">
            ${matchListHtml}
          </div>
          <div style="margin-top: 12px; padding: 8px 12px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">
            點擊「確定」將更新以上 ${needConfirmItems.length} 位客戶的護照資料
          </div>
        `

        const shouldUpdate = await confirm(
          CPL.CONFIRM_UPDATE(needConfirmItems.length),
          'warning',
          confirmHtml
        )

        if (shouldUpdate) {
          confirmedUpdates = [...confirmedUpdates, ...needConfirmItems]
        } else {
          // 使用者取消有差異的項目，刪除已上傳的圖片
          for (const item of needConfirmItems) {
            await supabase.storage.from('passport-images').remove([item.storageFileName])
          }
        }
      }

      // 如果有自動更新的項目，顯示提示
      if (autoUpdateItems.length > 0) {
        logger.log(`✅ ${autoUpdateItems.length} 位客戶資料無變更，自動更新護照圖片`)
      }

      // === 階段 4: 執行更新和新增 ===
      let autoUpdateSuccessCount = 0
      let confirmedUpdateSuccessCount = 0
      let successCount = 0

      // 自動更新（無差異項目，只更新護照圖片）
      for (const item of autoUpdateItems) {
        // 確認這個 item 在 confirmedUpdates 中（使用者沒取消全部）
        if (!confirmedUpdates.includes(item)) continue

        try {
          const oldPassportUrl = item.existingCustomer?.passport_image_url

          // 只更新護照圖片，不覆蓋其他資料
          await updateCustomer(item.existingCustomer!.id, {
            passport_image_url: item.storageFileName,
          })
          autoUpdateSuccessCount++

          // 刪除舊照片
          if (oldPassportUrl && oldPassportUrl.includes('passport-images')) {
            const match = oldPassportUrl.match(/passport-images\/(.+)$/)
            if (match) {
              await supabase.storage.from('passport-images').remove([decodeURIComponent(match[1])])
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
          logger.error(`自動更新失敗: ${item.existingCustomer?.name}`, errMsg, error)
          failedItems.push(CPL.UPDATE_FAILED(item.fileName, errMsg))
        }
      }

      // 確認更新（有差異項目，更新所有護照資料）
      for (const item of needConfirmItems) {
        // 確認使用者有確認這個項目
        if (!confirmedUpdates.includes(item)) continue

        try {
          const oldPassportUrl = item.existingCustomer?.passport_image_url

          const updatedData = {
            passport_number: item.ocrData.passport_number || item.existingCustomer?.passport_number,
            passport_name: item.ocrData.passport_name || item.existingCustomer?.passport_name,
            passport_expiry: item.ocrData.passport_expiry || item.existingCustomer?.passport_expiry,
            passport_image_url: item.storageFileName,
            national_id: item.ocrData.national_id || item.existingCustomer?.national_id,
            birth_date: item.ocrData.birth_date || item.existingCustomer?.birth_date,
            gender: item.normalizedGender || item.existingCustomer?.gender,
          }

          await updateCustomer(item.existingCustomer!.id, {
            ...updatedData,
            verification_status: 'unverified',
          })
          confirmedUpdateSuccessCount++

          // 刪除舊照片
          if (oldPassportUrl && oldPassportUrl.includes('passport-images')) {
            const match = oldPassportUrl.match(/passport-images\/(.+)$/)
            if (match) {
              await supabase.storage.from('passport-images').remove([decodeURIComponent(match[1])])
            }
          }
        } catch (error) {
          logger.error(`更新失敗: ${item.existingCustomer?.name}`, error)
          failedItems.push(CPL.UPDATE_FAILED_SIMPLE(item.fileName))
        }
      }

      // 新增新客戶
      for (const item of newCustomerItems) {
        try {
          await addCustomer({
            name: item.chineseName || item.ocrData.name || CPL.UNNAMED,
            passport_number: item.ocrData.passport_number,
            passport_name: item.ocrData.passport_name,
            passport_expiry: item.ocrData.passport_expiry,
            passport_image_url: item.storageFileName,
            national_id: item.ocrData.national_id,
            birth_date: item.ocrData.birth_date,
            gender: item.normalizedGender,
            is_vip: false,
            is_active: true,
            verification_status: 'unverified',
          })
          successCount++
        } catch (error) {
          logger.error(`新增失敗: ${item.fileName}`, error)
          failedItems.push(CPL.CREATE_FAILED(item.fileName))
          // 刪除已上傳但未使用的圖片
          await supabase.storage.from('passport-images').remove([item.storageFileName])
        }
      }

      // === 階段 5: 顯示結果 ===
      const skippedConfirmCount = needConfirmItems.length - confirmedUpdateSuccessCount

      let message = CPL.SUCCESS_SUMMARY(allFiles.length - failedItems.length, allFiles.length)
      if (successCount > 0) {
        message += CPL.NEW_CUSTOMERS(successCount)
      }
      if (autoUpdateSuccessCount > 0) {
        message += CPL.AUTO_UPDATE(autoUpdateSuccessCount)
      }
      if (confirmedUpdateSuccessCount > 0) {
        message += CPL.CONFIRMED_UPDATE(confirmedUpdateSuccessCount)
      }
      if (skippedConfirmCount > 0) {
        message += CPL.SKIPPED(skippedConfirmCount)
      }
      if (duplicateItems.length > 0) {
        message += CPL.SKIPPED_DUPLICATE(duplicateItems.length)
      }
      if (googleVisionError) {
        message += `\n\n⚠️ 中文名辨識失敗：${googleVisionError}\n• 請至 Google Cloud Console 更新 API Key`
      }
      message += CPL.VERIFY_REMINDER
      if (failedItems.length > 0) {
        message += CPL.FAILED_ITEMS(failedItems.join('\n'))
      }
      await alert(message, failedItems.length > 0 ? 'warning' : 'success')

      // 清空文件列表
      setFiles([])

      // 觸發完成回調
      if (onComplete) {
        await onComplete()
      }
    } catch (error) {
      logger.error('批次上傳失敗:', error)
      await alert(
        CPL.BATCH_FAILED_PREFIX + (error instanceof Error ? error.message : CPL.UNKNOWN_ERROR),
        'error'
      )
    } finally {
      setIsUploading(false)
    }
  }, [files, customers, convertPdfToImages, compressImage, updateCustomer, addCustomer, onComplete])

  // 清除所有文件
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  return {
    files,
    isUploading,
    isDragging,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    handleBatchUpload,
    removeFile: handleRemoveFile,
    processFiles: handleBatchUpload,
    clearFiles,
  }
}
