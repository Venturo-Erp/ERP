'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ThreeDPhotoWall } from '@/components/ui/3d-photo-wall'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TOURS_LABELS } from './constants/labels'

// 每日圖片型別（支援位置調整）
interface DailyImage {
  url: string
  position?: string
}

interface DailyImageCarouselProps {
  images: (string | DailyImage)[]
  title: string
  allTourImages?: string[] // 整個行程的所有每日照片（用於照片牆）
}

// 工具函數：取得圖片 URL
function getImageUrl(image: string | DailyImage): string {
  return typeof image === 'string' ? image : image.url
}

// 工具函數：取得圖片 position
function getImagePosition(image: string | DailyImage): string {
  return typeof image === 'string' ? 'center' : image.position || 'center'
}

export function DailyImageCarousel({ images, title, allTourImages = [] }: DailyImageCarouselProps) {
  const [showPhotoWall, setShowPhotoWall] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // 過濾掉空值和無效的圖片
  const validImages =
    images?.filter(img => {
      if (!img) return false
      if (typeof img === 'string') return img.trim() !== ''
      return img.url && img.url.trim() !== ''
    }) || []

  const showControls = validImages.length > 1

  // 滑動到指定 index
  const scrollToIndex = (index: number) => {
    if (!scrollRef.current || validImages.length <= 1) return

    const total = validImages.length
    const nextIndex = ((index % total) + total) % total

    const container = scrollRef.current
    const firstCard = container.querySelector('[data-card]') as HTMLElement
    if (!firstCard) return

    const cardWidth = firstCard.offsetWidth
    const gap = 12
    const scrollPosition = nextIndex * (cardWidth + gap)

    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    })
    setCurrentIndex(nextIndex)
  }

  // 監聽滾動更新當前索引
  useEffect(() => {
    const container = scrollRef.current
    if (!container || validImages.length <= 1) return

    const handleScroll = () => {
      const firstCard = container.querySelector('[data-card]') as HTMLElement
      if (!firstCard) return

      const cardWidth = firstCard.offsetWidth
      const gap = 12
      const index = Math.round(container.scrollLeft / (cardWidth + gap))
      setCurrentIndex(Math.max(0, Math.min(index, validImages.length - 1)))
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [validImages.length])

  if (validImages.length === 0) {
    return null
  }

  // 點擊圖片時顯示照片牆
  const handleImageClick = () => {
    if (allTourImages.length >= 4) {
      setShowPhotoWall(true)
    }
  }

  // 單張圖片時使用原本的樣式
  if (validImages.length === 1) {
    return (
      <>
        <div className="relative mb-6 sm:mb-8 mt-4 sm:mt-6">
          <div
            className={cn(
              'overflow-hidden rounded-[20px] sm:rounded-[28px] border border-white/60 bg-card shadow-lg ring-1 ring-border/20',
              allTourImages.length >= 4 && 'cursor-pointer'
            )}
            onClick={handleImageClick}
          >
            <div className="relative aspect-[16/9] w-full">
              <img
                src={getImageUrl(validImages[0])}
                alt={`${title}${TOURS_LABELS.IMAGE_ALT_SUFFIX}1`}
                className="h-full w-full object-cover"
                style={{ objectPosition: getImagePosition(validImages[0]) }}
              />
              {allTourImages.length >= 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group">
                  <div className="px-4 py-2 bg-black/60 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    {TOURS_LABELS.LABEL_4032}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showPhotoWall && (
          <ThreeDPhotoWall images={allTourImages} onClose={() => setShowPhotoWall(false)} />
        )}
      </>
    )
  }

  // 多張圖片：可滾動的輪播
  return (
    <>
      <div className="relative mb-6 sm:mb-8 mt-4 sm:mt-6">
        {/* 輪播容器 */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory',
          }}
        >
          <div className="flex gap-2 sm:gap-3">
            {validImages.map((image, index) => (
              <div
                key={`${getImageUrl(image)}-${index}`}
                data-card
                className={cn(
                  'flex-shrink-0 overflow-hidden rounded-[16px] sm:rounded-[20px] border border-white/60 bg-card shadow-lg ring-1 ring-border/20 transition-all duration-300',
                  allTourImages.length >= 4 && 'cursor-pointer',
                  index === currentIndex ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-80'
                )}
                style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: '500px',
                  scrollSnapAlign: 'start',
                }}
                onClick={handleImageClick}
              >
                <div className="relative aspect-[16/9] w-full">
                  <img
                    src={getImageUrl(image)}
                    alt={`${title}${TOURS_LABELS.IMAGE_ALT_SUFFIX}${index + 1}`}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: getImagePosition(image) }}
                  />
                  {allTourImages.length >= 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group">
                      <div className="px-4 py-2 bg-black/60 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        {TOURS_LABELS.CLICK_PHOTO_WALL}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 左右箭頭控制 */}
        {showControls && (
          <>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                scrollToIndex(currentIndex - 1)
              }}
              className="absolute left-0 top-1/2 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-morandi-primary shadow-lg ring-1 ring-black/5 transition hover:bg-card z-10"
              aria-label={TOURS_LABELS.PREV_IMAGE}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                scrollToIndex(currentIndex + 1)
              }}
              className="absolute right-0 top-1/2 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-morandi-primary shadow-lg ring-1 ring-black/5 transition hover:bg-card z-10"
              aria-label={TOURS_LABELS.NEXT_IMAGE}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* 分頁指示器 */}
        {showControls && (
          <div className="mt-3 sm:mt-4 flex justify-center gap-1.5 sm:gap-2">
            {validImages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  scrollToIndex(index)
                }}
                className={cn(
                  'h-2.5 rounded-full border border-morandi-primary/30 transition-all duration-300',
                  currentIndex === index ? 'w-6 bg-morandi-primary/90' : 'w-2.5 bg-card/60'
                )}
                aria-label={`${TOURS_LABELS.SWITCH_IMAGE_PREFIX}${index + 1}${TOURS_LABELS.SWITCH_IMAGE_SUFFIX}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3D 照片牆 */}
      {showPhotoWall && (
        <ThreeDPhotoWall images={allTourImages} onClose={() => setShowPhotoWall(false)} />
      )}
    </>
  )
}
