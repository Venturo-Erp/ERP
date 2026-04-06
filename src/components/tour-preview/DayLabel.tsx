import React from 'react'
import { morandiColors } from '@/lib/constants/morandi-colors'

export interface DayLabelProps {
  dayNumber?: number
  dayLabel?: string // 自定義標籤（如 "Day 3-B"），優先於 dayNumber
  isAlternative?: boolean // 是否為建議方案
  variant?: 'default' | 'large' | 'small'
  coverStyle?: 'original' | 'gemini' | 'nature' | 'luxury' | 'art' | 'dreamscape' | 'collage' // 封面風格
  title?: string // 當天標題（nature 風格使用）
  className?: string
}

// 數字轉中文（用於 nature 風格）
const numberToChinese: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
  10: '十',
  11: '十一',
  12: '十二',
  13: '十三',
  14: '十四',
  15: '十五',
}

// 數字轉英文序數（用於 nature 風格）
const numberToOrdinal: Record<number, string> = {
  1: 'ONE',
  2: 'TWO',
  3: 'THREE',
  4: 'FOUR',
  5: 'FIVE',
  6: 'SIX',
  7: 'SEVEN',
  8: 'EIGHT',
  9: 'NINE',
  10: 'TEN',
  11: 'ELEVEN',
  12: 'TWELVE',
  13: 'THIRTEEN',
  14: 'FOURTEEN',
  15: 'FIFTEEN',
}

/**
 * Day 標籤組件
 * 用於顯示「Day 01」「Day 02」或「Day 03-B」等日期標識
 * 支援多種封面風格
 */
export function DayLabel({
  dayNumber,
  dayLabel,
  isAlternative = false,
  variant = 'default',
  coverStyle = 'original',
  title,
  className = '',
}: DayLabelProps) {
  // 從 dayLabel 中提取數字（如 "Day 3" -> 3, "Day 3-B" -> 3）
  const extractedNumber = dayLabel
    ? parseInt(dayLabel.replace(/Day\s*/i, '').split('-')[0], 10)
    : dayNumber || 1

  // 優先使用 dayLabel，否則用 dayNumber 生成
  const displayLabel = dayLabel || `Day ${String(dayNumber || 1).padStart(2, '0')}`
  // 轉換為全大寫的 "DAY XX" 格式
  const formattedLabel = displayLabel.toUpperCase().replace('DAY ', 'DAY ')

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    default: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  }

  // 日式和風風格 - 帶浮水印數字的標題
  if (coverStyle === 'nature') {
    const dayNum = extractedNumber
    const paddedNum = String(dayNum).padStart(2, '0')
    const ordinalText = numberToOrdinal[dayNum] || `${dayNum}`

    return (
      <div className={`relative flex items-center gap-6 ${className}`}>
        {/* 大型浮水印數字 */}
        <h2 className="text-6xl font-black text-status-info/10 absolute -ml-4 -mt-4 select-none">
          {paddedNum}
        </h2>
        <div className="relative z-10">
          <span className="block text-status-info text-xs font-bold tracking-[0.2em] mb-1">
            DAY {ordinalText}
          </span>
          {title && (
            <h3 className="text-2xl font-bold text-morandi-primary tracking-widest">{title}</h3>
          )}
        </div>
      </div>
    )
  }

  // 預設風格 - 圓形標籤
  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full font-bold tracking-wide
        ${sizeClasses[variant]}
        ${className}
      `}
      style={{
        backgroundColor: isAlternative ? morandiColors.text.secondary : morandiColors.gold,
        color: '#FFFFFF',
        boxShadow: isAlternative
          ? '0 2px 8px rgba(150, 140, 130, 0.3)'
          : '0 2px 8px rgba(212, 175, 55, 0.3)',
      }}
    >
      {formattedLabel}
    </div>
  )
}
