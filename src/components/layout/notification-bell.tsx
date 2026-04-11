'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
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

export function NotificationBell() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/notifications?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
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

  // 點擊外部關閉
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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
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

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id)
    if (n.action_url) {
      router.push(n.action_url)
      setOpen(false)
    }
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

  return (
    <div className="relative" ref={panelRef}>
      {/* 鈴鐺按鈕 */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-morandi-container/50 transition-colors"
      >
        <Bell size={18} className="text-morandi-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-morandi-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50">
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
              <div className="py-12 text-center text-sm text-morandi-muted">
                沒有通知
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border/30 hover:bg-morandi-container/30 transition-colors',
                    !n.is_read && 'bg-morandi-gold/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* 未讀指示點 */}
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
                        <span className="text-[10px] text-morandi-muted">{formatTime(n.created_at)}</span>
                      </div>
                      <p className={cn(
                        'text-sm mt-1 leading-snug',
                        n.is_read ? 'text-morandi-secondary' : 'text-morandi-primary font-medium'
                      )}>
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
    </div>
  )
}
