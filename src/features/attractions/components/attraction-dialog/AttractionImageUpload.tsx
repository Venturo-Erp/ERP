'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, Pencil } from 'lucide-react'
import { ImagePosition } from '../../hooks/useAttractionForm'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { logger } from '@/lib/utils/logger'
import { ATTRACTION_IMAGE_UPLOAD_LABELS } from '../../constants/labels'

interface ImagePositionAdjusterProps {
  url: string
  position: ImagePosition
  onPositionChange: (pos: ImagePosition) => void
  onRemove: () => void
  onReplace?: (newUrl: string) => void
}

function ImagePositionAdjuster({
  url,
  position,
  onPositionChange,
  onRemove,
  onReplace,
}: ImagePositionAdjusterProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // 雙擊開啟編輯器
  const handleDoubleClick = () => {
    setIsEditorOpen(true)
  }

  // 存檔（保留設定）
  const handleSave = (settings: ImageEditorSettings) => {
    // 將 x/y 轉換為 ImagePosition
    const { x, y } = settings
    let newPosition: ImagePosition = 'center'

    if (y <= 33) {
      newPosition = 'top'
    } else if (y >= 67) {
      newPosition = 'bottom'
    } else {
      newPosition = 'center'
    }

    onPositionChange(newPosition)
  }

  // 裁切並存檔
  const handleCropAndSave = async (blob: Blob, settings: ImageEditorSettings) => {
    if (!onReplace) return

    try {
      const { supabase } = await import('@/lib/supabase/client')

      const fileName = `attractions/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('workspace-files').getPublicUrl(fileName)
      onReplace(data.publicUrl)

      // 同時更新位置
      handleSave(settings)
    } catch (error) {
      logger.error('上傳裁切圖片失敗:', error)
    }
  }

  // 轉換 ImagePosition 為 x/y
  const getInitialSettings = (): Partial<ImageEditorSettings> => {
    switch (position) {
      case 'top':
        return { x: 50, y: 0 }
      case 'bottom':
        return { x: 50, y: 100 }
      default:
        return { x: 50, y: 50 }
    }
  }

  return (
    <div className="relative group">
      {/* 圖片預覽 - 雙擊開啟編輯器 */}
      <div
        className="w-full h-24 rounded-md border border-border overflow-hidden cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={url}
          alt={ATTRACTION_IMAGE_UPLOAD_LABELS.景點圖片}
          className="w-full h-full object-cover"
          style={{
            objectPosition:
              position === 'top' ? 'top' : position === 'bottom' ? 'bottom' : 'center',
          }}
          draggable={false}
        />
      </div>

      {/* 編輯按鈕 */}
      <button
        type="button"
        onClick={() => setIsEditorOpen(true)}
        className="absolute right-1 top-1 bg-morandi-gold text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-morandi-gold-hover"
        title={ATTRACTION_IMAGE_UPLOAD_LABELS.編輯圖片}
      >
        <Pencil size={12} />
      </button>

      {/* 刪除按鈕 */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-status-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>

      {/* 雙擊提示 */}
      <div className="absolute bottom-1 left-1 right-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
          {ATTRACTION_IMAGE_UPLOAD_LABELS.EDIT_1001}
        </span>
      </div>

      {/* 圖片編輯器 */}
      <ImageEditor
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        imageSrc={url}
        aspectRatio={4 / 3}
        initialSettings={getInitialSettings()}
        onSave={handleSave}
        onCropAndSave={onReplace ? handleCropAndSave : undefined}
      />
    </div>
  )
}

interface AttractionImageUploadProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  dropZoneRef: React.RefObject<HTMLDivElement | null>
  isUploading: boolean
  uploadedImages: string[]
  imagePositions: Record<string, ImagePosition>
  isDragOver: boolean
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  onPositionChange: (url: string, position: ImagePosition) => void
  onAddUrlImage: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onReplaceImage?: (index: number, newUrl: string) => void
}

export function AttractionImageUpload({
  fileInputRef,
  dropZoneRef,
  isUploading,
  uploadedImages,
  imagePositions,
  isDragOver,
  onImageUpload,
  onRemoveImage,
  onPositionChange,
  onAddUrlImage,
  onDragOver,
  onDragLeave,
  onDrop,
  onReplaceImage,
}: AttractionImageUploadProps) {
  return (
    <div>
      <label className="text-sm font-medium">{ATTRACTION_IMAGE_UPLOAD_LABELS.景點圖片}</label>

      {/* 上傳按鈕區 */}
      <div className="flex gap-2 mt-2 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onImageUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="soft-gold"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              上傳中...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              上傳圖片
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onAddUrlImage}>
          貼上網址
        </Button>
      </div>

      {/* 已上傳圖片預覽 + 拖放區 */}
      <div
        ref={dropZoneRef}
        className={`min-h-[120px] rounded-md transition-all ${
          isDragOver ? 'bg-morandi-gold/10 border-2 border-dashed border-morandi-gold' : ''
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragOver && (
          <div className="flex items-center justify-center h-[120px]">
            <div className="text-morandi-gold font-medium">
              {ATTRACTION_IMAGE_UPLOAD_LABELS.UPLOADING_115}
            </div>
          </div>
        )}
        {!isDragOver && uploadedImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {uploadedImages.map((url, index) => (
              <ImagePositionAdjuster
                key={`${url}-${index}`}
                url={url}
                position={imagePositions[url] || 'center'}
                onPositionChange={pos => onPositionChange(url, pos)}
                onRemove={() => onRemoveImage(index)}
                onReplace={onReplaceImage ? newUrl => onReplaceImage(index, newUrl) : undefined}
              />
            ))}
          </div>
        ) : !isDragOver ? (
          <div className="border-2 border-dashed border-border rounded-md p-6 text-center text-morandi-muted cursor-pointer hover:border-morandi-gold/50 transition-colors">
            <Upload size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{ATTRACTION_IMAGE_UPLOAD_LABELS.UPLOADING_2247}</p>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-morandi-muted mt-2">{ATTRACTION_IMAGE_UPLOAD_LABELS.EDIT_4224}</p>
    </div>
  )
}
