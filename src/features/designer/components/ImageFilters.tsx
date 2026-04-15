'use client'

/**
 * 圖片濾鏡組件
 *
 * 提供亮度、對比度、飽和度等調整
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { DESIGNER_LABELS } from './constants/labels'

// 濾鏡預設值
const DEFAULT_ADJUSTMENTS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  opacity: 100,
}

export interface ImageAdjustments {
  brightness: number // 0-200, 100 為原始
  contrast: number // 0-200, 100 為原始
  saturation: number // 0-200, 100 為原始
  blur: number // 0-20 像素
  opacity: number // 0-100
}

interface ImageFiltersProps {
  adjustments: ImageAdjustments
  onChange: (adjustments: ImageAdjustments) => void
}

export function ImageFilters({ adjustments, onChange }: ImageFiltersProps) {
  const [localAdjustments, setLocalAdjustments] = useState<ImageAdjustments>(adjustments)

  const handleChange = (key: keyof ImageAdjustments, value: number) => {
    const newAdjustments = { ...localAdjustments, [key]: value }
    setLocalAdjustments(newAdjustments)
    onChange(newAdjustments)
  }

  const handleReset = () => {
    setLocalAdjustments(DEFAULT_ADJUSTMENTS)
    onChange(DEFAULT_ADJUSTMENTS)
  }

  // 生成 CSS filter 字串
  const getFilterCSS = (adj: ImageAdjustments): string => {
    return [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturation}%)`,
      adj.blur > 0 ? `blur(${adj.blur}px)` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const filters = [
    {
      key: 'brightness' as const,
      label: '亮度',
      min: 0,
      max: 200,
      step: 1,
    },
    {
      key: 'contrast' as const,
      label: '對比度',
      min: 0,
      max: 200,
      step: 1,
    },
    {
      key: 'saturation' as const,
      label: '飽和度',
      min: 0,
      max: 200,
      step: 1,
    },
    {
      key: 'blur' as const,
      label: '模糊',
      min: 0,
      max: 20,
      step: 0.5,
    },
    {
      key: 'opacity' as const,
      label: '透明度',
      min: 0,
      max: 100,
      step: 1,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{DESIGNER_LABELS.LABEL_7990}</span>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 gap-1">
          <RotateCcw size={12} />
          <span className="text-xs">{DESIGNER_LABELS.RESET}</span>
        </Button>
      </div>

      {filters.map(filter => (
        <div key={filter.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-morandi-secondary">{filter.label}</span>
            <span className="text-xs font-mono">
              {filter.key === 'blur'
                ? `${localAdjustments[filter.key]}px`
                : `${localAdjustments[filter.key]}%`}
            </span>
          </div>
          <Slider
            value={[localAdjustments[filter.key]]}
            min={filter.min}
            max={filter.max}
            step={filter.step}
            onValueChange={([value]) => handleChange(filter.key, value)}
            className="w-full"
          />
        </div>
      ))}

      {/* 預覽效果 */}
      <div className="mt-4 p-2 bg-morandi-container/30 rounded-lg">
        <span className="text-xs text-morandi-secondary block mb-2">CSS Filter</span>
        <code className="text-[10px] break-all bg-card p-1 rounded block">
          {getFilterCSS(localAdjustments)}
        </code>
      </div>
    </div>
  )
}

// 預設濾鏡效果
export const FILTER_PRESETS = [
  {
    name: '原始',
    adjustments: DEFAULT_ADJUSTMENTS,
  },
  {
    name: '明亮',
    adjustments: { ...DEFAULT_ADJUSTMENTS, brightness: 120 },
  },
  {
    name: '高對比',
    adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 130 },
  },
  {
    name: '復古',
    adjustments: { ...DEFAULT_ADJUSTMENTS, saturation: 70, contrast: 110 },
  },
  {
    name: '黑白',
    adjustments: { ...DEFAULT_ADJUSTMENTS, saturation: 0 },
  },
  {
    name: '夢幻',
    adjustments: { ...DEFAULT_ADJUSTMENTS, brightness: 105, saturation: 120, blur: 1 },
  },
]

interface FilterPresetsProps {
  onSelect: (adjustments: ImageAdjustments) => void
}

export function FilterPresets({ onSelect }: FilterPresetsProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{DESIGNER_LABELS.LABEL_945}</span>
      <div className="grid grid-cols-3 gap-2">
        {FILTER_PRESETS.map(preset => (
          <button
            key={preset.name}
            className="p-2 text-xs text-center border rounded-lg hover:bg-morandi-container/50 transition-colors"
            onClick={() => onSelect(preset.adjustments)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// 工具函式：將 adjustments 轉為 CSS filter
export function adjustmentsToCSS(adjustments: Partial<ImageAdjustments>): string {
  const adj = { ...DEFAULT_ADJUSTMENTS, ...adjustments }
  return [
    `brightness(${adj.brightness}%)`,
    `contrast(${adj.contrast}%)`,
    `saturate(${adj.saturation}%)`,
    adj.blur > 0 ? `blur(${adj.blur}px)` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
