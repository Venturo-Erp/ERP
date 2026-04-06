'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Save, X, Image, Images, LayoutGrid, GitBranch } from 'lucide-react'
import { DayDisplayStyle } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

// 風格選項定義
const styleOptions: {
  value: DayDisplayStyle
  icon: React.ReactNode
  label: string
  color: string
}[] = [
  {
    value: 'single-image',
    icon: <Image size={16} />,
    label: COMP_EDITOR_LABELS.單張大圖,
    color: '#c76d54',
  },
  {
    value: 'multi-image',
    icon: <Images size={16} />,
    label: COMP_EDITOR_LABELS.多圖輪播,
    color: '#8da399',
  },
  {
    value: 'card-grid',
    icon: <LayoutGrid size={16} />,
    label: COMP_EDITOR_LABELS.卡片網格,
    color: '#B8A99A',
  },
  {
    value: 'timeline',
    icon: <GitBranch size={16} />,
    label: COMP_EDITOR_LABELS.時間軸,
    color: '#4a6fa5',
  },
]

interface DayHeaderProps {
  dayIndex: number
  currentStyle: DayDisplayStyle
  onStyleChange: (style: DayDisplayStyle) => void
  onSave: () => void
  onClose: () => void
}

export function DayHeader({
  dayIndex,
  currentStyle,
  onStyleChange,
  onSave,
  onClose,
}: DayHeaderProps) {
  const currentStyleOption = styleOptions.find(s => s.value === currentStyle)

  return (
    <>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-editor-theme-green/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: currentStyleOption?.color || '#2C5F4D' }}
          >
            {dayIndex + 1}
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">
              Day {dayIndex + 1} {COMP_EDITOR_LABELS.EDIT_302}
            </h2>
            <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.EDIT_7600}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            className="gap-2 bg-editor-theme-green hover:bg-editor-theme-green/80"
          >
            <Save size={16} />
            {COMP_EDITOR_LABELS.SAVE}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* 風格選擇器 */}
      <div className="px-6 py-3 border-b bg-card flex items-center gap-2">
        <span className="text-sm text-morandi-secondary mr-2">{COMP_EDITOR_LABELS.LABEL_4473}</span>
        <div className="flex items-center bg-muted rounded-lg p-1">
          {styleOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStyleChange(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                currentStyle === option.value ? 'bg-card shadow-sm' : 'hover:bg-card/50'
              }`}
              style={{
                color: currentStyle === option.value ? option.color : undefined,
              }}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
