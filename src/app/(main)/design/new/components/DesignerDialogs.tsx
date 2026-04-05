'use client'
/**
 * Designer 對話框群組
 * 包含封面圖片、每日封面圖片、遮罩填充、區塊元件庫等對話框
 */

import * as fabric from 'fabric'
import { ImagePickerDialog } from '@/components/ui/image-uploader'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { ImageMaskFillDialog } from '@/features/designer/components/ImageMaskFill'
import { BlockLibrary } from '@/features/designer/components/BlockLibrary'
import { toast } from 'sonner'
import type {
  CanvasElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from '@/features/designer/components/types'
import { DESIGNER_LABELS } from '../constants/labels'

interface DesignerDialogsProps {
  // 封面圖片
  showCoverUpload: boolean
  setShowCoverUpload: (show: boolean) => void
  coverImage: string | undefined
  onCoverImageSelect: (url: string) => void
  // 封面圖片編輯器
  showImageEditor: boolean
  pendingImageUrl: string | null
  coverImagePosition: ImageEditorSettings | undefined
  onCloseImageEditor: () => void
  onSaveImagePosition: (settings: ImageEditorSettings) => void
  // 每日封面圖片
  showDailyCoverUpload: boolean
  setShowDailyCoverUpload: (show: boolean) => void
  dailyCoverImage: string | undefined
  onDailyCoverImageSelect: (url: string) => void
  // 每日封面圖片編輯器
  showDailyImageEditor: boolean
  dailyPendingImageUrl: string | null
  dailyCoverImagePosition: ImageEditorSettings | undefined
  onCloseDailyImageEditor: () => void
  onSaveDailyImagePosition: (settings: ImageEditorSettings) => void
  // 遮罩填充
  showImageMaskFill: boolean
  setShowImageMaskFill: (show: boolean) => void
  canvas: fabric.Canvas | null
  maskTargetShape: fabric.FabricObject | null
  setMaskTargetShape: (shape: fabric.FabricObject | null) => void
  // 區塊元件庫
  showBlockLibrary: boolean
  setShowBlockLibrary: (show: boolean) => void
  onInsertBlock: (elements: CanvasElement[]) => void
}

export function DesignerDialogs({
  // 封面圖片
  showCoverUpload,
  setShowCoverUpload,
  coverImage,
  onCoverImageSelect,
  // 封面圖片編輯器
  showImageEditor,
  pendingImageUrl,
  coverImagePosition,
  onCloseImageEditor,
  onSaveImagePosition,
  // 每日封面圖片
  showDailyCoverUpload,
  setShowDailyCoverUpload,
  dailyCoverImage,
  onDailyCoverImageSelect,
  // 每日封面圖片編輯器
  showDailyImageEditor,
  dailyPendingImageUrl,
  dailyCoverImagePosition,
  onCloseDailyImageEditor,
  onSaveDailyImagePosition,
  // 遮罩填充
  showImageMaskFill,
  setShowImageMaskFill,
  canvas,
  maskTargetShape,
  setMaskTargetShape,
  // 區塊元件庫
  showBlockLibrary,
  setShowBlockLibrary,
  onInsertBlock,
}: DesignerDialogsProps) {
  return (
    <>
      {/* 封面圖片選擇對話框 */}
      <ImagePickerDialog
        open={showCoverUpload}
        onOpenChange={setShowCoverUpload}
        title={DESIGNER_LABELS.COVER_IMAGE_TITLE}
        description={DESIGNER_LABELS.COVER_IMAGE_DESC}
        value={coverImage}
        onSelect={onCoverImageSelect}
        bucket="city-backgrounds"
        filePrefix="brochure-cover"
        aspectRatio={495 / 350}
      />

      {/* 封面圖片編輯器 */}
      {pendingImageUrl && (
        <ImageEditor
          open={showImageEditor}
          onClose={onCloseImageEditor}
          imageSrc={pendingImageUrl}
          aspectRatio={495 / 350}
          initialSettings={coverImagePosition}
          onSave={onSaveImagePosition}
          showAi={false}
        />
      )}

      {/* 每日行程封面圖片選擇對話框 */}
      <ImagePickerDialog
        open={showDailyCoverUpload}
        onOpenChange={setShowDailyCoverUpload}
        title={DESIGNER_LABELS.DAY_COVER_TITLE}
        description={DESIGNER_LABELS.DAY_COVER_DESC}
        value={dailyCoverImage}
        onSelect={onDailyCoverImageSelect}
        bucket="city-backgrounds"
        filePrefix="brochure-daily-cover"
        aspectRatio={16 / 9}
      />

      {/* 每日行程封面圖片編輯器 */}
      {dailyPendingImageUrl && (
        <ImageEditor
          open={showDailyImageEditor}
          onClose={onCloseDailyImageEditor}
          imageSrc={dailyPendingImageUrl}
          aspectRatio={16 / 9}
          initialSettings={dailyCoverImagePosition}
          onSave={onSaveDailyImagePosition}
          showAi={false}
        />
      )}

      {/* 圖片遮罩填充對話框 */}
      <ImageMaskFillDialog
        open={showImageMaskFill}
        onOpenChange={setShowImageMaskFill}
        canvas={canvas}
        targetShape={maskTargetShape}
        onComplete={() => {
          setMaskTargetShape(null)
        }}
      />

      {/* 區塊元件庫 */}
      <BlockLibrary
        isOpen={showBlockLibrary}
        onClose={() => setShowBlockLibrary(false)}
        onInsertBlock={onInsertBlock}
      />
    </>
  )
}

// 插入偏移追蹤（避免同位置重疊）
let insertOffsetCounter = 0

// 區塊插入處理函數
export function createBlockInsertHandler(canvas: fabric.Canvas | null) {
  return (elements: CanvasElement[], componentName?: string) => {
    if (!canvas) return

    // 計算偏移量避免重疊
    const offset = (insertOffsetCounter % 5) * 20
    insertOffsetCounter++

    const addedObjects: fabric.FabricObject[] = []

    elements.forEach(el => {
      if (el.type === 'text') {
        const textEl = el as TextElement
        const text = new fabric.Textbox(textEl.content || '', {
          left: textEl.x + offset,
          top: textEl.y + offset,
          width: textEl.width,
          fontSize: textEl.style?.fontSize || 12,
          fontFamily: textEl.style?.fontFamily || 'Noto Sans TC',
          fontWeight: textEl.style?.fontWeight || 'normal',
          fill: textEl.style?.color || 'var(--morandi-primary)',
          textAlign: textEl.style?.textAlign || 'left',
        })
        canvas.add(text)
        addedObjects.push(text)
      } else if (el.type === 'shape') {
        const shapeEl = el as ShapeElement
        const rect = new fabric.Rect({
          left: shapeEl.x + offset,
          top: shapeEl.y + offset,
          width: shapeEl.width,
          height: shapeEl.height,
          fill: shapeEl.fill || 'var(--morandi-container)',
          stroke: shapeEl.stroke,
          strokeWidth: shapeEl.strokeWidth || 0,
        })
        canvas.add(rect)
        addedObjects.push(rect)
      } else if (el.type === 'image') {
        const imgEl = el as ImageElement
        const placeholder = new fabric.Rect({
          left: imgEl.x + offset,
          top: imgEl.y + offset,
          width: imgEl.width,
          height: imgEl.height,
          fill: 'var(--morandi-container)',
          stroke: 'var(--morandi-gold)',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        })
        ;(placeholder as fabric.Rect & { isImagePlaceholder: boolean }).isImagePlaceholder = true
        canvas.add(placeholder)
        addedObjects.push(placeholder)
      }
    })

    // 自動選取插入的元素
    if (addedObjects.length === 1) {
      canvas.setActiveObject(addedObjects[0])
    } else if (addedObjects.length > 1) {
      const selection = new fabric.ActiveSelection(addedObjects, { canvas })
      canvas.setActiveObject(selection)
    }

    canvas.renderAll()

    // Toast 反饋
    if (componentName) {
      toast.success(`已插入「${componentName}」`)
    }
  }
}
