'use client'

import { cn } from '@/lib/utils'
import { UtensilsCrossed } from 'lucide-react'

interface Meals {
  breakfast: string
  lunch: string
  dinner: string
}

interface JapaneseMealsCardProps {
  meals: Meals
  className?: string
}

/**
 * 日式和風餐食卡片 V2
 * - 三欄並排卡片設計
 * - 雙層邊框（障子門風格）
 * - 頂部浮動圖標
 * - hover 邊框變色效果
 */
export function JapaneseMealsCard({ meals, className }: JapaneseMealsCardProps) {
  const primaryColor = '#5D4037'

  const mealItems = [
    { label: '早餐', name: meals.breakfast || '敬請自理' },
    { label: '午餐', name: meals.lunch || '敬請自理' },
    { label: '晚餐', name: meals.dinner || '敬請自理' },
  ]

  return (
    <div className={cn('grid grid-cols-3 gap-2 sm:gap-4 md:gap-6', className)}>
      {mealItems.map((meal, index) => (
        <div
          key={index}
          className="relative bg-card rounded-xl border-2 border-border p-2 sm:p-3 md:p-4 flex flex-col items-center justify-center min-h-[80px] sm:min-h-[90px] md:min-h-[100px] text-center shadow-sm hover:border-morandi-primary/40 transition-colors duration-300"
        >
          {/* 內層邊框（障子門效果）*/}
          <div
            className="absolute pointer-events-none rounded-xl"
            style={{
              top: '4px',
              left: '4px',
              right: '4px',
              bottom: '4px',
              border: '1px solid currentColor',
              opacity: 0.2,
              borderRadius: '12px',
            }}
          />

          {/* 頂部浮動圖標 */}
          <div
            className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 px-1.5 sm:px-2"
            style={{ backgroundColor: '#FDFCF8' }}
          >
            <UtensilsCrossed
              className="w-3 h-3 sm:w-4 sm:h-4"
              style={{ color: `${primaryColor}66` }}
            />
          </div>

          {/* 餐別標籤 */}
          <span
            className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-1.5 sm:mb-2 md:mb-3 border-b border-border pb-0.5 sm:pb-1"
            style={{
              color: `${primaryColor}99`,
              borderColor: `${primaryColor}33`,
            }}
          >
            {meal.label}
          </span>

          {/* 餐廳名稱 */}
          <h3
            className="text-xs sm:text-sm md:text-base lg:text-lg font-bold line-clamp-2"
            style={{ color: primaryColor }}
          >
            {meal.name}
          </h3>
        </div>
      ))}
    </div>
  )
}
