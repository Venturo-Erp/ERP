'use client'

/**
 * 區塊元件庫
 *
 * 提供預設區塊（每日行程、飯店卡片、航班資訊等）
 * 插入後會自動適應頁面寬度，可調整高度
 */

import { useState } from 'react'
import {
  Calendar,
  Hotel,
  Plane,
  UtensilsCrossed,
  MapPin,
  FileText,
  Clock,
  Users,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CanvasElement, TextElement, ShapeElement, ImageElement, GroupElement } from './types'
import { DESIGNER_LABELS } from './constants/labels'

// 區塊定義
interface BlockDefinition {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'schedule' | 'info' | 'image' | 'layout'
  // 生成 Canvas 元素的函數
  generateElements: (options: BlockOptions) => CanvasElement[]
}

interface BlockOptions {
  width: number // 可用寬度（出血內）
  x: number // 起始 X
  y: number // 起始 Y
  theme?: 'light' | 'dark'
}

// 品牌色
const COLORS = {
  gold: '#c9aa7c',
  black: '#181511',
  gray: '#8b8680',
  lightGray: '#e8e4df',
}

// A5 出血內尺寸
const BLEED = 32 // 8mm = 32px at 96dpi
const PAGE_WIDTH = 559
const CONTENT_WIDTH = PAGE_WIDTH - BLEED * 2 // 495px

/**
 * 每日行程區塊
 */
function generateDayScheduleBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const elements: CanvasElement[] = []
  const baseId = `block-day-${Date.now()}`

  // 天數標題
  elements.push({
    id: `${baseId}-day-num`,
    type: 'text',
    name: '天數',
    x,
    y,
    width: 60,
    height: 40,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '01',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 28,
      fontWeight: '900',
      color: COLORS.gold,
      textAlign: 'left',
      lineHeight: 1,
      letterSpacing: 0,
    },
  } as TextElement)

  // DAY 標籤
  elements.push({
    id: `${baseId}-day-label`,
    type: 'text',
    name: 'DAY 標籤',
    x: x + 65,
    y: y + 8,
    width: 50,
    height: 20,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: 'DAY 1',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 10,
      fontWeight: '400',
      color: COLORS.gray,
      textAlign: 'left',
      lineHeight: 1,
      letterSpacing: 1,
    },
  } as TextElement)

  // 行程標題
  elements.push({
    id: `${baseId}-title`,
    type: 'text',
    name: '行程標題',
    x,
    y: y + 45,
    width,
    height: 24,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '東京市區觀光・淺草寺・晴空塔',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
  } as TextElement)

  // 底線
  elements.push({
    id: `${baseId}-divider`,
    type: 'shape',
    name: '分隔線',
    variant: 'rectangle',
    x,
    y: y + 75,
    width,
    height: 2,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: COLORS.gold,
    stroke: 'transparent',
    strokeWidth: 0,
  } as ShapeElement)

  // 行程內容
  elements.push({
    id: `${baseId}-content`,
    type: 'text',
    name: '行程內容',
    x,
    y: y + 85,
    width,
    height: 60,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '● 淺草寺・雷門\n● 東京晴空塔展望台\n● 仲見世通商店街',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 10,
      fontWeight: '400',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.8,
      letterSpacing: 0.3,
    },
  } as TextElement)

  return elements
}

/**
 * 餐食資訊區塊
 */
function generateMealBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const elements: CanvasElement[] = []
  const baseId = `block-meal-${Date.now()}`

  // 標題
  elements.push({
    id: `${baseId}-title`,
    type: 'text',
    name: '餐食標題',
    x,
    y,
    width: 80,
    height: 16,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '餐食安排',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.gold,
      textAlign: 'left',
      lineHeight: 1,
      letterSpacing: 0.5,
    },
  } as TextElement)

  // 餐食內容
  const mealWidth = (width - 20) / 3
  const meals = [
    { label: '早餐', value: '飯店內' },
    { label: '午餐', value: '日式定食' },
    { label: '晚餐', value: '敬請自理' },
  ]

  meals.forEach((meal, i) => {
    elements.push({
      id: `${baseId}-meal-${i}`,
      type: 'text',
      name: meal.label,
      x: x + i * (mealWidth + 10),
      y: y + 20,
      width: mealWidth,
      height: 30,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${meal.label}｜${meal.value}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '400',
        color: COLORS.black,
        textAlign: 'left',
        lineHeight: 1.4,
        letterSpacing: 0.3,
      },
    } as TextElement)
  })

  return elements
}

/**
 * 住宿資訊區塊
 */
function generateHotelBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const elements: CanvasElement[] = []
  const baseId = `block-hotel-${Date.now()}`

  // 標題
  elements.push({
    id: `${baseId}-title`,
    type: 'text',
    name: '住宿標題',
    x,
    y,
    width: 80,
    height: 16,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '住宿安排',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.gold,
      textAlign: 'left',
      lineHeight: 1,
      letterSpacing: 0.5,
    },
  } as TextElement)

  // 飯店名稱
  elements.push({
    id: `${baseId}-name`,
    type: 'text',
    name: '飯店名稱',
    x,
    y: y + 20,
    width,
    height: 20,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '東京新宿華盛頓飯店',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 11,
      fontWeight: '600',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 0.3,
    },
  } as TextElement)

  return elements
}

/**
 * 航班資訊區塊
 */
function generateFlightBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const elements: CanvasElement[] = []
  const baseId = `block-flight-${Date.now()}`

  // 標題
  elements.push({
    id: `${baseId}-title`,
    type: 'text',
    name: '航班標題',
    x,
    y,
    width: 120,
    height: 16,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '航班資訊 FLIGHT',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.gold,
      textAlign: 'left',
      lineHeight: 1,
      letterSpacing: 0.5,
    },
  } as TextElement)

  // 去程
  elements.push({
    id: `${baseId}-outbound`,
    type: 'text',
    name: '去程航班',
    x,
    y: y + 22,
    width,
    height: 16,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '去程｜CI100 桃園 08:30 → 成田 12:30',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 9,
      fontWeight: '400',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 0.3,
    },
  } as TextElement)

  // 回程
  elements.push({
    id: `${baseId}-return`,
    type: 'text',
    name: '回程航班',
    x,
    y: y + 40,
    width,
    height: 16,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: '回程｜CI101 成田 14:00 → 桃園 17:00',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 9,
      fontWeight: '400',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 0.3,
    },
  } as TextElement)

  return elements
}

/**
 * 頁首區塊
 */
function generateHeaderBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const elements: CanvasElement[] = []
  const baseId = `block-header-${Date.now()}`

  // 左側標題
  elements.push({
    id: `${baseId}-left`,
    type: 'text',
    name: '左側標題',
    x,
    y,
    width: width / 2,
    height: 36,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: 'TRAVEL GUIDE FOR VISITING JAPAN\nTOKYO',
    style: {
      fontFamily: 'Noto Sans TC',
      fontSize: 9,
      fontWeight: '600',
      color: COLORS.black,
      textAlign: 'left',
      lineHeight: 1.4,
      letterSpacing: 1.5,
    },
  } as TextElement)

  // 分隔線
  elements.push({
    id: `${baseId}-divider`,
    type: 'shape',
    name: '分隔線',
    variant: 'rectangle',
    x,
    y: y + 45,
    width: 80,
    height: 1,
    zIndex: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: COLORS.gold,
    stroke: 'transparent',
    strokeWidth: 0,
  } as ShapeElement)

  return elements
}

/**
 * 單圖滿版區塊
 */
function generateSingleImageBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const height = width * 0.6 // 3:5 比例
  const baseId = `block-img1-${Date.now()}`

  return [
    {
      id: `${baseId}-image`,
      type: 'image',
      name: '滿版圖片',
      x,
      y,
      width,
      height,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '', // 使用者需要自己上傳
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
  ]
}

/**
 * 雙圖並排區塊
 */
function generateDualImageBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const gap = 8
  const imgWidth = (width - gap) / 2
  const imgHeight = imgWidth * 0.75 // 4:3 比例
  const baseId = `block-img2-${Date.now()}`

  return [
    {
      id: `${baseId}-left`,
      type: 'image',
      name: '左圖',
      x,
      y,
      width: imgWidth,
      height: imgHeight,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '',
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
    {
      id: `${baseId}-right`,
      type: 'image',
      name: '右圖',
      x: x + imgWidth + gap,
      y,
      width: imgWidth,
      height: imgHeight,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '',
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
  ]
}

/**
 * 三圖排列區塊（上1下2）
 */
function generateTripleImageBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const gap = 8
  const topHeight = width * 0.5
  const bottomWidth = (width - gap) / 2
  const bottomHeight = bottomWidth * 0.75
  const baseId = `block-img3-${Date.now()}`

  return [
    {
      id: `${baseId}-top`,
      type: 'image',
      name: '上圖',
      x,
      y,
      width,
      height: topHeight,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '',
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
    {
      id: `${baseId}-bottom-left`,
      type: 'image',
      name: '左下圖',
      x,
      y: y + topHeight + gap,
      width: bottomWidth,
      height: bottomHeight,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '',
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
    {
      id: `${baseId}-bottom-right`,
      type: 'image',
      name: '右下圖',
      x: x + bottomWidth + gap,
      y: y + topHeight + gap,
      width: bottomWidth,
      height: bottomHeight,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: '',
      objectFit: 'cover',
      placeholder: true,
    } as ImageElement,
  ]
}

/**
 * 四宮格區塊
 */
function generateGridImageBlock(options: BlockOptions): CanvasElement[] {
  const { width, x, y } = options
  const gap = 8
  const imgSize = (width - gap) / 2
  const baseId = `block-img4-${Date.now()}`

  const positions = [
    { x: 0, y: 0, name: '左上' },
    { x: imgSize + gap, y: 0, name: '右上' },
    { x: 0, y: imgSize + gap, name: '左下' },
    { x: imgSize + gap, y: imgSize + gap, name: '右下' },
  ]

  return positions.map(
    (pos, i) =>
      ({
        id: `${baseId}-${i}`,
        type: 'image',
        name: pos.name,
        x: x + pos.x,
        y: y + pos.y,
        width: imgSize,
        height: imgSize,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        src: '',
        objectFit: 'cover',
        placeholder: true,
      }) as ImageElement
  )
}

// 區塊定義列表
const BLOCKS: BlockDefinition[] = [
  {
    id: 'day-schedule',
    name: '每日行程',
    description: '天數標題 + 行程內容',
    icon: Calendar,
    category: 'schedule',
    generateElements: generateDayScheduleBlock,
  },
  {
    id: 'meal-info',
    name: '餐食資訊',
    description: '早/午/晚餐安排',
    icon: UtensilsCrossed,
    category: 'schedule',
    generateElements: generateMealBlock,
  },
  {
    id: 'hotel-info',
    name: '住宿資訊',
    description: '飯店名稱和資訊',
    icon: Hotel,
    category: 'info',
    generateElements: generateHotelBlock,
  },
  {
    id: 'flight-info',
    name: '航班資訊',
    description: '去程/回程航班',
    icon: Plane,
    category: 'info',
    generateElements: generateFlightBlock,
  },
  {
    id: 'header',
    name: '頁首',
    description: '標題和分隔線',
    icon: FileText,
    category: 'layout',
    generateElements: generateHeaderBlock,
  },
  // 圖片版面
  {
    id: 'single-image',
    name: '單圖滿版',
    description: '一張大圖佔滿寬度',
    icon: ImageIcon,
    category: 'image',
    generateElements: generateSingleImageBlock,
  },
  {
    id: 'dual-image',
    name: '雙圖並排',
    description: '左右兩張圖片',
    icon: ImageIcon,
    category: 'image',
    generateElements: generateDualImageBlock,
  },
  {
    id: 'triple-image',
    name: '三圖排列',
    description: '上1下2 排列',
    icon: ImageIcon,
    category: 'image',
    generateElements: generateTripleImageBlock,
  },
  {
    id: 'grid-image',
    name: '四宮格',
    description: '2x2 圖片網格',
    icon: ImageIcon,
    category: 'image',
    generateElements: generateGridImageBlock,
  },
]

// 分類
const CATEGORIES = [
  { id: 'schedule', name: '行程', icon: Calendar },
  { id: 'info', name: '資訊', icon: FileText },
  { id: 'image', name: '圖片', icon: ImageIcon },
  { id: 'layout', name: '版面', icon: MapPin },
]

interface BlockLibraryProps {
  isOpen: boolean
  onClose: () => void
  onInsertBlock: (elements: CanvasElement[]) => void
  insertY?: number // 插入位置 Y
}

export function BlockLibrary({ isOpen, onClose, onInsertBlock, insertY = 100 }: BlockLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('schedule')

  const handleInsert = (block: BlockDefinition) => {
    const options: BlockOptions = {
      width: CONTENT_WIDTH,
      x: BLEED,
      y: insertY,
    }
    const elements = block.generateElements(options)
    onInsertBlock(elements)
    onClose()
  }

  const filteredBlocks = BLOCKS.filter(b => b.category === selectedCategory)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={2} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{DESIGNER_LABELS.LABEL_5421}</DialogTitle>
        </DialogHeader>

        {/* 分類選擇 */}
        <div className="flex gap-2 border-b border-border pb-3">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <cat.icon className="w-4 h-4 mr-1" />
              {cat.name}
            </Button>
          ))}
        </div>

        {/* 區塊列表 */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredBlocks.map(block => (
              <div
                key={block.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-morandi-container cursor-pointer transition-colors"
                onClick={() => handleInsert(block)}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <block.icon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{block.name}</div>
                  <div className="text-xs text-morandi-secondary">{block.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-morandi-secondary" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export { BLOCKS, type BlockDefinition, type BlockOptions }
