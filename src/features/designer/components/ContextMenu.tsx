'use client'

/**
 * 編輯器右鍵選單組件
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Group,
  Ungroup,
} from 'lucide-react'
import type { CanvasElement } from './types'

interface ContextMenuProps {
  selectedElementId: string | null
  selectedElement?: CanvasElement | null
  clipboard: CanvasElement[]
  // 元素操作
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
  onGroup?: () => void
  onUngroup?: () => void
  isGroup?: boolean
  multipleSelected?: boolean
  // 對齊操作
  onAlignLeft: () => void
  onAlignCenterH: () => void
  onAlignRight: () => void
}

interface MenuPosition {
  x: number
  y: number
}

export function ContextMenu({
  selectedElementId,
  selectedElement,
  clipboard,
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
  isGroup,
  multipleSelected,
  onAlignLeft,
  onAlignCenterH,
  onAlignRight,
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 })

  const hasSelection = !!selectedElementId
  const isLocked = selectedElement?.locked ?? false

  // 處理右鍵點擊
  const handleContextMenu = useCallback((e: MouseEvent) => {
    // 只在 canvas 區域內觸發
    const target = e.target as HTMLElement
    if (target.tagName === 'CANVAS' || target.closest('.canvas-container')) {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
      setIsOpen(true)
    }
  }, [])

  // 處理點擊外部關閉
  const handleClick = useCallback(() => {
    setIsOpen(false)
  }, [])

  // 處理 ESC 關閉
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleContextMenu, handleClick, handleKeyDown])

  if (!isOpen) return null

  const menuItems = [
    // 剪貼簿
    {
      label: '複製',
      icon: Copy,
      shortcut: 'Ctrl+C',
      onClick: onCopy,
      disabled: !hasSelection,
    },
    {
      label: '剪下',
      icon: Scissors,
      shortcut: 'Ctrl+X',
      onClick: onCut,
      disabled: !hasSelection,
    },
    {
      label: '貼上',
      icon: Clipboard,
      shortcut: 'Ctrl+V',
      onClick: onPaste,
      disabled: clipboard.length === 0,
    },
    { type: 'separator' as const },
    // 圖層
    {
      label: '置頂',
      icon: ChevronsUp,
      onClick: onBringToFront,
      disabled: !hasSelection,
    },
    {
      label: '上移一層',
      icon: ChevronUp,
      onClick: onBringForward,
      disabled: !hasSelection,
    },
    {
      label: '下移一層',
      icon: ChevronDown,
      onClick: onSendBackward,
      disabled: !hasSelection,
    },
    {
      label: '置底',
      icon: ChevronsDown,
      onClick: onSendToBack,
      disabled: !hasSelection,
    },
    { type: 'separator' as const },
    // 對齊
    {
      label: '靠左對齊',
      icon: AlignLeft,
      onClick: onAlignLeft,
      disabled: !hasSelection,
    },
    {
      label: '水平置中',
      icon: AlignCenter,
      onClick: onAlignCenterH,
      disabled: !hasSelection,
    },
    {
      label: '靠右對齊',
      icon: AlignRight,
      onClick: onAlignRight,
      disabled: !hasSelection,
    },
    { type: 'separator' as const },
    // 鎖定
    {
      label: isLocked ? '解除鎖定' : '鎖定元素',
      icon: isLocked ? Unlock : Lock,
      onClick: onToggleLock,
      disabled: !hasSelection,
    },
    { type: 'separator' as const },
    // 群組
    {
      label: '群組',
      icon: Group,
      shortcut: 'Ctrl+G',
      onClick: () => onGroup?.(),
      disabled: !multipleSelected,
    },
    {
      label: '取消群組',
      icon: Ungroup,
      shortcut: '⇧Ctrl+G',
      onClick: () => onUngroup?.(),
      disabled: !isGroup,
    },
    { type: 'separator' as const },
    // 刪除
    {
      label: '刪除',
      icon: Trash2,
      shortcut: 'Del',
      onClick: onDelete,
      disabled: !hasSelection,
      danger: true,
    },
  ]

  return (
    <div
      className="fixed z-50 min-w-[180px] bg-card rounded-lg shadow-lg border border-border py-1"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, index) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={index} className="h-px bg-border my-1" />
        }

        const Icon = item.icon
        return (
          <button
            key={index}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-morandi-container/50 transition-colors ${
              item.disabled ? 'opacity-40 cursor-not-allowed' : ''
            } ${item.danger ? 'text-morandi-red hover:bg-morandi-red/10' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                setIsOpen(false)
              }
            }}
            disabled={item.disabled}
          >
            <Icon size={14} />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-morandi-secondary">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
