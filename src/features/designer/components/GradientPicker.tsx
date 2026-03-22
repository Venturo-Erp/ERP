'use client'

/**
 * 漸層選擇器組件
 *
 * 支援線性漸層和放射漸層
 * 使用 react-best-gradient-color-picker
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { DESIGNER_LABELS } from './constants/labels'

// 預設漸層色票
const PRESET_GRADIENTS = [
  // 暖色系
  'linear-gradient(90deg, #c9aa7c 0%, #e8d5b7 100%)', // 莫蘭迪金
  'linear-gradient(90deg, #f5af19 0%, #f12711 100%)', // 日落橙
  'linear-gradient(90deg, #ee9ca7 0%, #ffdde1 100%)', // 粉嫩
  'linear-gradient(90deg, #c08374 0%, #e8b4a8 100%)', // 莫蘭迪紅
  // 冷色系
  'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', // 紫羅蘭
  'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)', // 天藍
  'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', // 薄荷
  'linear-gradient(90deg, #9fa68f 0%, #c5cdb8 100%)', // 莫蘭迪綠
  // 中性
  'linear-gradient(90deg, #3a3633 0%, #8b8680 100%)', // 深灰
  'linear-gradient(90deg, #bdc3c7 0%, #2c3e50 100%)', // 銀灰
  'linear-gradient(90deg, #e8e5e0 0%, #f6f4f1 100%)', // 淺米
  'linear-gradient(180deg, #ffffff 0%, #e8e5e0 100%)', // 漸白
]

interface GradientPickerProps {
  value: string // CSS gradient string or solid color
  onChange: (value: string, isSolid: boolean) => void
  className?: string
}

export function GradientPicker({ value, onChange, className }: GradientPickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'solid' | 'gradient'>(() => {
    return value?.includes('gradient') ? 'gradient' : 'solid'
  })

  // 解析當前值來顯示預覽
  const previewStyle = value?.includes('gradient')
    ? { background: value }
    : { backgroundColor: value || '#c9aa7c' }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full h-10 p-1 justify-start gap-2', className)}>
          <div className="w-6 h-6 rounded border border-border" style={previewStyle} />
          <span className="text-xs text-morandi-secondary truncate">
            {mode === 'solid' ? '純色' : '漸層'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Tabs value={mode} onValueChange={v => setMode(v as 'solid' | 'gradient')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="solid">{DESIGNER_LABELS.LABEL_3502}</TabsTrigger>
            <TabsTrigger value="gradient">{DESIGNER_LABELS.LABEL_6118}</TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="p-3">
            <SolidColorPicker
              value={value?.includes('gradient') ? '#c9aa7c' : value}
              onChange={color => onChange(color, true)}
            />
          </TabsContent>

          <TabsContent value="gradient" className="p-3 space-y-3">
            {/* 預設漸層 */}
            <div>
              <p className="text-xs text-morandi-secondary mb-2">{DESIGNER_LABELS.LABEL_6513}</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_GRADIENTS.map((gradient, i) => (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      'w-full h-8 rounded border-2 transition-all',
                      value === gradient
                        ? 'border-morandi-gold'
                        : 'border-transparent hover:border-morandi-gold/50'
                    )}
                    style={{ background: gradient }}
                    onClick={() => onChange(gradient, false)}
                  />
                ))}
              </div>
            </div>

            {/* 自訂漸層 */}
            <div>
              <p className="text-xs text-morandi-secondary mb-2">{DESIGNER_LABELS.LABEL_4278}</p>
              <GradientColorPicker
                value={
                  value?.includes('gradient')
                    ? value
                    : 'linear-gradient(90deg, #c9aa7c 0%, #e8d5b7 100%)'
                }
                onChange={gradient => onChange(gradient, false)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

// 純色選擇器
function SolidColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  // 莫蘭迪色票
  const MORANDI_COLORS = [
    '#3a3633',
    '#8b8680',
    '#b8b2aa',
    '#d4c4b0',
    '#c9aa7c',
    '#b8996b',
    '#c08374',
    '#e8b4a8',
    '#9fa68f',
    '#c5cdb8',
    '#a8c0b9',
    '#b4c4d0',
    '#e8e5e0',
    '#f6f4f1',
    '#ffffff',
    '#3a3633',
  ]

  return (
    <div className="space-y-3">
      {/* 預設色票 */}
      <div className="grid grid-cols-8 gap-1">
        {MORANDI_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className={cn(
              'w-6 h-6 rounded border-2 transition-all',
              value === color
                ? 'border-morandi-gold'
                : 'border-transparent hover:border-morandi-gold/50'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>

      {/* 自訂顏色 */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#c9aa7c'}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value || '#c9aa7c'}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border rounded"
          placeholder="#c9aa7c"
        />
      </div>
    </div>
  )
}

// 漸層自訂選擇器 - 使用 dynamic import
const DynamicColorPicker = dynamic(
  () => import('react-best-gradient-color-picker').then(mod => mod.default),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[180px]">
        <Loader2 className="animate-spin text-morandi-secondary" size={24} />
      </div>
    ),
    ssr: false,
  }
)

function GradientColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (gradient: string) => void
}) {
  return (
    <div className="gradient-picker-wrapper">
      <DynamicColorPicker
        value={value}
        onChange={onChange}
        hideInputs={false}
        hideOpacity={true}
        hidePresets={true}
        hideColorGuide={true}
        hideAdvancedSliders={true}
        hideColorTypeBtns={true}
        height={150}
        width={250}
      />
      <style jsx global>{`
        .gradient-picker-wrapper input {
          font-size: 12px !important;
        }
        .gradient-picker-wrapper label {
          font-size: 10px !important;
        }
      `}</style>
    </div>
  )
}

/**
 * 將 CSS gradient 轉換為 fabric.js Gradient 物件
 * 回傳格式給 fabric.FabricObject.set('fill', ...) 使用
 */
export function cssGradientToFabric(cssGradient: string, width: number, height: number): unknown {
  // 如果不是漸層，直接回傳
  if (!cssGradient?.includes('gradient')) {
    return cssGradient
  }

  // 動態 import fabric（因為在 client side）

  const fabric = require('fabric')

  // 解析 CSS linear-gradient
  const linearMatch = cssGradient.match(/linear-gradient\((\d+)deg,\s*(.+)\)/)
  if (linearMatch) {
    const angle = parseInt(linearMatch[1])
    const stops = parseColorStops(linearMatch[2])

    // 根據角度計算座標
    const coords = angleToCoords(angle, width, height)

    return new fabric.Gradient({
      type: 'linear',
      coords,
      colorStops: stops,
    })
  }

  // 解析 CSS radial-gradient
  const radialMatch = cssGradient.match(/radial-gradient\((.+)\)/)
  if (radialMatch) {
    const stops = parseColorStops(radialMatch[1])

    return new fabric.Gradient({
      type: 'radial',
      coords: {
        x1: width / 2,
        y1: height / 2,
        x2: width / 2,
        y2: height / 2,
        r1: 0,
        r2: Math.max(width, height) / 2,
      },
      colorStops: stops,
    })
  }

  return cssGradient
}

// 解析顏色停止點
function parseColorStops(stopsStr: string): Array<{ offset: number; color: string }> {
  const stops: Array<{ offset: number; color: string }> = []

  // 匹配 "#color percentage" 或 "rgba(...) percentage"
  const regex = /(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))\s*(\d+)?%?/g
  let match

  while ((match = regex.exec(stopsStr)) !== null) {
    const color = match[1]
    const offset = match[2] ? parseInt(match[2]) / 100 : stops.length === 0 ? 0 : 1
    stops.push({ offset, color })
  }

  return stops
}

// 角度轉換為座標
function angleToCoords(angle: number, width: number, height: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return {
    x1: width / 2 - (cos * width) / 2,
    y1: height / 2 - (sin * height) / 2,
    x2: width / 2 + (cos * width) / 2,
    y2: height / 2 + (sin * height) / 2,
  }
}
