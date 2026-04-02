'use client'

/**
 * CanvasWithRulers - 帶有尺規和固定參考線的畫布容器
 *
 * 功能：
 * - 水平和垂直尺規
 * - 從尺規拖曳創建固定參考線
 * - 參考線可拖曳移動或刪除
 * - 移動物件時自動吸附到參考線
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import * as fabric from 'fabric'
import { cn } from '@/lib/utils'
import { DESIGNER_LABELS } from './constants/labels'

// ============================================
// Types
// ============================================
interface Guide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number // 像素位置
}

interface CanvasWithRulersProps {
  canvas: fabric.Canvas | null
  canvasWidth: number
  canvasHeight: number
  zoom: number
  children: React.ReactNode
  /** 印刷模式：尺規顯示 mm 而非 px */
  printMode?: boolean
  /** DPI（印刷模式用，預設 300） */
  dpi?: number
}

// ============================================
// Constants
// ============================================
const RULER_SIZE = 16 // 尺規寬度（縮小）
const RULER_GAP = 8 // 尺規與畫布的間距
const RULER_OFFSET = RULER_SIZE + RULER_GAP // 總偏移量
const MAJOR_TICK_INTERVAL = 50 // 主刻度間隔
const MINOR_TICK_INTERVAL = 10 // 次刻度間隔
const GUIDE_SNAP_THRESHOLD = 5 // 吸附閾值

// ============================================
// Ruler Component
// ============================================
function Ruler({
  orientation,
  length,
  zoom,
  onDragStart,
  printMode = false,
  dpi = 300,
}: {
  orientation: 'horizontal' | 'vertical'
  length: number
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  printMode?: boolean
  dpi?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isHorizontal = orientation === 'horizontal'
    const displayLength = length * zoom

    // 設置 canvas 大小
    canvas.width = isHorizontal ? displayLength : RULER_SIZE
    canvas.height = isHorizontal ? RULER_SIZE : displayLength

    // 背景（更淡、更柔和的灰色）
    ctx.fillStyle = '#faf9f7'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 邊框（更淡的顏色，更細的線條感）
    ctx.strokeStyle = '#e5e0da'
    ctx.lineWidth = 0.5
    if (isHorizontal) {
      ctx.beginPath()
      ctx.moveTo(0, RULER_SIZE - 0.5)
      ctx.lineTo(displayLength, RULER_SIZE - 0.5)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(RULER_SIZE - 0.5, 0)
      ctx.lineTo(RULER_SIZE - 0.5, displayLength)
      ctx.stroke()
    }

    // 刻度和數字（更淡的顏色）
    ctx.fillStyle = '#a8a4a0'
    ctx.font = '8px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    if (printMode) {
      // 印刷模式：顯示 mm
      // px to mm: px / dpi * 25.4
      const pxPerMm = dpi / 25.4
      const lengthMm = length / pxPerMm
      const majorTickMm = 10 // 每 10mm 一個主刻度
      const minorTickMm = 5 // 每 5mm 一個次刻度

      for (let mm = 0; mm <= lengthMm; mm += minorTickMm) {
        const px = mm * pxPerMm
        const pos = px * zoom
        const isMajor = mm % majorTickMm === 0

        if (isHorizontal) {
          const tickHeight = isMajor ? 6 : 3
          ctx.beginPath()
          ctx.moveTo(pos, RULER_SIZE)
          ctx.lineTo(pos, RULER_SIZE - tickHeight)
          ctx.strokeStyle = isMajor ? '#c0bbb5' : '#d8d4cf'
          ctx.lineWidth = 0.5
          ctx.stroke()

          if (isMajor && mm > 0) {
            ctx.fillText(String(mm), pos, 1)
          }
        } else {
          const tickWidth = isMajor ? 6 : 3
          ctx.beginPath()
          ctx.moveTo(RULER_SIZE, pos)
          ctx.lineTo(RULER_SIZE - tickWidth, pos)
          ctx.strokeStyle = isMajor ? '#c0bbb5' : '#d8d4cf'
          ctx.lineWidth = 0.5
          ctx.stroke()

          if (isMajor && mm > 0) {
            ctx.save()
            ctx.translate(6, pos)
            ctx.rotate(-Math.PI / 2)
            ctx.fillText(String(mm), 0, 0)
            ctx.restore()
          }
        }
      }
    } else {
      // 螢幕模式：顯示 px
      for (let i = 0; i <= length; i += MINOR_TICK_INTERVAL) {
        const pos = i * zoom
        const isMajor = i % MAJOR_TICK_INTERVAL === 0

        if (isHorizontal) {
          const tickHeight = isMajor ? 6 : 3
          ctx.beginPath()
          ctx.moveTo(pos, RULER_SIZE)
          ctx.lineTo(pos, RULER_SIZE - tickHeight)
          ctx.strokeStyle = isMajor ? '#c0bbb5' : '#d8d4cf'
          ctx.lineWidth = 0.5
          ctx.stroke()

          if (isMajor && i > 0) {
            ctx.fillText(String(i), pos, 1)
          }
        } else {
          const tickWidth = isMajor ? 6 : 3
          ctx.beginPath()
          ctx.moveTo(RULER_SIZE, pos)
          ctx.lineTo(RULER_SIZE - tickWidth, pos)
          ctx.strokeStyle = isMajor ? '#c0bbb5' : '#d8d4cf'
          ctx.lineWidth = 0.5
          ctx.stroke()

          if (isMajor && i > 0) {
            ctx.save()
            ctx.translate(6, pos)
            ctx.rotate(-Math.PI / 2)
            ctx.fillText(String(i), 0, 0)
            ctx.restore()
          }
        }
      }
    }
  }, [orientation, length, zoom, printMode, dpi])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'cursor-crosshair',
        orientation === 'horizontal' ? 'absolute top-0' : 'absolute left-0'
      )}
      style={orientation === 'horizontal' ? { left: RULER_OFFSET } : { top: RULER_OFFSET }}
      onMouseDown={onDragStart}
      title={DESIGNER_LABELS.LABEL_9426}
    />
  )
}

// ============================================
// Guide Line Component
// ============================================
function GuideLine({
  guide,
  zoom,
  canvasWidth,
  canvasHeight,
  onDrag,
  onDelete,
}: {
  guide: Guide
  zoom: number
  canvasWidth: number
  canvasHeight: number
  onDrag: (id: string, newPosition: number) => void
  onDelete: (id: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果點擊的是刪除按鈕，不要開始拖曳
    if ((e.target as HTMLElement).dataset.deleteBtn) {
      return
    }
    e.preventDefault()
    setIsDragging(true)

    const startPos = guide.type === 'horizontal' ? e.clientY : e.clientX

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = guide.type === 'horizontal' ? moveEvent.clientY : moveEvent.clientX
      const delta = (currentPos - startPos) / zoom
      const newPosition = guide.position + delta
      onDrag(guide.id, newPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // 如果拖到尺規區域外（負值或超出畫布），刪除參考線
      if (
        guide.position < -RULER_OFFSET / zoom ||
        (guide.type === 'horizontal' && guide.position > canvasHeight + RULER_OFFSET / zoom) ||
        (guide.type === 'vertical' && guide.position > canvasWidth + RULER_OFFSET / zoom)
      ) {
        onDelete(guide.id)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onDelete(guide.id)
  }

  const position = guide.position * zoom

  // 使用更柔和的藍色作為參考線（比金色更適合設計工具）
  const guideColor = isDragging ? '#7eb8d8' : isHovering ? '#8bc4e0' : '#a8d4ea'

  if (guide.type === 'horizontal') {
    return (
      <div
        className="absolute right-0 z-10 group"
        style={{
          left: RULER_OFFSET,
          top: RULER_OFFSET + position - 4, // 擴大點擊區域
          height: '9px', // 擴大點擊區域（上下各 4px）
          cursor: 'ns-resize',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title={DESIGNER_LABELS.LABEL_4070}
      >
        {/* 實際的線條 */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: '4px',
            height: '1px',
            backgroundColor: guideColor,
          }}
        />
        {/* 三角形標記 */}
        <div
          className="absolute w-0 h-0"
          style={{
            left: -RULER_GAP,
            top: '1px',
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: `6px solid ${guideColor}`,
          }}
        />
        {/* 刪除按鈕 - hover 時顯示 */}
        <button
          data-delete-btn="true"
          onClick={handleDeleteClick}
          className={cn(
            'absolute flex items-center justify-center',
            'w-4 h-4 rounded-full bg-morandi-red hover:bg-morandi-red',
            'text-white text-xs font-bold',
            'transition-opacity duration-150',
            isHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          title={DESIGNER_LABELS.DELETE_3163}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-0 z-10 group"
      style={{
        top: RULER_OFFSET,
        left: RULER_OFFSET + position - 4, // 擴大點擊區域
        width: '9px', // 擴大點擊區域（左右各 4px）
        cursor: 'ew-resize',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      title={DESIGNER_LABELS.LABEL_4070}
    >
      {/* 實際的線條 */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: '4px',
          width: '1px',
          backgroundColor: guideColor,
        }}
      />
      {/* 三角形標記 */}
      <div
        className="absolute w-0 h-0"
        style={{
          top: -RULER_GAP,
          left: '1px',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `6px solid ${guideColor}`,
        }}
      />
      {/* 刪除按鈕 - hover 時顯示 */}
      <button
        data-delete-btn="true"
        onClick={handleDeleteClick}
        className={cn(
          'absolute flex items-center justify-center',
          'w-4 h-4 rounded-full bg-morandi-red hover:bg-morandi-red',
          'text-white text-xs font-bold',
          'transition-opacity duration-150',
          isHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          top: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        title={DESIGNER_LABELS.DELETE_3163}
      >
        ×
      </button>
    </div>
  )
}

// ============================================
// Main Component
// ============================================
export function CanvasWithRulers({
  canvas,
  canvasWidth,
  canvasHeight,
  zoom,
  children,
  printMode = false,
  dpi = 300,
}: CanvasWithRulersProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [isDraggingNewGuide, setIsDraggingNewGuide] = useState<'horizontal' | 'vertical' | null>(
    null
  )
  const [tempGuidePosition, setTempGuidePosition] = useState<number | null>(null)

  // 從尺規開始拖曳
  const handleRulerDragStart = useCallback(
    (orientation: 'horizontal' | 'vertical') => (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDraggingNewGuide(orientation)

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const startPos =
        orientation === 'horizontal'
          ? (e.clientY - rect.top - RULER_OFFSET) / zoom
          : (e.clientX - rect.left - RULER_OFFSET) / zoom

      setTempGuidePosition(startPos)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newPos =
          orientation === 'horizontal'
            ? (moveEvent.clientY - rect.top - RULER_OFFSET) / zoom
            : (moveEvent.clientX - rect.left - RULER_OFFSET) / zoom
        setTempGuidePosition(newPos)
      }

      const handleMouseUp = (upEvent: MouseEvent) => {
        const finalPos =
          orientation === 'horizontal'
            ? (upEvent.clientY - rect.top - RULER_OFFSET) / zoom
            : (upEvent.clientX - rect.left - RULER_OFFSET) / zoom

        // 只有在畫布範圍內才創建參考線
        if (
          finalPos >= 0 &&
          ((orientation === 'horizontal' && finalPos <= canvasHeight) ||
            (orientation === 'vertical' && finalPos <= canvasWidth))
        ) {
          const newGuide: Guide = {
            id: `guide-${Date.now()}`,
            type: orientation,
            position: finalPos,
          }
          setGuides(prev => [...prev, newGuide])
        }

        setIsDraggingNewGuide(null)
        setTempGuidePosition(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [zoom, canvasWidth, canvasHeight]
  )

  // 移動已存在的參考線
  const handleGuideDrag = useCallback((id: string, newPosition: number) => {
    setGuides(prev => prev.map(g => (g.id === id ? { ...g, position: newPosition } : g)))
  }, [])

  // 刪除參考線
  const handleGuideDelete = useCallback((id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id))
  }, [])

  // 整合固定參考線到 Fabric.js 的 snap 功能
  useEffect(() => {
    if (!canvas) return

    const handleObjectMoving = (
      e: fabric.BasicTransformEvent & { target: fabric.FabricObject }
    ) => {
      const movingObj = e.target
      if (!movingObj) return

      const bound = movingObj.getBoundingRect()
      const objEdges = {
        left: bound.left,
        right: bound.left + bound.width,
        top: bound.top,
        bottom: bound.top + bound.height,
        centerX: bound.left + bound.width / 2,
        centerY: bound.top + bound.height / 2,
      }

      let snappedLeft: number | null = null
      let snappedTop: number | null = null

      // 檢查垂直參考線（影響 X 軸）
      for (const guide of guides.filter(g => g.type === 'vertical')) {
        const guideX = guide.position
        for (const edge of [objEdges.left, objEdges.right, objEdges.centerX]) {
          if (Math.abs(edge - guideX) < GUIDE_SNAP_THRESHOLD) {
            const offset = guideX - edge
            snappedLeft = (movingObj.left || 0) + offset
            break
          }
        }
        if (snappedLeft !== null) break
      }

      // 檢查水平參考線（影響 Y 軸）
      for (const guide of guides.filter(g => g.type === 'horizontal')) {
        const guideY = guide.position
        for (const edge of [objEdges.top, objEdges.bottom, objEdges.centerY]) {
          if (Math.abs(edge - guideY) < GUIDE_SNAP_THRESHOLD) {
            const offset = guideY - edge
            snappedTop = (movingObj.top || 0) + offset
            break
          }
        }
        if (snappedTop !== null) break
      }

      // 應用吸附
      if (snappedLeft !== null) {
        movingObj.set({ left: snappedLeft })
      }
      if (snappedTop !== null) {
        movingObj.set({ top: snappedTop })
      }
    }

    canvas.on('object:moving', handleObjectMoving)

    return () => {
      canvas.off('object:moving', handleObjectMoving)
    }
  }, [canvas, guides])

  return (
    <div ref={containerRef} className="relative">
      {/* 左上角空白（更淡的顏色） */}
      <div
        className="absolute top-0 left-0 z-20"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: '#faf9f7',
          borderRight: '0.5px solid #e5e0da',
          borderBottom: '0.5px solid #e5e0da',
        }}
      />

      {/* 水平尺規 */}
      <Ruler
        orientation="horizontal"
        length={canvasWidth}
        zoom={zoom}
        onDragStart={handleRulerDragStart('horizontal')}
        printMode={printMode}
        dpi={dpi}
      />

      {/* 垂直尺規 */}
      <Ruler
        orientation="vertical"
        length={canvasHeight}
        zoom={zoom}
        onDragStart={handleRulerDragStart('vertical')}
        printMode={printMode}
        dpi={dpi}
      />

      {/* 固定參考線 */}
      {guides.map(guide => (
        <GuideLine
          key={guide.id}
          guide={guide}
          zoom={zoom}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onDrag={handleGuideDrag}
          onDelete={handleGuideDelete}
        />
      ))}

      {/* 拖曳中的臨時參考線（更柔和的藍色） */}
      {isDraggingNewGuide && tempGuidePosition !== null && (
        <div
          className="absolute z-10"
          style={
            isDraggingNewGuide === 'horizontal'
              ? {
                  left: RULER_OFFSET,
                  right: 0,
                  top: RULER_OFFSET + tempGuidePosition * zoom,
                  height: '1px',
                  backgroundColor: 'rgba(168, 212, 234, 0.7)',
                }
              : {
                  top: RULER_OFFSET,
                  bottom: 0,
                  left: RULER_OFFSET + tempGuidePosition * zoom,
                  width: '1px',
                  backgroundColor: 'rgba(168, 212, 234, 0.7)',
                }
          }
        />
      )}

      {/* 畫布內容區域 - 設定正確的視覺尺寸讓佈局正確 */}
      <div
        className="relative"
        style={{
          marginLeft: RULER_OFFSET,
          marginTop: RULER_OFFSET,
          width: canvasWidth * zoom,
          height: canvasHeight * zoom,
        }}
      >
        {children}
      </div>
    </div>
  )
}
