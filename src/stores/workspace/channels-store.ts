/**
 * Channels Store Facade
 * 整合多個 createStore，提供統一接口
 * 保持與舊版 channels-store 相同的 API
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase/client'
import { createChannelMember } from '@/data/entities/channel-members'
import { useChannelStore } from './channel-store'
import { useChannelGroupStore } from './channel-group-store'
import { createStore } from '../core/create-store'
import type { Workspace, Channel, ChannelGroup } from './types'
import type { BaseEntity } from '@/types'
import { setCurrentWorkspaceFilter } from '@/lib/workspace-filter'
import { useAuthStore } from '../auth-store'
import { deleteAllFilesInFolder } from '@/services/storage'
import { logger } from '@/lib/utils/logger'

type WorkspaceEntity = Workspace & BaseEntity

// Define the workspace store locally instead of importing it
const useWorkspaceStore = createStore<WorkspaceEntity>({
  tableName: 'workspaces',
})

/**
 * 額外狀態 (不需要同步到 Supabase 的 UI 狀態)
 */
interface ChannelsUIState {
  // UI 選擇狀態
  selectedChannel: Channel | null
  currentChannel: Channel | null
  currentWorkspace: Workspace | null
  currentWorkspaceId: string | null // 用於資料過濾

  // 搜尋與過濾
  searchQuery: string
  channelFilter: 'all' | 'starred' | 'unread' | 'muted'

  // 錯誤狀態
  error: string | null
}

/**
 * UI 狀態 Store (純前端狀態)
 */
const useChannelsUIStore = create<
  ChannelsUIState & {
    // UI 狀態操作
    setSelectedChannel: (channel: Channel | null) => void
    setCurrentChannel: (channel: Channel | null) => void
    setCurrentWorkspace: (workspace: Workspace | null) => void
    setCurrentWorkspaceId: (workspaceId: string | null) => void
    setSearchQuery: (query: string) => void
    setChannelFilter: (filter: 'all' | 'starred' | 'unread' | 'muted') => void
    setError: (error: string | null) => void
    clearError: () => void
  }
>(set => ({
  selectedChannel: null,
  currentChannel: null,
  currentWorkspace: null,
  currentWorkspaceId: null,
  searchQuery: '',
  channelFilter: 'all',
  error: null,

  setSelectedChannel: channel => set({ selectedChannel: channel }),
  setCurrentChannel: channel => set({ currentChannel: channel }),
  setCurrentWorkspace: workspace => set({ currentWorkspace: workspace }),
  setCurrentWorkspaceId: workspaceId => set({ currentWorkspaceId: workspaceId }),
  setSearchQuery: query => set({ searchQuery: query }),
  setChannelFilter: filter => set({ channelFilter: filter }),
  setError: error => set({ error }),
  clearError: () => set({ error: null }),
}))

/**
 * Channels Store Facade
 * 整合 Channel, ChannelGroup, Workspace 三個 createStore
 * 保持與舊版相同的 API
 */
export const useChannelsStore = () => {
  // 使用 createStore 的 stores
  const channelStore = useChannelStore()
  const channelGroupStore = useChannelGroupStore()
  const workspaceStore = useWorkspaceStore()

  // UI 狀態
  const uiStore = useChannelsUIStore()

  return {
    // ============================================
    // 資料 (來自 createStore)
    // ============================================
    workspaces: workspaceStore.items || [],
    channels: channelStore.items || [],
    channelGroups: channelGroupStore.items || [],

    // ============================================
    // UI 狀態
    // ============================================
    selectedChannel: uiStore.selectedChannel,
    currentChannel: uiStore.currentChannel,
    currentWorkspace: uiStore.currentWorkspace,
    currentWorkspaceId: uiStore.currentWorkspaceId,
    searchQuery: uiStore.searchQuery,
    channelFilter: uiStore.channelFilter,

    // ============================================
    // Loading 和 Error
    // ============================================
    loading: channelStore.loading || channelGroupStore.loading || workspaceStore.loading,
    error: uiStore.error || channelStore.error || channelGroupStore.error || workspaceStore.error,

    // ============================================
    // Workspace 操作
    // ============================================
    loadWorkspaces: async () => {
      const workspaces = await workspaceStore.fetchAll()

      // 🔥 使用 fetchAll 的返回值，而不是 items (避免競爭條件)
      if (workspaces && workspaces.length > 0 && !uiStore.currentWorkspace) {
        // 根據使用者的 workspace_id 選擇對應的工作空間
        const user = useAuthStore.getState().user
        const userWorkspaceId = user?.workspace_id

        let selectedWorkspace = workspaces[0] // 預設第一個

        if (userWorkspaceId) {
          const userWorkspace = workspaces.find(ws => ws.id === userWorkspaceId)
          if (userWorkspace) {
            selectedWorkspace = userWorkspace
          }
        }

        uiStore.setCurrentWorkspace(selectedWorkspace)
        // 🔥 設定 workspace filter
        setCurrentWorkspaceFilter(selectedWorkspace.id)
      }
    },

    setCurrentWorkspace: (workspace: Workspace | string | null) => {
      if (typeof workspace === 'string') {
        // 如果傳入 workspace ID，設定 ID
        uiStore.setCurrentWorkspaceId(workspace)
        // 嘗試從列表中找到對應的 workspace 物件
        const ws = workspaceStore.items.find(w => w.id === workspace)
        uiStore.setCurrentWorkspace(ws || null)
        // 🔥 設定 workspace filter，讓 fetchAll 可以正確過濾
        setCurrentWorkspaceFilter(workspace)
      } else {
        // 如果傳入 workspace 物件
        uiStore.setCurrentWorkspace(workspace)
        const workspaceId = workspace?.id || null
        uiStore.setCurrentWorkspaceId(workspaceId)
        // 🔥 設定 workspace filter，讓 fetchAll 可以正確過濾
        setCurrentWorkspaceFilter(workspaceId)
      }
    },

    createWorkspace: workspaceStore.create,
    updateWorkspace: workspaceStore.update,

    // ============================================
    // Channel 操作 (使用 createStore 的方法)
    // ============================================
    loadChannels: async (_workspaceId?: string) => {
      // workspaceId 參數保留以維持 API 兼容性，實際過濾由 RLS 處理
      await channelStore.fetchAll()
    },

    createChannel: async (channel: Omit<Channel, 'id' | 'created_at'>) => {
      const newChannel: Channel = {
        ...channel,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      }
      await channelStore.create(newChannel)

      // 🔥 自動將創建者加入為頻道擁有者
      if (newChannel.created_by) {
        try {
          await createChannelMember({
            workspace_id: newChannel.workspace_id,
            channel_id: newChannel.id,
            employee_id: newChannel.created_by,
            role: 'owner',
            status: 'active',
          })
        } catch (error) {
          logger.warn('[ChannelsStore] 加入頻道擁有者失敗:', error)
        }
      }

      return newChannel
    },

    updateChannel: async (id: string, updates: Partial<Channel>) => {
      await channelStore.update(id, updates)
    },

    deleteChannel: async (id: string) => {
      // 先清理 Storage 中的頻道附件檔案
      try {
        const result = await deleteAllFilesInFolder(id)
        if (result.deleted > 0) {
          logger.log(`已清理頻道 ${id} 的 ${result.deleted} 個附件檔案`)
        }
      } catch (error) {
        // Storage 清理失敗不應阻止頻道刪除，只記錄警告
        logger.warn(`清理頻道 ${id} 附件檔案時發生錯誤:`, error)
      }

      // 刪除頻道（會級聯刪除 messages）
      await channelStore.delete(id)

      // 如果刪除的是當前選中的頻道，清除選擇
      if (uiStore.selectedChannel?.id === id) {
        uiStore.setSelectedChannel(null)
      }
      if (uiStore.currentChannel?.id === id) {
        uiStore.setCurrentChannel(null)
      }
    },

    toggleChannelFavorite: async (id: string) => {
      const channel = channelStore.items.find(ch => ch.id === id)
      if (!channel) return

      await channelStore.update(id, { is_favorite: !channel.is_favorite })
    },

    archiveChannel: async (id: string) => {
      const now = new Date().toISOString()
      await channelStore.update(id, {
        is_archived: true,
        archived_at: now,
        updated_at: now,
      })
      logger.log(`頻道 ${id} 已封存`)
    },

    unarchiveChannel: async (id: string) => {
      await channelStore.update(id, {
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      logger.log(`頻道 ${id} 已解除封存`)
    },

    selectChannel: async (channel: Channel | null) => {
      uiStore.setSelectedChannel(channel)
      uiStore.setCurrentChannel(channel)
    },

    updateChannelOrder: async (channelId: string, newOrder: number) => {
      await channelStore.update(channelId, { order: newOrder })
    },

    reorderChannels: (channels: Channel[]) => {
      // 批量更新順序 (createStore 會自動處理)
      channels.forEach((channel, index) => {
        channelStore.update(channel.id, { order: index }).catch(error => {
          logger.warn('[ChannelsStore] 更新頻道順序失敗:', error)
        })
      })
    },

    // ============================================
    // Channel Group 操作 (使用 createStore 的方法)
    // ============================================
    loadChannelGroups: async (workspaceId?: string) => {
      await channelGroupStore.fetchAll()
    },

    createChannelGroup: async (group: Omit<ChannelGroup, 'id' | 'created_at'>) => {
      const newGroup: ChannelGroup = {
        ...group,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      }
      await channelGroupStore.create(newGroup)
    },

    deleteChannelGroup: async (id: string) => {
      // 先更新該群組下的頻道，將 group_id 設為 null
      const channelsInGroup = channelStore.items.filter(ch => ch.group_id === id)

      // 批量更新頻道
      await Promise.all(
        channelsInGroup.map(channel => channelStore.update(channel.id, { group_id: null }))
      )

      // 刪除群組
      await channelGroupStore.delete(id)
    },

    toggleGroupCollapse: async (id: string) => {
      const group = channelGroupStore.items.find(g => g.id === id)
      if (!group) return

      await channelGroupStore.update(id, { is_collapsed: !group.is_collapsed })
    },

    // ============================================
    // 搜尋與過濾
    // ============================================
    setSearchQuery: uiStore.setSearchQuery,
    setChannelFilter: uiStore.setChannelFilter,

    // ============================================
    // Realtime 訂閱 (createStore 自動處理，但保留接口以防舊代碼呼叫)
    // ============================================
    subscribeToChannels: (workspaceId: string) => {
      // createStore handles subscriptions automatically
    },

    unsubscribeFromChannels: () => {
      // createStore handles unsubscriptions automatically
    },

    // ============================================
    // 錯誤處理
    // ============================================
    clearError: uiStore.clearError,
  }
}

/**
 * Hook 型別（方便使用）
 */
export type ChannelsStoreType = ReturnType<typeof useChannelsStore>
