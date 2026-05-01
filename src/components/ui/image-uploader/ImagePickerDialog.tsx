'use client'

import React, { useState } from 'react'
import { Upload, ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageUploader } from './index'
import { UnsplashSearch } from './UnsplashSearch'
import { IMAGE_UPLOADER_LABELS } from './constants/labels'

interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 對話框標題 */
  title?: string
  /** 當前圖片 URL */
  value?: string | null
  /** 圖片選擇回調 */
  onSelect: (imageUrl: string) => void
  /** Storage bucket 名稱 */
  bucket?: string
  /** 檔名前綴 */
  filePrefix?: string
  /** 預覽寬高比 */
  aspectRatio?: number
  /** 說明文字 */
  description?: string
}

/**
 * 圖片選擇對話框
 * 整合「上傳檔案」和「Unsplash 搜尋」兩種方式
 */
function ImagePickerDialog({
  open,
  onOpenChange,
  title = '選擇圖片',
  value,
  onSelect,
  bucket = 'city-backgrounds',
  filePrefix = 'upload',
  aspectRatio = 16 / 9,
  description,
}: ImagePickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'unsplash'>('upload')

  const handleImageUploaded = (url: string) => {
    onSelect(url)
    onOpenChange(false)
  }

  const handleUnsplashSelect = (url: string) => {
    onSelect(url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description && <p className="text-sm text-morandi-secondary -mt-2 mb-2">{description}</p>}

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'upload' | 'unsplash')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload" className="gap-2">
              <Upload size={14} />
              {IMAGE_UPLOADER_LABELS.UPLOADING_209}
            </TabsTrigger>
            <TabsTrigger value="unsplash" className="gap-2">
              <ImageIcon size={14} />
              Unsplash
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <ImageUploader
              value={value}
              onChange={handleImageUploaded}
              bucket={bucket}
              filePrefix={filePrefix}
              aspectRatio={aspectRatio}
              previewHeight="200px"
              placeholder={IMAGE_UPLOADER_LABELS.UPLOADING_822}
              showPositionEditor={false}
              showDeleteButton={false}
            />
          </TabsContent>

          <TabsContent value="unsplash" className="mt-4">
            <UnsplashSearch onSelect={handleUnsplashSelect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
