'use client'

import { TOOLBAR_LABELS } from '../constants/labels'

/**
 * 編輯器工具列組件
 *
 * 提供圖層管理、對齊、插入元素等功能按鈕
 */

import { useRef } from 'react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Lock,
  Unlock,
  Type,
  Square,
  Circle,
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  Group,
  Ungroup,
  Image,
  Minus,
  Triangle,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// 簡易分隔線組件
function Separator({
  orientation = 'horizontal',
  className = '',
}: {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}) {
  return (
    <div className={`bg-border ${orientation === 'vertical' ? 'w-px' : 'h-px'} ${className}`} />
  )
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CanvasElement } from './types'

interface DesignerToolbarProps {
  selectedElementId: string | null
  selectedElement?: CanvasElement | null
  selectedCount: number
  clipboard: CanvasElement[]
  // 元素操作
  onAddText: () => void
  onAddRectangle: () => void
  onAddCircle: () => void
  onAddEllipse: () => void
  onAddTriangle: () => void
  onAddLine: () => void
  onAddImage: (file: File) => void
  onCopy: () => void
  onPaste: () => void
  onCut: () => void
  onDelete: () => void
  // 圖層操作
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  // 群組操作
  onGroup: () => void
  onUngroup: () => void
  // 對齊操作
  onAlignLeft: () => void
  onAlignCenterH: () => void
  onAlignRight: () => void
  onAlignTop: () => void
  onAlignCenterV: () => void
  onAlignBottom: () => void
  // 分佈操作
  onDistributeH: () => void
  onDistributeV: () => void
  // 翻轉操作
  onFlipHorizontal?: () => void
  onFlipVertical?: () => void
}

export function DesignerToolbar({
  selectedElementId,
  selectedElement,
  selectedCount,
  clipboard,
  onAddText,
  onAddRectangle,
  onAddCircle,
  onAddEllipse,
  onAddTriangle,
  onAddLine,
  onAddImage,
  onCopy,
  onPaste,
  onCut,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onGroup,
  onUngroup,
  onAlignLeft,
  onAlignCenterH,
  onAlignRight,
  onAlignTop,
  onAlignCenterV,
  onAlignBottom,
  onDistributeH,
  onDistributeV,
  onFlipHorizontal,
  onFlipVertical,
}: DesignerToolbarProps) {
  const hasSelection = !!selectedElementId
  const hasMultiSelection = selectedCount > 1
  const isLocked = selectedElement?.locked ?? false
  const isGroup = selectedElement?.type === 'group'

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onAddImage(file)
      e.target.value = '' // Reset for same file selection
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-card border-b border-border overflow-x-auto">
        {/* 隱藏的檔案輸入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 插入元素 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onAddText} className="h-8 w-8 p-0">
                <Type size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.ADD_TEXT}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleImageClick} className="h-8 w-8 p-0">
                <Image size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.ADD_IMAGE}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Square size={16} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{TOOLBAR_LABELS.ADD_SHAPE}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onAddRectangle}>
                <Square size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_6232}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddCircle}>
                <Circle size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_5823}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddEllipse}>
                <Circle size={14} className="mr-2" style={{ transform: 'scaleX(1.5)' }} />
                {TOOLBAR_LABELS.LABEL_2823}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddTriangle}>
                <Triangle size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_8751}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAddLine}>
                <Minus size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_9869}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 剪貼簿操作 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <Copy size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.COPY}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCut}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <Scissors size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.CUT}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPaste}
                disabled={clipboard.length === 0}
                className="h-8 w-8 p-0"
              >
                <Clipboard size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.PASTE}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={!hasSelection}
                className="h-8 w-8 p-0 text-morandi-red hover:text-morandi-red"
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.DELETE}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 群組操作 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGroup}
                disabled={!hasMultiSelection}
                className="h-8 w-8 p-0"
              >
                <Group size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.GROUP}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUngroup}
                disabled={!isGroup}
                className="h-8 w-8 p-0"
              >
                <Ungroup size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.UNGROUP}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 翻轉操作 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFlipHorizontal}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <FlipHorizontal size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.FLIP_H}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFlipVertical}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <FlipVertical size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.FLIP_V}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 圖層操作 */}
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasSelection}
                    className="h-8 px-2 gap-1"
                  >
                    <Layers size={16} />
                    <span className="text-xs hidden sm:inline">{TOOLBAR_LABELS.LAYERS}</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{TOOLBAR_LABELS.LAYER_MANAGEMENT}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onBringToFront}>
                <ChevronsUp size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_7759}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBringForward}>
                <ChevronUp size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_2439}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendBackward}>
                <ChevronDown size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_8528}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendToBack}>
                <ChevronsDown size={14} className="mr-2" />
                {TOOLBAR_LABELS.LABEL_9654}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleLock}>
                {isLocked ? (
                  <>
                    <Unlock size={14} className="mr-2" />
                    {TOOLBAR_LABELS.LABEL_1159}
                  </>
                ) : (
                  <>
                    <Lock size={14} className="mr-2" />
                    {TOOLBAR_LABELS.LABEL_3652}
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 對齊操作 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignLeft}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.ALIGN_LEFT}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignCenterH}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignCenter size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.ALIGN_CENTER_H}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignRight}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignRight size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_1012}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignTop}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignStartVertical size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_6004}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignCenterV}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignCenterVertical size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_1391}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAlignBottom}
                disabled={!hasSelection}
                className="h-8 w-8 p-0"
              >
                <AlignEndVertical size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_6000}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 分佈操作 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDistributeH}
                disabled={selectedCount < 3}
                className="h-8 w-8 p-0"
              >
                <AlignHorizontalSpaceAround size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_4797}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDistributeV}
                disabled={selectedCount < 3}
                className="h-8 w-8 p-0"
              >
                <AlignVerticalSpaceAround size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TOOLBAR_LABELS.LABEL_6513}</TooltipContent>
          </Tooltip>
        </div>

        {/* 快捷鍵提示 */}
        <div className="ml-auto text-xs text-morandi-secondary whitespace-nowrap">
          <span className="hidden lg:inline">
            Ctrl+C 複製 | Ctrl+V 貼上 | Delete 刪除 | Ctrl+G 群組
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}
