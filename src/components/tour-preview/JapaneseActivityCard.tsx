'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getOptimizedImageProps } from '@/lib/image-utils'

interface JapaneseActivityCardProps {
  title: string
  description: string
  image?: string
  onClick?: () => void
  className?: string
}

/**
 * 日式和風景點卡片
 * - 圖片上方、說明下方的垂直佈局
 * - 和紙紋理背景
 * - 抹茶綠左邊框標題
 * - hover 時圖片輕微放大
 */
export function JapaneseActivityCard({
  title,
  description,
  image,
  onClick,
  className,
}: JapaneseActivityCardProps) {
  // 抹茶綠色
  const matchaColor = '#849e67'

  return (
    <article
      onClick={onClick}
      className={cn(
        'group bg-card rounded-[1rem] shadow-[0_4px_20px_-2px_rgba(132,158,103,0.15)]',
        'hover:shadow-lg transition-all duration-500',
        'border border-border overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* 圖片區塊 */}
      {image && (
        <div className="h-48 sm:h-64 md:h-80 overflow-hidden relative">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            {...getOptimizedImageProps(image)}
          />
          {/* 漸層遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent mix-blend-multiply pointer-events-none" />
        </div>
      )}

      {/* 內容區塊 */}
      <div className="p-4 sm:p-6 md:p-8 bg-card relative">
        {/* 和紙紋理背景 */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')",
          }}
        />

        <div className="relative z-10">
          {/* 標題 - 帶左邊框裝飾 */}
          <h2
            className="text-lg sm:text-2xl md:text-3xl font-bold tracking-wide sm:tracking-widest mb-3 sm:mb-5 relative pl-3 sm:pl-4"
            style={{
              color: '#5D4037',
              fontFamily: '"Zen Old Mincho", serif',
            }}
          >
            {/* 左邊框裝飾 */}
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[1.2em] rounded-[4px]"
              style={{ backgroundColor: matchaColor, opacity: 0.9 }}
            />
            {title}
          </h2>

          {/* 說明文字 */}
          {description && (
            <p
              className="text-xs sm:text-[15px] md:text-base leading-relaxed sm:leading-loose text-justify font-medium"
              style={{ color: 'rgba(93, 64, 55, 0.8)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
