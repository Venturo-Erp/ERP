'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'
import { NotificationCapsule } from './notification-capsule'
// import { TutorialProvider } from '@/components/tutorial/tutorial-provider'  // 2026-04-18 暫關、不影響上線進度
import { usePathname } from 'next/navigation'
import {
  NO_SIDEBAR_PAGES,
  CUSTOM_LAYOUT_PAGES,
  HEADER_HEIGHT_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
  SIDEBAR_WIDTH_COLLAPSED_PX,
  LAYOUT_TRANSITION_DURATION,
} from '@/lib/constants/layout'
import { logger } from '@/lib/utils/logger'

const STORAGE_KEY_LAST_VISITED = 'last-visited-path'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed } = useAuthStore()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 記錄使用者訪問的頁面（用於登出後重新登入時跳回）
  useEffect(() => {
    if (!isClient) return
    if (pathname === '/login') return

    // 儲存當前路徑到 localStorage
    localStorage.setItem(STORAGE_KEY_LAST_VISITED, pathname)
  }, [isClient, pathname])

  // 初始化離線資料庫和基礎資料（延遲執行，避免阻塞首次渲染）
  useEffect(() => {
    if (!isClient) return

    // 需要 workspace 資料的路由前綴
    const ROUTES_NEED_WORKSPACE = ['/tours', '/orders', '/contracts', '/finance']
    const needsWorkspace = ROUTES_NEED_WORKSPACE.some(route => pathname.startsWith(route))

    if (!needsWorkspace) return

    // 載入基礎資料（使用 requestIdleCallback 延遲非關鍵載入）
    const loadInitialData = async () => {
      try {
        // 載入工作空間（用於生成團號等）
        const { useWorkspaceStoreData } = await import('@/stores/workspace/workspace-store')
        const workspaceStore = useWorkspaceStoreData.getState()
        if (workspaceStore.items.length === 0 && workspaceStore.fetchAll) {
          await workspaceStore.fetchAll()
        }
      } catch (_error) {
        logger.error('Failed to load workspaces:', _error)
      }
    }

    // 延遲執行，讓首次渲染優先完成
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(() => loadInitialData(), { timeout: 2000 })
      return () => cancelIdleCallback(idleId)
    } else {
      const timeoutId = setTimeout(loadInitialData, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [isClient, pathname])
  // 不需要側邊欄的頁面（支援完全匹配和前綴匹配）
  const shouldShowSidebar = !NO_SIDEBAR_PAGES.some(
    page => pathname === page || pathname.startsWith(page + '/')
  )

  // 使用自定義 layout 的頁面
  const hasCustomLayout = CUSTOM_LAYOUT_PAGES.some(page => pathname.startsWith(page))

  // 登入頁或分享頁不需要側邊欄
  if (!shouldShowSidebar) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  // 使用自定義 layout 的頁面只需要側邊欄
  if (hasCustomLayout) {
    return (
      <div className="min-h-screen bg-background">
        {/* 左下象限 - 側邊欄 */}
        <Sidebar />
        {/* 內容由頁面自己的 layout 處理 */}
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 左下象限 - 側邊欄 */}
      <Sidebar />

      {/* 右下象限 - 主內容區域 */}
      <main
        className={cn(
          'fixed right-0 transition-all overflow-hidden',
          // 手機模式 (< lg)：全寬，頂部扣除標題列高度（h-14 = 56px）
          'top-14 bottom-0 left-0',
          // 桌面模式 (>= lg)：扣除 sidebar 寬度，有 top header
          'lg:top-[72px] lg:bottom-0',
          !isClient ? 'lg:left-16' : sidebarCollapsed ? 'lg:left-16' : 'lg:left-[180px]'
        )}
        style={{
          transitionDuration: `${LAYOUT_TRANSITION_DURATION}ms`,
        }}
      >
        <div className="h-full flex flex-col p-4 lg:p-6">{children}</div>
      </main>

      {/* 浮動通知膠囊 — 有未讀通知時才顯示 */}
      <NotificationCapsule />

      {/* 新手引導教學遮罩 — 2026-04-18 暫關（William）*/}
      {/* <TutorialProvider /> */}
    </div>
  )
}
