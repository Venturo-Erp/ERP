'use client'
/**
 * 畫布區域組件
 * 包含畫布容器、滾動容器、雙頁預覽、遮罩編輯模式指示器
 */

import { forwardRef, useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { Upload, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasWithRulers } from '@/features/designer/components/CanvasWithRulers'
import { DualPagePreview } from '@/features/designer/components/DualPagePreview'
import type { CanvasPage } from '@/features/designer/components/types'
import type { DesignType } from '@/features/designer/components/DesignTypeSelector'
import { DESIGNER_LABELS } from '../constants/labels'

interface CanvasAreaProps {
  selectedDesignType: DesignType
  canvas: fabric.Canvas | null
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasWidth: number
  canvasHeight: number
  zoom: number
  // 雙頁模式
  isDualPageMode: boolean
  generatedPages: CanvasPage[]
  currentPageIndex: number
  onSelectPage: (index: number) => void
  setIsDualPageMode: (mode: boolean) => void
  // 遮罩編輯模式
  isEditingMask: boolean
  // 上傳圖片
  onImageUpload: () => void
  // Refs
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(function CanvasArea(
  {
    selectedDesignType,
    canvas,
    canvasRef,
    canvasWidth,
    canvasHeight,
    zoom,
    isDualPageMode,
    generatedPages,
    currentPageIndex,
    onSelectPage,
    setIsDualPageMode,
    isEditingMask,
    onImageUpload,
    scrollContainerRef,
  },
  ref
) {
  // Track whether canvas is empty
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true)
  useEffect(() => {
    if (!canvas) return
    const checkEmpty = () => setIsCanvasEmpty(canvas.getObjects().length === 0)
    checkEmpty()
    canvas.on('object:added', checkEmpty)
    canvas.on('object:removed', checkEmpty)
    return () => {
      canvas.off('object:added', checkEmpty)
      canvas.off('object:removed', checkEmpty)
    }
  }, [canvas])

  return (
    <main ref={ref} className="flex-1 relative overflow-hidden bg-morandi-container/20">
      {/* Canvas Container - 可滾動容器 */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-auto"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* 內部包裝 - 使用 inline-flex 讓容器跟隨內容大小擴展 */}
        <div
          style={{
            display: 'inline-flex',
            minWidth: '100%',
            minHeight: '100%',
            padding: '32px',
            boxSizing: 'border-box',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isDualPageMode ? (
            /* 雙頁預覽模式 */
            <DualPagePreview
              pages={generatedPages}
              currentPageIndex={currentPageIndex}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom * 0.6}
              onSelectPage={index => {
                setIsDualPageMode(false)
                onSelectPage(index)
              }}
            />
          ) : (
            /* 單頁編輯模式 */
            <CanvasWithRulers
              canvas={canvas}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              printMode={selectedDesignType?.category === 'print'}
              dpi={300}
            >
              <div
                className="bg-card shadow-lg rounded"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <canvas ref={canvasRef} />
              </div>
            </CanvasWithRulers>
          )}
        </div>
      </div>

      {/* Empty Canvas Guide */}
      {isCanvasEmpty && !isDualPageMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center text-morandi-secondary/60">
            <MousePointerClick size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">{DESIGNER_LABELS.LABEL_6693}</p>
            <p className="text-xs mt-1 opacity-60">{DESIGNER_LABELS.ADD_1662}</p>
          </div>
        </div>
      )}

      {/* Mask Edit Mode Indicator */}
      {isEditingMask && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-morandi-gold text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          <span className="font-medium">{DESIGNER_LABELS.MASK_EDIT_MODE}</span>
          <span className="ml-2 opacity-80">{DESIGNER_LABELS.MASK_EDIT_HINT}</span>
        </div>
      )}

      {/* Quick Actions (bottom left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onImageUpload} className="gap-1 bg-card">
          <Upload size={14} />
          {DESIGNER_LABELS.UPLOAD_IMAGE}
        </Button>
      </div>

      {/* Canvas Info (bottom right) */}
      <div className="absolute bottom-4 right-4 bg-card rounded-lg shadow-lg border border-border px-3 py-2 text-sm text-morandi-secondary">
        {selectedDesignType?.category === 'print' ? (
          <>
            {selectedDesignType?.id === 'brochure-a5' ? '148 × 210 mm (A5)' : '210 × 297 mm (A4)'}
            <span className="text-xs ml-1 opacity-60">{DESIGNER_LABELS.WITH_BLEED}</span>
          </>
        ) : (
          `${canvasWidth} × ${canvasHeight} px`
        )}
      </div>
    </main>
  )
})
