'use client'

/**
 * 遊戲式教學遮罩
 * - 半透明黑色覆蓋全畫面
 * - 挖洞突顯目標元素（4 個 div 組成邊框）
 * - 目標元素可正常點擊，其他地方點不到
 * - 提示氣泡指向目標
 */

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TutorialStep {
  id: string
  /** 目標元素的 CSS selector，例如 `[data-tutorial="nav-settings"]` */
  target: string
  /** 提示標題 */
  title: string
  /** 提示內容 */
  body: string
  /** 氣泡位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** 按鈕文字（預設「知道了」） */
  actionLabel?: string
  /** 是否可跳過 */
  canSkip?: boolean
  /** 點擊後跳轉的路徑 */
  href?: string
}

interface TutorialOverlayProps {
  step: TutorialStep | null
  onNext: () => void
  onSkip?: () => void
  onDismiss?: () => void
  stepNumber?: number
  totalSteps?: number
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay({
  step,
  onNext,
  onSkip,
  onDismiss,
  stepNumber,
  totalSteps,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [hasOpenDialog, setHasOpenDialog] = useState(false)
  const rafRef = useRef<number | null>(null)

  // 監聽 Dialog 開啟狀態 — 有 Radix dialog 打開時自動隱藏教學遮罩
  useEffect(() => {
    const check = () => {
      // Radix Dialog 會在 body 上加 data-state 或在 DOM 放 [role="dialog"][data-state="open"]
      const openDialog = document.querySelector('[role="dialog"][data-state="open"]')
      setHasOpenDialog(!!openDialog)
    }
    check()
    // 用 MutationObserver 監聽 body 變化
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!step) {
      setTargetRect(null)
      return
    }

    const updateRect = () => {
      const el = document.querySelector(step.target)
      if (!el) {
        // 目標還沒出現 → 下一幀再試
        rafRef.current = requestAnimationFrame(updateRect)
        return
      }
      const r = el.getBoundingClientRect()
      const padding = 8
      setTargetRect({
        top: r.top - padding,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      })

      // 捲動到目標可見
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }

    updateRect()

    // 監聽視窗變化
    const handleResize = () => updateRect()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [step])

  if (!step || !targetRect) return null
  // 任何 Dialog 開啟時隱藏教學遮罩（避免雙層遮罩）
  if (hasOpenDialog) return null

  const placement = step.placement || 'bottom'

  // 氣泡位置計算
  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    maxWidth: 320,
  }

  const gap = 16
  switch (placement) {
    case 'top':
      bubbleStyle.bottom = window.innerHeight - targetRect.top + gap
      bubbleStyle.left = targetRect.left + targetRect.width / 2
      bubbleStyle.transform = 'translateX(-50%)'
      break
    case 'bottom':
      bubbleStyle.top = targetRect.top + targetRect.height + gap
      bubbleStyle.left = targetRect.left + targetRect.width / 2
      bubbleStyle.transform = 'translateX(-50%)'
      break
    case 'left':
      bubbleStyle.right = window.innerWidth - targetRect.left + gap
      bubbleStyle.top = targetRect.top + targetRect.height / 2
      bubbleStyle.transform = 'translateY(-50%)'
      break
    case 'right':
      bubbleStyle.left = targetRect.left + targetRect.width + gap
      bubbleStyle.top = targetRect.top + targetRect.height / 2
      bubbleStyle.transform = 'translateY(-50%)'
      break
  }

  return (
    <>
      {/* 四片遮罩組成「挖洞」效果 */}
      {/* 上 */}
      <div
        className="fixed bg-black/40 z-[10000] transition-opacity pointer-events-none"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: targetRect.top,
        }}
      />
      {/* 下 */}
      <div
        className="fixed bg-black/40 z-[10000] transition-opacity pointer-events-none"
        style={{
          top: targetRect.top + targetRect.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* 左 */}
      <div
        className="fixed bg-black/40 z-[10000] transition-opacity pointer-events-none"
        style={{
          top: targetRect.top,
          left: 0,
          width: targetRect.left,
          height: targetRect.height,
        }}
      />
      {/* 右 */}
      <div
        className="fixed bg-black/40 z-[10000] transition-opacity pointer-events-none"
        style={{
          top: targetRect.top,
          left: targetRect.left + targetRect.width,
          right: 0,
          height: targetRect.height,
        }}
      />

      {/* 高亮邊框（金色脈動） */}
      <div
        className="fixed pointer-events-none z-[10000] rounded-lg ring-4 ring-morandi-gold animate-pulse"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
      />

      {/* 提示氣泡 */}
      <div style={bubbleStyle}>
        <div className="bg-card rounded-xl shadow-2xl border border-morandi-gold/30 overflow-hidden">
          {/* 進度 + 關閉 */}
          <div className="flex items-center justify-between px-4 py-2 bg-morandi-gold/10 border-b border-morandi-gold/20">
            {stepNumber && totalSteps && (
              <span className="text-xs font-medium text-morandi-gold">
                第 {stepNumber} / {totalSteps} 步
              </span>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-morandi-muted hover:text-morandi-primary transition-colors"
                title="關閉教學"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 內容 */}
          <div className="p-4">
            <h3 className="text-base font-bold text-morandi-primary mb-2">{step.title}</h3>
            <p className="text-sm text-morandi-secondary leading-relaxed">{step.body}</p>
          </div>

          {/* 按鈕 */}
          <div className="flex items-center gap-2 px-4 pb-4">
            {step.canSkip && onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip} className="h-8 text-xs flex-1">
                稍後再說
              </Button>
            )}
            {step.href ? (
              <Link
                href={step.href}
                className={cn(
                  'h-8 px-3 text-xs bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-1 rounded-md flex items-center justify-center font-medium',
                  step.canSkip ? 'flex-1' : 'w-full'
                )}
              >
                {step.actionLabel || '立即前往'}
                <ChevronRight size={14} className="ml-1" />
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className={cn(
                  'h-8 text-xs bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-1',
                  step.canSkip ? 'flex-1' : 'w-full'
                )}
              >
                {step.actionLabel || '知道了'}
                <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
