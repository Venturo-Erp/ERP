'use client'

import { useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Attraction, AttractionFormData } from '../types'
import type { Country, Region, City } from '@/stores/region-store'
import { supabase } from '@/lib/supabase/client'
import { prompt, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useAttractionForm } from '../hooks/useAttractionForm'
import { AttractionForm } from './attraction-dialog/AttractionForm'
import { AttractionImageUpload } from './attraction-dialog/AttractionImageUpload'
import { useAuthStore } from '@/stores/auth-store'
import { isFeatureAvailable } from '@/lib/feature-restrictions'
import { useRolePermissions } from '@/lib/permissions/hooks'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { ATTRACTIONS_DIALOG_LABELS } from '../constants/labels'
import { updateAttraction } from '@/data'
import { toast } from 'sonner'

interface AttractionsDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: AttractionFormData) => Promise<{ success: boolean }>
  attraction?: Attraction | null
  countries: Country[]
  regions: Region[]
  cities: City[]
  getRegionsByCountry: (countryId: string) => Region[]
  getCitiesByCountry: (countryId: string) => City[]
  getCitiesByRegion: (regionId: string) => City[]
  initialFormData: AttractionFormData
  /** 固定分類（用於飯店/餐廳 tab，影響標題顯示） */
  fixedCategory?: string
}

export function AttractionsDialog({
  open,
  onClose,
  onSubmit,
  attraction,
  countries,
  regions,
  cities,
  getRegionsByCountry,
  getCitiesByCountry,
  getCitiesByRegion,
  initialFormData,
  fixedCategory,
}: AttractionsDialogProps) {
  const { canWrite } = useRolePermissions()
  const readOnly = !!attraction && !canWrite('/database')

  const {
    formData,
    setFormData,
    isUploading,
    uploadedImages,
    setUploadedImages,
    imagePositions,
    setImagePositions,
    isDragOver,
    setIsDragOver,
    fileInputRef,
    dropZoneRef,
    mergePositionsToNotes,
    uploadFiles,
    fetchAndUploadImage,
  } = useAttractionForm({ attraction, initialFormData, open })

  const { user } = useAuthStore()
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(attraction?.data_verified ?? false)

  // 檢查是否顯示 AI 補充按鈕（僅 TP/TC）
  const showAiSuggest = isFeatureAvailable('ai_suggest', user?.workspace_code)

  // 標記已驗證
  const handleMarkVerified = async () => {
    if (!attraction?.id) return

    setIsVerifying(true)
    try {
      await updateAttraction(attraction.id, { data_verified: true })
      setIsVerified(true)
      toast.success('已標記為已驗證')
    } catch (err) {
      logger.error('標記已驗證失敗:', err)
      toast.error('標記失敗，請稍後再試')
    } finally {
      setIsVerifying(false)
    }
  }

  // AI 補充景點資料
  const handleAiSuggest = async () => {
    if (!formData.name) {
      void alert(ATTRACTIONS_DIALOG_LABELS.請先填寫景點名稱, 'warning')
      return
    }

    setIsAiLoading(true)
    try {
      // 取得國家和城市名稱
      const country = countries.find(c => c.id === formData.country_id)
      const city = cities.find(c => c.id === formData.city_id)

      const response = await fetch('/api/ai/suggest-attraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          city: city?.name,
          country: country?.name,
          category: formData.category,
          existingData: {
            latitude: formData.latitude,
            longitude: formData.longitude,
            duration_minutes: formData.duration_minutes,
            ticket_price: formData.ticket_price,
            opening_hours: formData.opening_hours,
            description: formData.description,
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || ATTRACTIONS_DIALOG_LABELS.AI_補充失敗)
      }

      const suggestion = result.data.suggestion

      // 填入 AI 建議的資料（只填入空白的欄位）
      setFormData(prev => ({
        ...prev,
        latitude: prev.latitude || suggestion.latitude,
        longitude: prev.longitude || suggestion.longitude,
        duration_minutes: prev.duration_minutes || suggestion.duration_minutes || 60,
        ticket_price: prev.ticket_price || suggestion.ticket_price,
        opening_hours: prev.opening_hours || suggestion.opening_hours,
        description: prev.description || suggestion.description,
        address: prev.address || suggestion.address,
        website: prev.website || suggestion.website,
        phone: prev.phone || suggestion.phone,
        tags: prev.tags || suggestion.tags?.join(', ') || '',
      }))

      void alert(
        `${ATTRACTIONS_DIALOG_LABELS.已補充_PREFIX}${result.data.missingFields?.length || 0}${ATTRACTIONS_DIALOG_LABELS.已補充_SUFFIX}`,
        'success'
      )
    } catch (error) {
      logger.error('AI 補充失敗:', error)
      void alert(
        error instanceof Error ? error.message : ATTRACTIONS_DIALOG_LABELS.AI_補充失敗,
        'error'
      )
    } finally {
      setIsAiLoading(false)
    }
  }

  // 上傳圖片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      void alert(ATTRACTIONS_DIALOG_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    await uploadFiles(imageFiles)

    // 清空 input，讓同一檔案可以再次上傳
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 移除圖片
  const handleRemoveImage = (indexToRemove: number) => {
    const removedUrl = uploadedImages[indexToRemove]
    const newImages = uploadedImages.filter((_, index) => index !== indexToRemove)
    setUploadedImages(newImages)
    setFormData(prev => ({ ...prev, images: newImages.join(', ') }))

    // 同時移除該圖片的位置設定
    if (removedUrl) {
      setImagePositions(prev => {
        const newPositions = { ...prev }
        delete newPositions[removedUrl]
        return newPositions
      })
    }
  }

  // 更新圖片位置
  const handlePositionChange = (url: string, position: 'top' | 'center' | 'bottom') => {
    setImagePositions(prev => ({
      ...prev,
      [url]: position,
    }))
  }

  // 替換圖片（用於 AI 編輯後）
  const handleReplaceImage = (index: number, newUrl: string) => {
    const oldUrl = uploadedImages[index]
    const newImages = [...uploadedImages]
    newImages[index] = newUrl
    setUploadedImages(newImages)
    setFormData(prev => ({ ...prev, images: newImages.join(', ') }))

    // 如果舊圖片有位置設定，複製到新圖片
    if (oldUrl && imagePositions[oldUrl]) {
      setImagePositions(prev => {
        const newPositions = { ...prev }
        newPositions[newUrl] = prev[oldUrl]
        delete newPositions[oldUrl]
        return newPositions
      })
    }
  }

  // 新增網址圖片
  const handleAddUrlImage = async () => {
    const url = await prompt(ATTRACTIONS_DIALOG_LABELS.請輸入圖片網址, {
      title: ATTRACTIONS_DIALOG_LABELS.新增圖片,
      placeholder: 'https://...',
    })
    if (url && url.trim()) {
      const allImages = [...uploadedImages, url.trim()]
      setUploadedImages(allImages)
      setFormData(prev => ({ ...prev, images: allImages.join(', ') }))
    }
  }

  // 處理拖曳上傳
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 檢查 files
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        await uploadFiles(imageFiles)
        return
      }
    }

    // 檢查 items
    const items = e.dataTransfer.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            await uploadFiles([file])
            return
          }
        }
      }
    }

    // 從 HTML 解析圖片 URL
    const html = e.dataTransfer.getData('text/html')
    if (html) {
      const match = html.match(/<img alt=""[^>]+src="([^"]+)"/)
      if (match && match[1]) {
        await fetchAndUploadImage(match[1])
        return
      }
    }

    // 純 URL
    const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      await fetchAndUploadImage(imageUrl)
      return
    }

    void alert(ATTRACTIONS_DIALOG_LABELS.請拖曳圖片檔案, 'warning')
  }

  const handleSubmit = async () => {
    // 將圖片位置資訊合併到 notes 中儲存
    const updatedNotes = mergePositionsToNotes(formData.notes, imagePositions)
    const result = await onSubmit({ ...formData, notes: updatedNotes })
    if (result.success) {
      onClose()
    }
  }

  const availableRegions = formData.country_id ? getRegionsByCountry(formData.country_id) : []
  const availableCities = formData.region_id
    ? getCitiesByRegion(formData.region_id)
    : formData.country_id
      ? getCitiesByCountry(formData.country_id)
      : []

  // 自訂標題（包含 AI 補充按鈕 + 標記已驗證按鈕）
  const dialogTitle = (
    <div className="flex items-center gap-3">
      <span>
        {attraction
          ? `編輯${fixedCategory === '住宿' ? '飯店' : fixedCategory === '美食餐廳' ? '餐廳' : '景點'}`
          : fixedCategory === '住宿'
            ? '新增飯店'
            : fixedCategory === '美食餐廳'
              ? '新增餐廳'
              : ATTRACTIONS_DIALOG_LABELS.新增景點}
      </span>
      {/* 待驗證警示 + 標記按鈕 */}
      {attraction && !isVerified && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkVerified}
          disabled={isVerifying}
          className="h-7 text-xs gap-1.5 text-morandi-gold border-morandi-gold bg-morandi-gold/10 hover:bg-morandi-gold/10"
        >
          {isVerifying ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          標記已驗證
        </Button>
      )}
      {/* 已驗證標示 */}
      {attraction && isVerified && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-morandi-green bg-morandi-green/10 border border-morandi-green/30 rounded-full">
          <CheckCircle2 size={12} />
          已驗證
        </span>
      )}
      {showAiSuggest && attraction && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAiSuggest}
          disabled={isAiLoading || !formData.name}
          className="h-7 text-xs gap-1.5 text-morandi-gold border-morandi-gold/50 hover:bg-morandi-gold/10"
        >
          {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {ATTRACTIONS_DIALOG_LABELS.AI_補充}
        </Button>
      )}
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={open => !open && onClose()}
      title={dialogTitle}
      onSubmit={handleSubmit}
      submitLabel={attraction ? '更新' : ATTRACTIONS_DIALOG_LABELS.新增}
      submitDisabled={readOnly || !formData.name || !formData.country_id}
      maxWidth="5xl"
      contentClassName=""
    >
      <AttractionForm
        formData={formData}
        countries={countries}
        availableRegions={availableRegions}
        availableCities={availableCities}
        onFormDataChange={setFormData}
        readOnly={readOnly}
      />

      <AttractionImageUpload
        fileInputRef={fileInputRef}
        dropZoneRef={dropZoneRef}
        isUploading={isUploading}
        uploadedImages={uploadedImages}
        imagePositions={imagePositions}
        isDragOver={isDragOver}
        onImageUpload={handleImageUpload}
        onRemoveImage={handleRemoveImage}
        onPositionChange={handlePositionChange}
        onAddUrlImage={handleAddUrlImage}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onReplaceImage={handleReplaceImage}
      />
    </FormDialog>
  )
}
