'use client'

/**
 * 屬性面板組件
 *
 * 顯示選中元素的屬性，並提供編輯功能
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Minus,
  Palette,
  Move,
  Maximize2,
  RotateCw,
  Upload,
  Sparkles,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { FontPicker, FontWeightPicker, TextAlignPicker } from './FontPicker'
import { GradientPicker, cssGradientToFabric } from './GradientPicker'
import { MaskedImageAdjustment, ImageFiltersSection } from './properties-panel'
import { cn } from '@/lib/utils'
import { DESIGNER_LABELS, getObjectType } from '../constants/labels'

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null
  selectedObject: fabric.FabricObject | null
  onUpdate: () => void
  onImageFill?: (object: fabric.FabricObject) => void // 圖片填充回調
}

export function PropertiesPanel({
  canvas,
  selectedObject,
  onUpdate,
  onImageFill,
}: PropertiesPanelProps) {
  const [properties, setProperties] = useState<Record<string, unknown>>({})

  // 檢查是否為文字類型
  const isTextType = (type: string) => type === 'i-text' || type === 'text' || type === 'textbox'

  // 檢查多選時是否全部都是文字（使用 useMemo 避免重複計算）
  const { selectedObjects, allAreText, isMultiSelect } = useMemo(() => {
    if (!selectedObject) return { selectedObjects: [], allAreText: false, isMultiSelect: false }

    let objects: fabric.FabricObject[] = []
    if (selectedObject.type === 'activeselection' || selectedObject.type === 'activeSelection') {
      objects = (selectedObject as fabric.ActiveSelection).getObjects()
    } else {
      objects = [selectedObject]
    }

    const allText = objects.length > 0 && objects.every(obj => isTextType(obj.type || ''))
    return {
      selectedObjects: objects,
      allAreText: allText,
      isMultiSelect: objects.length > 1,
    }
  }, [selectedObject])

  // 監聽選中物件的屬性變化
  useEffect(() => {
    if (!selectedObject) {
      setProperties({})
      return
    }

    const updateProperties = () => {
      // 多選且全是文字時，取第一個文字的屬性作為參考
      const firstTextObj = allAreText ? (selectedObjects[0] as fabric.IText) : null

      setProperties({
        type: selectedObject.type,
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
        angle: Math.round(selectedObject.angle || 0),
        fill: selectedObject.fill,
        stroke: selectedObject.stroke,
        strokeWidth: selectedObject.strokeWidth,
        opacity: Math.round((selectedObject.opacity || 1) * 100),
        // Text properties (單選文字或多選全是文字)
        ...(isTextType(selectedObject.type || '') || allAreText
          ? {
              fontFamily: firstTextObj?.fontFamily || (selectedObject as fabric.IText).fontFamily,
              fontSize: firstTextObj?.fontSize || (selectedObject as fabric.IText).fontSize,
              fontWeight: firstTextObj?.fontWeight || (selectedObject as fabric.IText).fontWeight,
              textAlign: firstTextObj?.textAlign || (selectedObject as fabric.IText).textAlign,
              text: isMultiSelect
                ? `${selectedObjects.length} ${DESIGNER_LABELS.個文字}`
                : (selectedObject as fabric.IText).text,
            }
          : {}),
        // 標記多選狀態
        isMultiSelect,
        selectedCount: selectedObjects.length,
      })
    }

    updateProperties()

    // 監聽修改事件
    selectedObject.on('modified', updateProperties)
    selectedObject.on('scaling', updateProperties)
    selectedObject.on('moving', updateProperties)
    selectedObject.on('rotating', updateProperties)

    return () => {
      selectedObject.off('modified', updateProperties)
      selectedObject.off('scaling', updateProperties)
      selectedObject.off('moving', updateProperties)
      selectedObject.off('rotating', updateProperties)
    }
  }, [selectedObject])

  // 更新物件屬性（支援多選）
  const updateProperty = (key: string, value: unknown) => {
    if (!selectedObject || !canvas) return

    // 如果是多選且是文字屬性，更新所有選中的文字元素
    const textProperties = ['fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'fill']
    if (isMultiSelect && textProperties.includes(key)) {
      selectedObjects.forEach(obj => {
        if (isTextType(obj.type || '')) {
          obj.set(key as keyof fabric.FabricObject, value)
        }
      })
    } else {
      // 單選或非文字屬性
      if (key === 'opacity') {
        selectedObject.set('opacity', (value as number) / 100)
      } else {
        selectedObject.set(key as keyof fabric.FabricObject, value)
      }
    }

    canvas.renderAll()
    onUpdate()

    setProperties(prev => ({ ...prev, [key]: value }))
  }

  if (!selectedObject) {
    return (
      <div className="w-64 h-full bg-card border-l border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <h3 className="font-medium text-sm text-morandi-primary">{DESIGNER_LABELS.屬性}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-morandi-secondary text-center">
            {DESIGNER_LABELS.選取元素以編輯屬性}
          </p>
        </div>
      </div>
    )
  }

  const isText = isTextType((properties.type as string) || '') || allAreText

  return (
    <div className="w-64 h-full bg-card border-l border-border flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        {getTypeIcon(properties.type as string)}
        <h3 className="font-medium text-sm text-morandi-primary">
          {getObjectType(properties.type as string)}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 文字屬性 */}
        {isText && (
          <div className="space-y-3">
            {/* 多選時顯示選中數量，單選時可編輯文字 */}
            {isMultiSelect ? (
              <div className="p-2 bg-morandi-container/30 rounded text-sm text-morandi-secondary">
                {DESIGNER_LABELS.已選擇} {selectedObjects.length} {DESIGNER_LABELS.個文字元素}
              </div>
            ) : (
              <div>
                <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.文字內容}</Label>
                <Input
                  value={(properties.text as string) || ''}
                  onChange={e => {
                    updateProperty('text', e.target.value)
                  }}
                  className="mt-1 text-sm"
                />
              </div>
            )}

            {/* 字級 - 獨立顯示 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Type size={12} className="text-morandi-secondary" />
                <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.字級}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={String((properties.fontSize as number) || 24)}
                  onChange={e => updateProperty('fontSize', parseInt(e.target.value) || 24)}
                  className="w-20 text-sm h-8"
                  min={8}
                  max={200}
                />
                <span className="text-xs text-morandi-secondary">px</span>
                {/* 快速選擇 */}
                <div className="flex gap-1">
                  {[16, 24, 32, 48].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateProperty('fontSize', size)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-colors',
                        (properties.fontSize as number) === size
                          ? 'bg-morandi-gold text-white border-morandi-gold'
                          : 'border-border hover:border-morandi-gold'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.字體}</Label>
              <FontPicker
                fontFamily={(properties.fontFamily as string) || 'Noto Sans TC'}
                fontSize={(properties.fontSize as number) || 24}
                onFontFamilyChange={font => updateProperty('fontFamily', font)}
                onFontSizeChange={size => updateProperty('fontSize', size)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.粗細}</Label>
                <FontWeightPicker
                  fontWeight={String(properties.fontWeight || 'normal')}
                  onChange={weight => updateProperty('fontWeight', weight)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.對齊}</Label>
              <TextAlignPicker
                textAlign={(properties.textAlign as string) || 'left'}
                onChange={align => updateProperty('textAlign', align)}
              />
            </div>
          </div>
        )}

        {/* 位置 */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Move size={12} className="text-morandi-secondary" />
            <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.位置}</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.X}</Label>
              <Input
                type="number"
                value={String(properties.left || 0)}
                onChange={e => updateProperty('left', parseInt(e.target.value))}
                className="mt-0.5 text-sm h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.Y}</Label>
              <Input
                type="number"
                value={String(properties.top || 0)}
                onChange={e => updateProperty('top', parseInt(e.target.value))}
                className="mt-0.5 text-sm h-8"
              />
            </div>
          </div>
        </div>

        {/* 大小 - 文字元素不顯示（改用字級調整） */}
        {!isText && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Maximize2 size={12} className="text-morandi-secondary" />
              <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.大小}</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.寬}</Label>
                <Input
                  type="number"
                  value={String(properties.width || 0)}
                  onChange={e => {
                    const newWidth = parseInt(e.target.value)
                    const scale = newWidth / (selectedObject?.width || 1)
                    updateProperty('scaleX', scale)
                  }}
                  className="mt-0.5 text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.高}</Label>
                <Input
                  type="number"
                  value={String(properties.height || 0)}
                  onChange={e => {
                    const newHeight = parseInt(e.target.value)
                    const scale = newHeight / (selectedObject?.height || 1)
                    updateProperty('scaleY', scale)
                  }}
                  className="mt-0.5 text-sm h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* 旋轉 */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <RotateCw size={12} className="text-morandi-secondary" />
            <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.旋轉}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={String(properties.angle || 0)}
              onChange={e => updateProperty('angle', parseInt(e.target.value))}
              className="w-20 text-sm h-8"
            />
            <span className="text-xs text-morandi-secondary">{DESIGNER_LABELS.度}</span>
          </div>
        </div>

        {/* 顏色/填充 */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Palette size={12} className="text-morandi-secondary" />
            <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.填充}</Label>
          </div>
          <div className="space-y-3">
            {/* 漸層/純色填充 */}
            <div>
              <Label className="text-[10px] text-morandi-muted mb-1 block">
                {DESIGNER_LABELS.顏色漸層}
              </Label>
              <GradientPicker
                value={getFillValue(properties.fill)}
                onChange={(value, isSolid) => {
                  if (isSolid) {
                    // 純色直接設定
                    updateProperty('fill', value)
                    // 如果是 path（貼紙），同時更新 stroke 顏色
                    if (selectedObject?.type === 'path' && canvas) {
                      selectedObject.set('stroke', value)
                      canvas.renderAll()
                    }
                    // 如果是 group（彩色圖標等），更新所有子元素的顏色
                    if (selectedObject?.type === 'group' && canvas) {
                      const group = selectedObject as fabric.Group
                      group.getObjects().forEach(obj => {
                        if ('fill' in obj) obj.set('fill', value)
                        if ('stroke' in obj && obj.stroke) obj.set('stroke', value)
                      })
                      canvas.renderAll()
                    }
                  } else {
                    // 漸層需要轉換為 fabric.Gradient
                    if (selectedObject && canvas) {
                      const width = (selectedObject.width || 100) * (selectedObject.scaleX || 1)
                      const height = (selectedObject.height || 100) * (selectedObject.scaleY || 1)
                      const gradient = cssGradientToFabric(value, width, height)
                      selectedObject.set('fill', gradient)
                      // 儲存原始 CSS 值供之後編輯
                      ;(selectedObject as unknown as Record<string, unknown>).__cssGradient = value
                      canvas.renderAll()
                      onUpdate()
                    }
                  }
                }}
              />
            </div>

            {/* 圖片填充（僅形狀支援） */}
            {isShapeType(properties.type as string) && onImageFill && (
              <div>
                <Label className="text-[10px] text-morandi-muted mb-1 block">
                  {DESIGNER_LABELS.圖片遮罩}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => selectedObject && onImageFill(selectedObject)}
                >
                  <Upload size={14} />
                  {DESIGNER_LABELS.上傳圖片填充}
                </Button>
                <p className="text-[10px] text-morandi-muted mt-1">
                  {DESIGNER_LABELS.上傳圖片後會裁切成此形狀}
                </p>
              </div>
            )}

            {/* 邊框顏色 */}
            {properties.stroke !== undefined && (
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-morandi-muted w-8">{DESIGNER_LABELS.邊框}</Label>
                <input
                  type="color"
                  value={String(properties.stroke || 'var(--morandi-primary)')}
                  onChange={e => updateProperty('stroke', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={String(properties.stroke || 'var(--morandi-primary)')}
                  onChange={e => updateProperty('stroke', e.target.value)}
                  className="flex-1 text-sm h-8"
                />
              </div>
            )}
          </div>
        </div>

        {/* 遮罩圖片調整 - 有 clipPath 的圖片 */}
        {properties.type === 'image' && selectedObject?.clipPath && (
          <MaskedImageAdjustment
            canvas={canvas}
            selectedObject={selectedObject as fabric.FabricImage}
            onUpdate={onUpdate}
          />
        )}

        {/* 圖片濾鏡 - 僅圖片類型顯示 */}
        {properties.type === 'image' && (
          <ImageFiltersSection
            canvas={canvas}
            selectedObject={selectedObject as fabric.FabricImage}
            onUpdate={onUpdate}
          />
        )}

        {/* 透明度 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.透明度}</Label>
            <span className="text-xs text-morandi-muted">{String(properties.opacity || 100)}%</span>
          </div>
          <Slider
            value={[(properties.opacity as number) || 100]}
            onValueChange={([value]) => updateProperty('opacity', value)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'i-text':
    case 'text':
    case 'textbox':
      return <Type size={14} className="text-morandi-gold" />
    case 'rect':
      return <Square size={14} className="text-morandi-gold" />
    case 'circle':
      return <Circle size={14} className="text-morandi-gold" />
    case 'image':
      return <ImageIcon size={14} className="text-morandi-gold" />
    case 'line':
      return <Minus size={14} className="text-morandi-gold" />
    default:
      return <Square size={14} className="text-morandi-gold" />
  }
}

// getTypeName function removed, now using getObjectType from labels

// 檢查是否為形狀類型（支援圖片遮罩填充）
function isShapeType(type: string): boolean {
  return ['rect', 'circle', 'path', 'polygon', 'triangle', 'ellipse', 'group'].includes(type)
}

// 取得填充值（處理漸層和純色）
function getFillValue(fill: unknown): string {
  if (!fill) return 'var(--morandi-gold)'

  // 如果是字串（純色或 CSS 漸層）
  if (typeof fill === 'string') {
    return fill
  }

  // 如果是 fabric.Gradient 物件，嘗試取得儲存的 CSS 值
  if (typeof fill === 'object' && fill !== null) {
    const obj = fill as Record<string, unknown>
    if (obj.__cssGradient) {
      return obj.__cssGradient as string
    }
    // 嘗試從 colorStops 還原
    if (obj.colorStops && Array.isArray(obj.colorStops)) {
      const stops = obj.colorStops as Array<{ offset: number; color: string }>
      const type = obj.type === 'radial' ? 'radial-gradient' : 'linear-gradient'
      const stopsStr = stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')
      return `${type}(90deg, ${stopsStr})`
    }
  }

  return 'var(--morandi-gold)'
}
