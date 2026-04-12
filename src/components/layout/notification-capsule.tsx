'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

interface Notification {
  id: string
  module: string
  type: string
  title: string
  message: string | null
  action_url: string | null
  is_read: boolean
  created_at: string
}

const MODULE_LABELS: Record<string, string> = {
  hr: '人資',
  finance: '財務',
  tour: '團務',
  system: '系統',
  announcement: '公告',
}

/**
 * 浮動通知膠囊
 * - 平常隱藏，有未讀通知時滑入顯示
 * - 點擊展開通知面板
 * - 可按 X 暫時隱藏（下次有新通知再出現）
 */
export function NotificationCapsule() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevUnreadRef = useRef(0)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/notifications?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        const newCount = data.unread_count || 0

        // 如果有新通知進來，重新顯示膠囊
        if (newCount > prevUnreadRef.current) {
          setDismissed(false)
        }
        prevUnreadRef.current = newCount
        setUnreadCount(newCount)
      }
    } catch (err) {
      logger.error('載入通知失敗:', err)
    }
  }, [user?.id])

  // 初始載入 + 每 30 秒輪詢
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // 點擊外部關閉面板
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    setLoading(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  const handleClickNotification = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id)
    if (n.action_url) {
      router.push(n.action_url)
      setOpen(false)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
    setOpen(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '剛剛'
    if (diffMin < 60) return `${diffMin} 分鐘前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} 小時前`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return `${diffDay} 天前`
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  // 沒有未讀 或 被暫時關閉 → 不顯示
  const isVisible = unreadCount > 0 && !dismissed

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-in-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      )}
    >
      {/* 展開的通知面板 */}
      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-[380px] max-h-[480px] bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
          {/* 標題列 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold text-morandi-primary">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-morandi-gold hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} />
                全部已讀
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-morandi-muted">沒有通知</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border/30 hover:bg-morandi-container/30 transition-colors',
                    !n.is_read && 'bg-morandi-gold/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex-shrink-0">
                      {!n.is_read ? (
                        <span className="block w-2 h-2 rounded-full bg-morandi-gold" />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-morandi-muted px-1.5 py-0.5 rounded bg-morandi-container/50">
                          {MODULE_LABELS[n.module] || n.module}
                        </span>
                        <span className="text-[10px] text-morandi-muted">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-sm mt-1 leading-snug',
                          n.is_read ? 'text-morandi-secondary' : 'text-morandi-primary font-medium'
                        )}
                      >
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-morandi-muted mt-0.5 truncate">{n.message}</p>
                      )}
                    </div>
                    {n.action_url && (
                      <ExternalLink size={12} className="text-morandi-muted flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 膠囊按鈕 */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all cursor-pointer',
          'bg-morandi-red/90 hover:bg-morandi-red text-white',
          'backdrop-blur-sm border border-white/10'
        )}
        onClick={() => setOpen(!open)}
      >
        <Bell size={16} className="flex-shrink-0" />
        <span className="text-sm font-medium">{unreadCount} 則通知</span>
        <button
          onClick={handleDismiss}
          className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
