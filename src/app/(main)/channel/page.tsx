'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import { ChannelChat } from '@/components/workspace/ChannelChat'
import { useWorkspaceChannels } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { ModuleLoading } from '@/components/module-loading'

export default function WorkspacePage() {
  const { sidebarCollapsed } = useAuthStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const { loadWorkspaces, loadChannelGroups, loadChannels, currentWorkspace } =
    useWorkspaceChannels()
  const [hasLoaded, setHasLoaded] = useState(false)

  // 🔥 Step 1: 載入 workspaces（只執行一次）
  useEffect(() => {
    if (hasLoaded) return

    const init = async () => {
      logger.log('🔵 [WorkspacePage] 載入工作空間')
      await loadWorkspaces()
    }

    init().catch(err => logger.error('[init]', err))
  }, [])

  // 🔥 Step 2: 當 workspace 載入後，載入 channels 和 groups（只執行一次）
  useEffect(() => {
    if (hasLoaded || !currentWorkspace) return

    const loadData = async () => {
      logger.log('🔵 [ChannelPage] 載入頻道和群組, workspace:', currentWorkspace.id)
      await Promise.all([loadChannelGroups(currentWorkspace.id), loadChannels(currentWorkspace.id)])
      // 取得 channels store 的資料
      const channelStore = await import('@/stores/workspace/channel-store')
      const channels = channelStore.useChannelStore.getState().items
      logger.log('🔵 [ChannelPage] 載入的頻道數量:', channels.length, channels)
      setHasLoaded(true)
      logger.log('✅ [ChannelPage] 初始化完成')
    }

    loadData().catch(err => logger.error('[loadData]', err))
  }, [currentWorkspace?.id])

  // 載入中顯示 loading
  if (!hasLoaded) {
    return <ModuleLoading fullscreen />
  }

  // 工作空間頁面使用自訂 layout，最大化聊天區域
  return (
    <>
      {/* 手機版頂部標題列 */}
      <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
      <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      {/* 主內容區域 - 頂部對齊，分割線對齊 logo 下方 */}
      <main
        className={cn(
          'fixed right-0 bottom-0 overflow-hidden',
          // 手機模式：全寬，頂部扣除標題列
          'top-14 left-0 p-2',
          // 桌面模式：扣除 sidebar 寬度，從頂部開始，保留適當間距
          'lg:top-0 lg:p-4',
          sidebarCollapsed ? 'lg:left-16' : 'lg:left-[190px]'
        )}
      >
        <div className="h-full rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <ChannelChat />
        </div>
      </main>
    </>
  )
}
