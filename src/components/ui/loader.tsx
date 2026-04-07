'use client'

import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /** 使用哪種形狀：rect(方形)、triangle(三角)、circle(圓形) */
  variant?: 'rect' | 'triangle' | 'circle'
}

/**
 * 品牌載入動畫
 * 幾何圖形描邊 + 追蹤圓點
 */
export function Loader({ className, size = 'md', variant = 'rect' }: LoaderProps) {
  const sizeMap = { sm: 24, md: 44, lg: 64 }
  const s = sizeMap[size]

  return (
    <div
      className={cn('loader', variant === 'triangle' && 'triangle', className)}
      style={{ width: s, height: s }}
    >
      <svg viewBox="0 0 80 80">
        {variant === 'rect' && (
          <rect x="8" y="8" width="64" height="64" />
        )}
        {variant === 'triangle' && (
          <polygon points="40 8, 72 72, 8 72" />
        )}
        {variant === 'circle' && (
          <circle cx="40" cy="40" r="32" />
        )}
      </svg>
    </div>
  )
}

/**
 * 全頁載入狀態
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader size="lg" />
    </div>
  )
}
