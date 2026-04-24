'use client'

/**
 * DevDatabaseBadge
 *
 * Dev mode 下右下角顯示紅色警告、提醒開發者「你現在改的是正式 DB」。
 *
 * 背景:
 *   Venturo 目前只有一個 Supabase project (wzvwmawpkapcmkfmkvav)、
 *   .env.local 跟 production 指向同一個 DB。
 *   本地 dev 任何寫入操作都會改到真實 Corner/JINGYAO/YUFEN 資料。
 *   這個 badge 是給開發者的第一道防呆、視覺上提醒。
 *
 * 設計:
 *   - 只在 NODE_ENV=development 時 render (production build 不顯示)
 *   - 固定在右下角、不干擾主 UI
 *   - 可點「我知道了」暫時隱藏 (localStorage、重開又出現)
 */

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'dev-db-badge-dismissed-until'

export function DevDatabaseBadge() {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const dismissedUntil = localStorage.getItem(STORAGE_KEY)
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return
    setHidden(false)
  }, [])

  if (process.env.NODE_ENV !== 'development' || hidden) return null

  const dismiss = () => {
    // 暫時隱藏 2 小時、之後重新出現
    const until = Date.now() + 2 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(until))
    setHidden(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 99999,
        background: '#dc2626',
        color: 'white',
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        maxWidth: 320,
        lineHeight: 1.4,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ DEV → 正式 DB</div>
      <div style={{ opacity: 0.9 }}>
        這裡改的資料會直接進 production Supabase (Corner / JINGYAO / YUFEN 真資料)。
        寫入操作請謹慎。
      </div>
      <button
        onClick={dismiss}
        style={{
          marginTop: 8,
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        我知道了 (2 小時內不再提醒)
      </button>
    </div>
  )
}
