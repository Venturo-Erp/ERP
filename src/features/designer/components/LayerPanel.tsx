'use client'

/**
 * 圖層面板組件
 *
 * 顯示畫布上所有元素的列表，支援：
 * - 點擊選取元素
 * - 拖曳調整順序
 * - 顯示元素類型和名稱
 */

import { useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  Layers,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DESIGNER_LABELS } from './constants/labels'

interface LayerPanelProps {
  canvas: fabric.Canvas | null
  selectedObjectIds: string[]
  onSelectObject: (id: string) => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

interface LayerItem {
  id: string
  type: string
  name: string
  visible: boolean
  locked: boolean
  object: fabric.FabricObject
}

// 獲取元素類型的圖示
function getTypeIcon(type: string) {
  switch (type) {
    case 'textbox':
    case 'text':
    case 'i-text':
      return Type
    case 'image':
      return ImageIcon
    case 'rect':
      return Square
    case 'circle':
      return Circle
    case 'line':
      return Minus
    case 'path':
      return Sparkles
    default:
      return Square
  }
}

// 獲取元素名稱
function getObjectName(obj: fabric.FabricObject): string {
  // 嘗試從 data 中獲取名稱
  const data = (obj as fabric.FabricObject & { data?: { name?: string; elementId?: string } }).data
  if (data?.name) return data.name
  if (data?.elementId) return data.elementId

  // 嘗試從 name 屬性獲取
  const name = (obj as fabric.FabricObject & { name?: string }).name
  if (name) return name

  // 根據類型生成預設名稱
  const type = obj.type || 'object'
  switch (type) {
    case 'textbox':
    case 'text':
    case 'i-text':
      const text = (obj as fabric.Textbox).text || ''
      return text.length > 15 ? text.substring(0, 15) + '...' : text || '文字'
    case 'image':
      return '圖片'
    case 'rect':
      return '矩形'
    case 'circle':
      return '圓形'
    case 'line':
      return '線條'
    case 'path':
      return '圖案'
    case 'group':
      return '群組'
    default:
      return type
  }
}

export function LayerPanel({
  canvas,
  selectedObjectIds,
  onSelectObject,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([])

  // 更新圖層列表
  const updateLayers = useCallback(() => {
    if (!canvas) {
      setLayers([])
      return
    }

    const objects = canvas.getObjects()
    const layerItems: LayerItem[] = objects.map((obj, index) => {
      const id = (obj as fabric.FabricObject & { id?: string }).id || `layer-${index}`
      return {
        id,
        type: obj.type || 'object',
        name: getObjectName(obj),
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        object: obj,
      }
    })

    // 反轉順序，讓最上層的元素顯示在最前面
    setLayers(layerItems.reverse())
  }, [canvas])

  // 監聽畫布變化
  useEffect(() => {
    if (!canvas) return

    updateLayers()

    // 監聽各種事件來更新圖層列表
    const events = [
      'object:added',
      'object:removed',
      'object:modified',
      'selection:created',
      'selection:updated',
      'selection:cleared',
    ]

    events.forEach(event => {
      canvas.on(event as keyof fabric.CanvasEvents, updateLayers)
    })

    return () => {
      events.forEach(event => {
        canvas.off(event as keyof fabric.CanvasEvents, updateLayers)
      })
    }
  }, [canvas, updateLayers])

  // 切換可見性
  const toggleVisibility = (layer: LayerItem) => {
    if (!canvas) return
    layer.object.set('visible', !layer.visible)
    canvas.renderAll()
    updateLayers()
  }

  // 切換鎖定
  const toggleLock = (layer: LayerItem) => {
    if (!canvas) return
    const newLocked = !layer.locked
    layer.object.set({
      selectable: !newLocked,
      evented: !newLocked,
    })
    canvas.renderAll()
    updateLayers()
  }

  const hasSelection = selectedObjectIds.length > 0

  return (
    <div className="w-48 h-full bg-card border-l border-border flex flex-col">
      {/* 標題 */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Layers size={16} className="text-morandi-gold" />
        <span className="text-sm font-medium text-morandi-primary">
          {DESIGNER_LABELS.LABEL_5431}
        </span>
        <span className="text-xs text-morandi-secondary ml-auto">{layers.length}</span>
      </div>

      {/* 快捷操作 */}
      <div className="p-2 border-b border-border flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBringToFront}
          disabled={!hasSelection}
          className="flex-1 h-7 text-xs"
          title={DESIGNER_LABELS.LABEL_8232}
        >
          <ChevronUp size={14} className="mr-1" />
          {DESIGNER_LABELS.LABEL_8631}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSendToBack}
          disabled={!hasSelection}
          className="flex-1 h-7 text-xs"
          title={DESIGNER_LABELS.LABEL_5443}
        >
          <ChevronDown size={14} className="mr-1" />
          {DESIGNER_LABELS.LABEL_3113}
        </Button>
      </div>

      {/* 圖層列表 */}
      <div className="flex-1 overflow-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-sm text-morandi-secondary">
            {DESIGNER_LABELS.EMPTY_2886}
          </div>
        ) : (
          <div className="p-1">
            {layers.map(layer => {
              const Icon = getTypeIcon(layer.type)
              const isSelected = selectedObjectIds.includes(layer.id)

              return (
                <div
                  key={layer.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-morandi-gold/10 border border-morandi-gold/30'
                      : 'hover:bg-morandi-container/50 border border-transparent',
                    !layer.visible && 'opacity-50'
                  )}
                  onClick={() => onSelectObject(layer.id)}
                >
                  {/* 類型圖示 */}
                  <Icon size={14} className="text-morandi-secondary shrink-0" />

                  {/* 名稱 */}
                  <span className="flex-1 text-xs truncate text-morandi-primary">{layer.name}</span>

                  {/* 操作按鈕 */}
                  <div className="flex gap-0.5">
                    <button
                      className="p-1 hover:bg-morandi-container rounded"
                      onClick={e => {
                        e.stopPropagation()
                        toggleVisibility(layer)
                      }}
                      title={layer.visible ? '隱藏' : '顯示'}
                    >
                      {layer.visible ? (
                        <Eye size={12} className="text-morandi-secondary" />
                      ) : (
                        <EyeOff size={12} className="text-morandi-muted" />
                      )}
                    </button>
                    <button
                      className="p-1 hover:bg-morandi-container rounded"
                      onClick={e => {
                        e.stopPropagation()
                        toggleLock(layer)
                      }}
                      title={layer.locked ? '解鎖' : '鎖定'}
                    >
                      {layer.locked ? (
                        <Lock size={12} className="text-morandi-red" />
                      ) : (
                        <Unlock size={12} className="text-morandi-secondary" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
