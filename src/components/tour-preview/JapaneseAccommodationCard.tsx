'use client'

import { cn } from '@/lib/utils'
import { Bed } from 'lucide-react'
import { TOUR_PREVIEW_LABELS } from './constants/labels'

interface JapaneseAccommodationCardProps {
  name: string
  url?: string // 飯店官網連結
  rating?: number
  className?: string
}

/**
 * 日式和風住宿卡片
 * - 榻榻米紋理背景
 * - 左側床圖標 + 中間飯店名 + 右側星級
 * - 更緊湊的設計
 */
export function JapaneseAccommodationCard({
  name,
  url,
  rating = 5,
  className,
}: JapaneseAccommodationCardProps) {
  const matchaColor = '#849e67'
  const primaryColor = '#5D4037'

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-border p-1 shadow-sm relative overflow-hidden group',
        className
      )}
      style={{
        // 榻榻米紋理背景
        backgroundImage: `
          repeating-linear-gradient(
            45deg,
            rgba(232, 228, 217, 0.3) 0px,
            rgba(232, 228, 217, 0.3) 1px,
            transparent 1px,
            transparent 4px
          )
        `,
        backgroundColor: '#f7f5ef',
      }}
    >
      {/* 格子紋理裝飾 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49%, ${primaryColor} 50%, transparent 51%),
            linear-gradient(0deg, transparent 49%, ${primaryColor} 50%, transparent 51%)
          `,
          backgroundSize: '60px 40px',
        }}
      />

      {/* 內容區 */}
      <div
        className="relative z-10 flex items-center justify-between px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg backdrop-blur-sm border border-white/40"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          boxShadow: 'inset 0 0 20px rgba(93, 64, 55, 0.05)',
        }}
      >
        {/* 左側圖標 */}
        <div className="flex items-center justify-center min-w-[40px] sm:min-w-[50px] md:min-w-[60px]">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg text-white flex items-center justify-center shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Bed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        {/* 中間飯店名稱 */}
        <div className="flex-1 text-center px-2 sm:px-3 md:px-4 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-wider sm:tracking-widest line-clamp-2 hover:underline transition-all"
              style={{
                color: '#5D4037',
                fontFamily: '"Zen Old Mincho", serif',
              }}
            >
              {name}
            </a>
          ) : (
            <h3
              className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-wider sm:tracking-widest line-clamp-2"
              style={{
                color: '#5D4037',
                fontFamily: '"Zen Old Mincho", serif',
              }}
            >
              {name}
            </h3>
          )}
        </div>

        {/* 右側星級或特色旅宿 */}
        <div className="flex flex-col items-center justify-center min-w-[40px] sm:min-w-[50px] md:min-w-[60px] opacity-70">
          {rating === 0 ? (
            // 特色旅宿
            <span className="text-[8px] sm:text-[10px] font-serif" style={{ color: matchaColor }}>
              {TOUR_PREVIEW_LABELS.LABEL_6456}
            </span>
          ) : (
            // 星級顯示
            <>
              <span
                className="text-[8px] sm:text-[10px] font-serif mb-0.5 sm:mb-1"
                style={{ color: primaryColor }}
              >
                {rating === 5 ? '五星級' : `${rating}星級`}
              </span>
              <div className="flex" style={{ color: matchaColor }}>
                {Array.from({ length: rating }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
