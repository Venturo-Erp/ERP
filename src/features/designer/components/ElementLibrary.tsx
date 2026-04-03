'use client'

/**
 * 元素庫組件
 *
 * 提供預設圖案、線條、印章等設計元素快速插入
 */

import { useState } from 'react'
import {
  Minus,
  Circle,
  Square,
  Type,
  ArrowRight,
  MoreHorizontal,
  Sparkles,
  Award,
  Frame,
  Image as ImageIcon,
  Clock,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getStickersByCategory,
  STICKER_CATEGORIES,
  type StickerDefinition,
} from './core/sticker-paths'
import { IconPicker } from './IconPicker'
import { ImageLibraryPicker } from './ImageLibraryPicker'
import { ColorfulIconPicker } from './ColorfulIconPicker'
import { QRCodeGenerator } from './QRCodeGenerator'
import { DESIGNER_LABELS } from '../constants/labels'
import type { StickerCategory } from './types'

interface ElementLibraryProps {
  onAddLine: (options?: { style?: 'solid' | 'dashed' | 'dotted'; arrow?: boolean }) => void
  onAddShape: (type: 'rectangle' | 'circle') => void
  onAddText: () => void
  onAddSticker: (stickerId: string, category: StickerCategory) => void
  onAddIcon?: (iconName: string, iconSet: string) => void
  onAddImage?: (imageUrl: string, attribution?: { name: string; link: string }) => void
  onAddColorfulIcon?: (iconName: string) => void
  onAddQRCode?: (dataUrl: string) => void
  // 時間軸
  onAddTimeline?: (options?: {
    orientation?: 'vertical' | 'horizontal'
    pointCount?: number
  }) => void
  onAddTimelinePoint?: () => void
  isTimelineSelected?: boolean // 是否選中時間軸（用於顯示新增時間點按鈕）
}

// 線條樣式選項
const LINE_OPTIONS = [
  { id: 'solid', name: DESIGNER_LABELS.實線, icon: Minus, style: 'solid' as const, arrow: false },
  {
    id: 'dashed',
    name: DESIGNER_LABELS.虛線,
    icon: MoreHorizontal,
    style: 'dashed' as const,
    arrow: false,
  },
  {
    id: 'dotted',
    name: DESIGNER_LABELS.點線,
    icon: MoreHorizontal,
    style: 'dotted' as const,
    arrow: false,
  },
  {
    id: 'arrow',
    name: DESIGNER_LABELS.箭頭,
    icon: ArrowRight,
    style: 'solid' as const,
    arrow: true,
  },
]

// 基本形狀
const BASIC_SHAPES = [
  { id: 'rectangle', name: DESIGNER_LABELS.矩形, icon: Square },
  { id: 'circle', name: DESIGNER_LABELS.圓形, icon: Circle },
]

export function ElementLibrary({
  onAddLine,
  onAddShape,
  onAddText,
  onAddSticker,
  onAddIcon,
  onAddImage,
  onAddColorfulIcon,
  onAddQRCode,
  onAddTimeline,
  onAddTimelinePoint,
  isTimelineSelected,
}: ElementLibraryProps) {
  const [activeTab, setActiveTab] = useState('elements')

  // 取得所有貼紙分類
  const categories = Object.entries(STICKER_CATEGORIES) as [StickerCategory, string][]

  return (
    <div className="w-64 h-full bg-white border-r border-border flex flex-col">
      <div className="p-3 border-b border-border h-[42px] flex items-center">
        <h3 className="font-medium text-sm text-morandi-primary">{DESIGNER_LABELS.元素庫}</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-2 mt-2">
          <TabsTrigger value="elements" className="text-xs px-1">
            {DESIGNER_LABELS.基本}
          </TabsTrigger>
          <TabsTrigger value="colorful" className="text-xs px-1">
            {DESIGNER_LABELS.彩色}
          </TabsTrigger>
          <TabsTrigger value="icons" className="text-xs px-1">
            {DESIGNER_LABELS.圖示}
          </TabsTrigger>
          <TabsTrigger value="images" className="text-xs px-1">
            {DESIGNER_LABELS.圖片}
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="text-xs px-1">
            QR
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 relative overflow-hidden">
          {/* 基本元素 */}
          <TabsContent value="elements" className="absolute inset-0 m-0 p-0 overflow-auto">
            <div className="p-3 space-y-4">
              {/* 文字 */}
              <div>
                <h4 className="text-xs font-medium text-morandi-secondary mb-2">
                  {DESIGNER_LABELS.文字}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onAddText}
                >
                  <Type size={16} />
                  {DESIGNER_LABELS.新增文字}
                </Button>
              </div>

              {/* 形狀 */}
              <div>
                <h4 className="text-xs font-medium text-morandi-secondary mb-2">
                  {DESIGNER_LABELS.形狀}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {BASIC_SHAPES.map(shape => (
                    <Button
                      key={shape.id}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-16"
                      onClick={() => onAddShape(shape.id as 'rectangle' | 'circle')}
                    >
                      <shape.icon size={20} className="text-morandi-gold" />
                      <span className="text-[10px]">{shape.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 時間軸 */}
              {onAddTimeline && (
                <div>
                  <h4 className="text-xs font-medium text-morandi-secondary mb-2">
                    {DESIGNER_LABELS.時間軸}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-16"
                      onClick={() => onAddTimeline({ orientation: 'vertical', pointCount: 3 })}
                    >
                      <Clock size={20} className="text-morandi-gold" />
                      <span className="text-[10px]">{DESIGNER_LABELS.垂直時間軸}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-16"
                      onClick={() => onAddTimeline({ orientation: 'horizontal', pointCount: 3 })}
                    >
                      <Clock size={20} className="text-morandi-gold rotate-90" />
                      <span className="text-[10px]">{DESIGNER_LABELS.水平時間軸}</span>
                    </Button>
                  </div>

                  {/* 新增時間點按鈕（只在選中時間軸時顯示） */}
                  {isTimelineSelected && onAddTimelinePoint && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full mt-2 gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                      onClick={onAddTimelinePoint}
                    >
                      <Plus size={14} />
                      {DESIGNER_LABELS.新增時間點}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 彩色圖標（使用 Iconify API） */}
          <TabsContent value="colorful" className="absolute inset-0 m-0 p-0 overflow-auto">
            {onAddColorfulIcon && <ColorfulIconPicker onSelectIcon={onAddColorfulIcon} />}
          </TabsContent>

          {/* 圖示庫 */}
          <TabsContent value="icons" className="absolute inset-0 m-0 p-0 overflow-auto">
            {onAddIcon && <IconPicker onSelectIcon={onAddIcon} />}
          </TabsContent>

          {/* 圖片庫 (Unsplash + Pexels) */}
          <TabsContent value="images" className="absolute inset-0 m-0 p-0 overflow-auto">
            {onAddImage && <ImageLibraryPicker onSelectImage={onAddImage} />}
          </TabsContent>

          {/* QR Code 生成器 */}
          <TabsContent value="qrcode" className="absolute inset-0 m-0 p-0 overflow-auto">
            {onAddQRCode && <QRCodeGenerator onGenerate={onAddQRCode} />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// 貼紙按鈕組件
function StickerButton({ sticker, onClick }: { sticker: StickerDefinition; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex flex-col items-center justify-center h-14 p-1 hover:border-morandi-gold"
      onClick={onClick}
      title={sticker.name}
    >
      <svg
        viewBox={`0 0 ${sticker.viewBox.width} ${sticker.viewBox.height}`}
        className="w-8 h-8"
        fill={sticker.defaultColor || 'var(--morandi-gold)'}
        stroke={sticker.defaultColor || 'var(--morandi-gold)'}
        strokeWidth="1"
      >
        <path d={sticker.path} />
      </svg>
    </Button>
  )
}

// 取得分類圖標
function getCategoryIcon(category: StickerCategory) {
  switch (category) {
    case 'divider':
      return <Minus size={12} />
    case 'frame':
      return <Frame size={12} />
    case 'decoration':
      return <Sparkles size={12} />
    case 'badge':
      return <Award size={12} />
    case 'stamp':
      return <Circle size={12} />
    default:
      return null
  }
}

// 快速插入工具列（精簡版）
export function QuickInsertBar({
  onAddLine,
  onAddShape,
  onAddText,
}: Omit<ElementLibraryProps, 'onAddSticker'>) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white rounded-lg shadow-sm border border-border">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onAddText}
        title={DESIGNER_LABELS.新增文字}
      >
        <Type size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAddShape('rectangle')}
        title={DESIGNER_LABELS.新增矩形}
      >
        <Square size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAddShape('circle')}
        title={DESIGNER_LABELS.新增圓形}
      >
        <Circle size={16} />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAddLine()}
        title={DESIGNER_LABELS.新增線條}
      >
        <Minus size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onAddLine({ arrow: true })}
        title={DESIGNER_LABELS.新增箭頭}
      >
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}
