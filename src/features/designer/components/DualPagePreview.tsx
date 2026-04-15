'use client'

/**
 * DualPagePreview - 雙頁預覽組件
 * 用於顯示手冊的跨頁預覽
 */

import { cn } from '@/lib/utils'
import type { CanvasPage, CanvasElement } from '@/features/designer/components/types'
import { DESIGNER_LABELS } from '../constants/labels'

// ============================================
// 頁面縮圖組件
// ============================================
export function PageThumbnail({ page, scale }: { page: CanvasPage; scale: number }) {
  return (
    <div className="w-full h-full relative">
      {page.elements.map(element => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: element.x * scale,
          top: element.y * scale,
          opacity: element.opacity,
          transform: `rotate(${element.rotation}deg)`,
        }

        if ('width' in element && 'height' in element && element.width && element.height) {
          style.width = element.width * scale
          style.height = element.height * scale
        }

        switch (element.type) {
          case 'shape':
            return (
              <div
                key={element.id}
                style={{
                  ...style,
                  backgroundColor: element.fill || 'var(--morandi-gold)',
                  borderRadius:
                    element.variant === 'circle' ? '50%' : (element.cornerRadius || 0) * scale,
                }}
              />
            )
          case 'text':
            return (
              <div
                key={element.id}
                style={{
                  ...style,
                  fontSize: element.style.fontSize * scale,
                  fontFamily: element.style.fontFamily,
                  color: element.style.color,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {element.content}
              </div>
            )
          case 'image':
            return (
              <div
                key={element.id}
                style={{
                  ...style,
                  backgroundColor: '#e5e5e5',
                  backgroundImage: `url(${element.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

// ============================================
// 雙頁預覽組件
// ============================================
interface DualPagePreviewProps {
  pages: CanvasPage[]
  currentPageIndex: number
  canvasWidth: number
  canvasHeight: number
  zoom: number
  onSelectPage: (index: number) => void
}

export function DualPagePreview({
  pages,
  currentPageIndex,
  canvasWidth,
  canvasHeight,
  zoom,
  onSelectPage,
}: DualPagePreviewProps) {
  // 計算左右頁面索引
  // 印刷品慣例：封面（0）獨立，之後 1-2, 3-4, 5-6... 為跨頁
  const getSpreadIndices = (index: number): [number | null, number | null] => {
    if (index === 0) {
      return [null, 0]
    }
    const isLeftPage = index % 2 === 1
    if (isLeftPage) {
      const rightIndex = index + 1 < pages.length ? index + 1 : null
      return [index, rightIndex]
    } else {
      const leftIndex = index - 1 >= 0 ? index - 1 : null
      return [leftIndex, index]
    }
  }

  const [leftIndex, rightIndex] = getSpreadIndices(currentPageIndex)
  const leftPage = leftIndex !== null ? pages[leftIndex] : null
  const rightPage = rightIndex !== null ? pages[rightIndex] : null

  const renderPagePreview = (
    page: CanvasPage | null,
    index: number | null,
    side: 'left' | 'right'
  ) => {
    const isCurrentPage = index === currentPageIndex

    if (!page) {
      return (
        <div
          className="bg-morandi-container/30 border border-dashed border-border rounded flex items-center justify-center"
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
          }}
        >
          <span className="text-morandi-muted text-sm">{DESIGNER_LABELS.封底空白頁}</span>
        </div>
      )
    }

    return (
      <div
        className={cn(
          'relative cursor-pointer transition-all',
          isCurrentPage && 'ring-2 ring-morandi-gold ring-offset-2'
        )}
        style={{
          width: canvasWidth * zoom,
          height: canvasHeight * zoom,
        }}
        onClick={() => index !== null && onSelectPage(index)}
        title={`${DESIGNER_LABELS.點擊編輯}${page.name}`}
      >
        <div
          className="absolute inset-0 bg-card shadow-lg rounded overflow-hidden"
          style={{ backgroundColor: page.backgroundColor }}
        >
          <PageThumbnail page={page} scale={zoom} />
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {index !== null ? `${DESIGNER_LABELS.第}${index + 1}${DESIGNER_LABELS.頁}` : ''} -{' '}
          {page.name}
        </div>

        {isCurrentPage && (
          <div className="absolute top-2 right-2 bg-morandi-gold text-white text-xs px-2 py-0.5 rounded">
            {DESIGNER_LABELS.編輯中}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-1 items-center">
      {renderPagePreview(leftPage, leftIndex, 'left')}
      <div className="w-1 bg-morandi-container rounded" style={{ height: canvasHeight * zoom }} />
      {renderPagePreview(rightPage, rightIndex, 'right')}
    </div>
  )
}
