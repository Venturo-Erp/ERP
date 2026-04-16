'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useMemo } from 'react'

interface WatermarkOverlayProps {
  /** 自訂浮水印文字，不傳則自動用登入者姓名 */
  text?: string
  /** 透明度，預設 0.06 */
  opacity?: number
}

/**
 * 頁面浮水印 Overlay
 *
 * 在敏感頁面疊一層半透明浮水印，顯示登入者姓名 + 日期。
 * 截圖時浮水印會一起被帶走，可追溯外流來源。
 *
 * 使用方式：
 * ```tsx
 * <div className="relative">
 *   <WatermarkOverlay />
 *   {敏感內容}
 * </div>
 * ```
 *
 * 或直接加在頁面最外層讓整頁都有浮水印。
 */
export function WatermarkOverlay({ text, opacity = 0.06 }: WatermarkOverlayProps) {
  const user = useAuthStore(state => state.user)

  const watermarkText = useMemo(() => {
    if (text) return text
    const name =
      user?.display_name || user?.chinese_name || user?.english_name || user?.employee_number || '訪客'
    const date = new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei',
    })
    return `${name}　${date}`
  }, [text, user])

  // 用 SVG 產生斜向重複文字（比 CSS background 更難用 DevTools 移除）
  const svgContent = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="sans-serif"
        font-size="16"
        fill="rgba(0,0,0,${opacity})"
        transform="rotate(-30, 160, 100)"
      >${watermarkText}</text>
    </svg>
  `)

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svgContent}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '320px 200px',
      }}
    />
  )
}
