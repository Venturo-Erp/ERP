'use client'

/**
 * 通用列印模板
 * 
 * 特點：
 * - A4 尺寸（210mm × 297mm）
 * - 固定頁首頁尾
 * - 中間內容區可撐開
 * - 支援多頁
 * 
 * @example
 * ```tsx
 * <PrintTemplate
 *   header={<div>公司名稱</div>}
 *   footer={<div>簽名欄</div>}
 *   forceFooterBottom  // 頁尾強制在底部
 * >
 *   <div>內容</div>
 * </PrintTemplate>
 * ```
 */

import { forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A4 尺寸常數（mm）
export const A4 = {
  width: 210,
  height: 297,
  // 預設邊距
  margin: {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
  },
  // 可用內容區域
  get contentWidth() {
    return this.width - this.margin.left - this.margin.right // 180mm
  },
  get contentHeight() {
    return this.height - this.margin.top - this.margin.bottom // 267mm
  },
}

export interface PrintTemplateProps {
  /** 頁首內容 */
  header?: ReactNode
  /** 頁尾內容 */
  footer?: ReactNode
  /** 主要內容 */
  children: ReactNode
  /** 頁尾強制在底部（內容不足時撐開） */
  forceFooterBottom?: boolean
  /** 紙張方向 */
  orientation?: 'portrait' | 'landscape'
  /** 自訂邊距（mm） */
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  /** 額外的 className */
  className?: string
  /** 顯示邊框（開發用） */
  showBorder?: boolean
}

export const PrintTemplate = forwardRef<HTMLDivElement, PrintTemplateProps>(
  function PrintTemplate(
    {
      header,
      footer,
      children,
      forceFooterBottom = false,
      orientation = 'portrait',
      margin,
      className,
      showBorder = false,
    },
    ref
  ) {
    const isLandscape = orientation === 'landscape'
    const pageWidth = isLandscape ? A4.height : A4.width
    const pageHeight = isLandscape ? A4.width : A4.height

    const m = {
      top: margin?.top ?? A4.margin.top,
      right: margin?.right ?? A4.margin.right,
      bottom: margin?.bottom ?? A4.margin.bottom,
      left: margin?.left ?? A4.margin.left,
    }

    return (
      <div
        ref={ref}
        className={cn(
          'print-template bg-white text-black',
          showBorder && 'border border-dashed border-gray-300',
          className
        )}
        style={{
          width: `${pageWidth}mm`,
          minHeight: `${pageHeight}mm`,
          padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif',
          fontSize: '12px',
          lineHeight: '1.5',
          boxSizing: 'border-box',
          // 用 flex 讓頁尾可以撐到底部
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 頁首 */}
        {header && (
          <div 
            className="print-header flex-shrink-0"
            style={{ marginBottom: '10mm' }}
          >
            {header}
          </div>
        )}

        {/* 主要內容 */}
        <div 
          className={cn(
            'print-content',
            forceFooterBottom && 'flex-1'
          )}
        >
          {children}
        </div>

        {/* 頁尾 */}
        {footer && (
          <div 
            className="print-footer flex-shrink-0"
            style={{ marginTop: forceFooterBottom ? 'auto' : '10mm' }}
          >
            {footer}
          </div>
        )}
      </div>
    )
  }
)

/**
 * 列印時的分頁符號
 */
export function PageBreak() {
  return <div style={{ pageBreakAfter: 'always' }} />
}

/**
 * 不可分割區塊（避免被分頁切斷）
 */
export function NoBreak({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div style={{ pageBreakInside: 'avoid' }} className={className}>
      {children}
    </div>
  )
}
