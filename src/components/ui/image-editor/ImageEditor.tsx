'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Check,
  Crop,
  Loader2,
  Wand2,
  Move,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

// 拆分模組
import { AdjustmentSlider } from './AdjustmentSlider'
import {
  applyAdjustmentsToImage,
  applyTransformToImage,
  cropImage,
  uploadBase64ToStorage,
} from './image-utils'
import {
  type ImageAdjustments,
  type ImageEditorSettings,
  type AiEditAction,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_SETTINGS,
  AI_ACTIONS,
} from './types'

// Re-export types
export type {  ImageEditorSettings } from './types'


// ============ Props ============

interface ImageEditorProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  /** 目標比例 (預設 16:9) */
  aspectRatio?: number
  /** 初始設定 */
  initialSettings?: Partial<ImageEditorSettings>
  /** 存檔（保留設定可再調整） */
  onSave: (settings: ImageEditorSettings) => void
  /** 裁切並存檔（輸出最終圖片） */
  onCropAndSave?: (blob: Blob, settings: ImageEditorSettings) => void
  /** 是否顯示 AI 功能 */
  showAi?: boolean
  /** AI 編輯後替換圖片 */
  onAiReplace?: (newImageUrl: string) => void
}

// ============ Component ============

export function ImageEditor({
  open,
  onClose,
  imageSrc,
  aspectRatio: aspectRatioProp,
  initialSettings,
  onSave,
  onCropAndSave,
  showAi = true,
  onAiReplace,
}: ImageEditorProps) {
  // 沒傳 aspectRatio 時使用自由模式（不裁切）
  const freeMode = aspectRatioProp === undefined
  const aspectRatio = aspectRatioProp ?? 16 / 9
  const t = useTranslations('imageEditor')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')

  // 設定狀態
  const [settings, setSettings] = useState<ImageEditorSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
    rotation: initialSettings?.rotation ?? 0,
    flipH: initialSettings?.flipH ?? false,
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      ...initialSettings?.adjustments,
    },
  }))

  // UI 狀態
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiProcessing, setAiProcessing] = useState<AiEditAction | null>(null)
  const [transformedSrc, setTransformedSrc] = useState(imageSrc)
  const [previewSrc, setPreviewSrc] = useState(imageSrc)
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null)

  // Refs
  const previewRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // 開啟時重置
  useEffect(() => {
    if (open) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...initialSettings,
        rotation: initialSettings?.rotation ?? 0,
        flipH: initialSettings?.flipH ?? false,
        adjustments: {
          ...DEFAULT_ADJUSTMENTS,
          ...initialSettings?.adjustments,
        },
      })
      setTransformedSrc(imageSrc)
      setPreviewSrc(imageSrc)
    }
  }, [open, imageSrc, initialSettings])

  // 旋轉/翻轉變換預覽
  useEffect(() => {
    let cancelled = false
    async function applyTransform() {
      const transformed = await applyTransformToImage(imageSrc, settings.rotation, settings.flipH)
      if (!cancelled) {
        setTransformedSrc(transformed)
      }
    }
    applyTransform().catch(err => logger.error('[applyTransform]', err))
    return () => {
      cancelled = true
    }
  }, [imageSrc, settings.rotation, settings.flipH])

  // 色彩調整預覽（debounce）- 使用已變換的圖片作為來源
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const processed = await applyAdjustmentsToImage(transformedSrc, settings.adjustments)
        setPreviewSrc(processed)
      } catch (err) {
        logger.error('[ImageEditor] applyAdjustments', err)
      }
    }, 150)
    return () => clearTimeout(timeout)
  }, [transformedSrc, settings.adjustments])

  // ============ 滾輪縮放 ============
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setSettings(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta)),
    }))
  }, [])

  // ============ 拖曳移動 ============
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: settings.x,
        posY: settings.y,
      }
    },
    [settings.x, settings.y]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewRef.current) return

      const rect = previewRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      const percentX = (deltaX / rect.width) * 100
      const percentY = (deltaY / rect.height) * 100

      // 縮放越大，移動感覺越快
      const moveMultiplier = settings.scale

      setSettings(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, dragStartRef.current.posX - percentX * moveMultiplier)),
        y: Math.max(0, Math.min(100, dragStartRef.current.posY - percentY * moveMultiplier)),
      }))
    },
    [isDragging, settings.scale]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // ============ 調整滑軌 ============
  const handleAdjustmentChange = useCallback((key: keyof ImageAdjustments, value: number) => {
    setSettings(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        [key]: value,
      },
    }))
  }, [])

  const handleResetAdjustments = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    }))
  }, [])

  // ============ 旋轉/翻轉 ============
  const handleRotateLeft = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }))
  }, [])

  const handleRotateRight = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }))
  }, [])

  const handleFlipH = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      flipH: !prev.flipH,
    }))
  }, [])

  const handleResetTransform = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: 0,
      flipH: false,
      scale: 1,
      x: 50,
      y: 50,
    }))
  }, [])

  // ============ AI 美化 ============
  const handleAiEdit = useCallback(
    async (action: AiEditAction) => {
      if (!onAiReplace) return

      setAiProcessing(action)
      try {
        const response = await fetch('/api/ai/edit-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: imageSrc, action }),
        })

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || '編輯失敗')
        }

        // 上傳 base64 到 Storage，但先預覽不直接替換
        const uploadResult = await uploadBase64ToStorage(result.data.image)
        if (uploadResult.success && uploadResult.url) {
          // 更新預覽圖，讓用戶確認後按「存檔」才真正套用
          setAiPreviewUrl(uploadResult.url)
          void alert(`${result.data.actionLabel} 完成，按「存檔」套用`, 'success')
        } else {
          throw new Error('上傳失敗')
        }
      } catch (error) {
        logger.error('AI 編輯失敗:', error)
        void alert(error instanceof Error ? error.message : '編輯失敗', 'error')
      } finally {
        setAiProcessing(null)
      }
    },
    [imageSrc, onAiReplace]
  )

  // ============ 存檔 ============
  const handleSave = useCallback(() => {
    // 如果有 AI 美化過的預覽圖，存檔時套用替換
    if (aiPreviewUrl && onAiReplace) {
      onAiReplace(aiPreviewUrl)
    }
    onSave(settings)
    onClose()
  }, [settings, onSave, onClose, aiPreviewUrl, onAiReplace])

  // ============ 裁切並存檔 ============
  const handleCropAndSave = useCallback(async () => {
    if (!onCropAndSave) return

    setIsProcessing(true)
    try {
      if (freeMode) {
        // 自由模式：輸出完整圖片（含調整），不裁切
        const response = await fetch(previewSrc)
        const blob = await response.blob()
        onCropAndSave(blob, settings)
      } else {
        // 裁切模式：previewSrc 已包含旋轉/翻轉，傳遞不含旋轉的設定給 cropImage
        const settingsForCrop = {
          ...settings,
          rotation: 0,
          flipH: false,
        }
        const blob = await cropImage(previewSrc, settingsForCrop, aspectRatio)
        onCropAndSave(blob, settings)
      }
      onClose()
    } catch (error) {
      logger.error('Crop failed:', error)
      void alert(tMessages('saveFailed'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [previewSrc, settings, aspectRatio, freeMode, onCropAndSave, onClose])

  // 檢查調整是否有變更
  const hasAdjustments = Object.entries(settings.adjustments).some(
    ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof ImageAdjustments]
  )

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent level={3} className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左邊：預覽區 */}
          <div className="flex-1 p-6 bg-black/5 flex items-center justify-center">
            <div
              ref={previewRef}
              className={cn(
                'relative bg-black rounded-lg overflow-hidden select-none',
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              )}
              style={{
                aspectRatio: freeMode ? undefined : aspectRatio,
                width: '100%',
                maxHeight: '100%',
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
            >
              <img
                src={aiPreviewUrl || previewSrc}
                alt={tCommon('preview')}
                className={cn(
                  'w-full h-full pointer-events-none',
                  freeMode ? 'object-contain' : 'object-cover'
                )}
                style={{
                  objectPosition: `${settings.x}% ${settings.y}%`,
                  transform: `scale(${settings.scale})`,
                  transformOrigin: `${settings.x}% ${settings.y}%`,
                }}
                draggable={false}
              />

              {/* 操作提示 */}
              <div
                className={cn(
                  'absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs transition-opacity',
                  isDragging ? 'opacity-0' : 'opacity-70'
                )}
              >
                {t('scrollToZoom')} · {t('dragToMove')}
              </div>

              {/* 縮放顯示 */}
              <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
                {Math.round(settings.scale * 100)}%
              </div>
            </div>
          </div>

          {/* 右邊：調整面板 */}
          <div className="w-72 border-l border-border flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* 變換工具 */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold flex items-center gap-2">
                  <Move size={12} />
                  {t('transform')}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotateLeft}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold transition-colors text-xs"
                    title={t('rotateLeft')}
                  >
                    <RotateCcw size={14} />
                    {t('rotateLeft')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateRight}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold transition-colors text-xs"
                    title={t('rotateRight')}
                  >
                    <RotateCw size={14} />
                    {t('rotateRight')}
                  </button>
                  <button
                    type="button"
                    onClick={handleFlipH}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors text-xs',
                      settings.flipH
                        ? 'bg-morandi-gold/20 text-morandi-gold'
                        : 'bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold'
                    )}
                    title={t('flipHorizontal')}
                  >
                    <FlipHorizontal size={14} />
                    {t('flipHorizontal')}
                  </button>
                </div>
                {(settings.rotation !== 0 ||
                  settings.flipH ||
                  settings.scale !== 1 ||
                  settings.x !== 50 ||
                  settings.y !== 50) && (
                  <Button
                    type="button"
                    variant="soft-gold"
                    size="sm"
                    onClick={handleResetTransform}
                    className="w-full gap-1.5 text-xs"
                  >
                    <RotateCcw size={12} />
                    {t('resetTransform')}
                  </Button>
                )}
              </div>

              {/* 調整滑軌 */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold flex items-center gap-2">
                  <Sun size={12} />
                  {t('light')}
                </h4>
                <AdjustmentSlider
                  label={t('exposure')}
                  value={settings.adjustments.exposure}
                  onChange={v => handleAdjustmentChange('exposure', v)}
                />
                <AdjustmentSlider
                  label={t('contrast')}
                  value={settings.adjustments.contrast}
                  onChange={v => handleAdjustmentChange('contrast', v)}
                />
                <AdjustmentSlider
                  label={t('highlights')}
                  value={settings.adjustments.highlights}
                  onChange={v => handleAdjustmentChange('highlights', v)}
                />
                <AdjustmentSlider
                  label={t('shadows')}
                  value={settings.adjustments.shadows}
                  onChange={v => handleAdjustmentChange('shadows', v)}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold">
                  {t('effects')}
                </h4>
                <AdjustmentSlider
                  label={t('clarity')}
                  value={settings.adjustments.clarity}
                  onChange={v => handleAdjustmentChange('clarity', v)}
                />
              </div>

              {hasAdjustments && (
                <Button
                  type="button"
                  variant="soft-gold"
                  size="sm"
                  onClick={handleResetAdjustments}
                  className="w-full gap-1.5 text-xs"
                >
                  <RotateCcw size={12} />
                  {t('resetAdjustments')}
                </Button>
              )}

              {/* AI 美化 */}
              {showAi && onAiReplace && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold flex items-center gap-2">
                    <Wand2 size={12} />
                    {t('aiEnhance')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {AI_ACTIONS.map(({ action, label, icon: Icon }) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleAiEdit(action)}
                        disabled={aiProcessing !== null}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
                          'bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          aiProcessing === action && 'bg-morandi-gold/20 text-morandi-gold'
                        )}
                      >
                        {aiProcessing === action ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Icon size={12} />
                        )}
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button type="button" variant="soft-gold" onClick={onClose} disabled={isProcessing}>
            {tCommon('cancel')}
          </Button>
          {onCropAndSave ? (
            <Button variant="soft-gold"
              type="button"
              onClick={handleCropAndSave}
              disabled={isProcessing}
 className="gap-1.5"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {t('save')}
            </Button>
          ) : (
            <Button variant="soft-gold"
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
 className="gap-1.5"
            >
              <Check size={14} />
              {t('save')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
