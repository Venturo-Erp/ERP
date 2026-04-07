/**
 * Channels Store Facade
 * 整合多個 createStore，提供統一接口
 * 保持與舊版 channels-store 相同的 API
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { createChannelMember } from '@/data/entities/channel-members'
import {
  workspaceEntity,
  createWorkspace as createWorkspaceEntity,
  updateWorkspace as updateWorkspaceEntity,
  invalidateWorkspaces,
} from '@/data/entities/workspaces'
import { useChannelStore } from './channel-store'
import { useChannelGroupStore } from './channel-group-store'
import type { Workspace, Channel, ChannelGroup } from './types'
import { setCurrentWorkspaceFilter } from '@/lib/workspace-filter'
import { useAuthStore } from '../auth-store'
import { deleteAllFilesInFolder } from '@/services/storage'
import { logger } from '@/lib/utils/logger'

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
 *
 * 🔧 優化：使用 selector 避免不必要的 re-render
 */
export const useChannelsStore = () => {
  // 資料（使用 selector 避免整個 store re-render）
  const channelItems = useChannelStore(state => state.items)
  const channelLoading = useChannelStore(state => state.loading)
  const channelError = useChannelStore(state => state.error)
  const channelGroupItems = useChannelGroupStore(state => state.items)
  const channelGroupLoading = useChannelGroupStore(state => state.loading)
  const channelGroupError = useChannelGroupStore(state => state.error)
  const { items: workspaceItems, loading: workspaceLoading, error: workspaceError, refresh: refreshWorkspaces } = workspaceEntity.useList()

  // UI 狀態（使用 selectors 避免不必要的 re-render）
  const selectedChannel = useChannelsUIStore(state => state.selectedChannel)
  const currentChannel = useChannelsUIStore(state => state.currentChannel)
  const currentWorkspace = useChannelsUIStore(state => state.currentWorkspace)
  const currentWorkspaceId = useChannelsUIStore(state => state.currentWorkspaceId)
  const searchQuery = useChannelsUIStore(state => state.searchQuery)
  const channelFilter = useChannelsUIStore(state => state.channelFilter)
  const uiError = useChannelsUIStore(state => state.error)

  return {
    // ============================================
    // 資料 (來自 createStore)
    // ============================================
    workspaces: workspaceItems || [],
    channels: channelItems || [],
    channelGroups: channelGroupItems || [],

    // ============================================
    // UI 狀態
    // ============================================
    selectedChannel,
    currentChannel,
    currentWorkspace,
    currentWorkspaceId,
    searchQuery,
    channelFilter,

    // ============================================
    // Loading 和 Error
    // ============================================
    loading: channelLoading || channelGroupLoading || workspaceLoading,
    error: uiError || channelError || channelGroupError || workspaceError,

    // ============================================
    // Workspace 操作
    // ============================================
    loadWorkspaces: async () => {
      // SWR 會自動 fetch，這裡只需確保 refresh 並設定預設 workspace
      await refreshWorkspaces()

      // 🔥 使用 SWR 快取的 workspaceItems 來設定預設 workspace
      const workspaces = workspaceItems
      if (workspaces && workspaces.length > 0 && !useChannelsUIStore.getState().currentWorkspace) {
        const user = useAuthStore.getState().user
        const userWorkspaceId = user?.workspace_id

        let selectedWorkspace = workspaces[0] // 預設第一個

        if (userWorkspaceId) {
          const userWorkspace = workspaces.find(ws => ws.id === userWorkspaceId)
          if (userWorkspace) {
            selectedWorkspace = userWorkspace
          }
        }

        useChannelsUIStore.getState().setCurrentWorkspace(selectedWorkspace as Workspace)
        // 🔥 設定 workspace filter
        setCurrentWorkspaceFilter(selectedWorkspace.id)
      }
    },

    setCurrentWorkspace: (workspace: Workspace | string | null) => {
      if (typeof workspace === 'string') {
        // 如果傳入 workspace ID，設定 ID
        useChannelsUIStore.getState().setCurrentWorkspaceId(workspace)
        // 嘗試從列表中找到對應的 workspace 物件
        const ws = workspaceItems.find(w => w.id === workspace)
        useChannelsUIStore.getState().setCurrentWorkspace((ws as Workspace) || null)
        // 🔥 設定 workspace filter，讓 fetchAll 可以正確過濾
        setCurrentWorkspaceFilter(workspace)
      } else {
        // 如果傳入 workspace 物件
        useChannelsUIStore.getState().setCurrentWorkspace(workspace)
        const workspaceId = workspace?.id || null
        useChannelsUIStore.getState().setCurrentWorkspaceId(workspaceId)
        // 🔥 設定 workspace filter，讓 fetchAll 可以正確過濾
        setCurrentWorkspaceFilter(workspaceId)
      }
    },

    createWorkspace: async (data: Parameters<typeof createWorkspaceEntity>[0]) => {
      const result = await createWorkspaceEntity(data)
      await invalidateWorkspaces()
      return result
    },
    updateWorkspace: async (id: string, data: Parameters<typeof updateWorkspaceEntity>[1]) => {
      const result = await updateWorkspaceEntity(id, data)
      await invalidateWorkspaces()
      return result
    },

    // ============================================
    // Channel 操作 (使用 createStore 的方法)
    // ============================================
    loadChannels: async (_workspaceId?: string) => {
      // workspaceId 參數保留以維持 API 兼容性，實際過濾由 RLS 處理
      await useChannelStore.getState().fetchAll()
    },

    createChannel: async (channel: Omit<Channel, 'id' | 'created_at'>) => {
      const newChannel: Channel = {
        ...channel,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      }
      await useChannelStore.getState().create(newChannel)

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
      await useChannelStore.getState().update(id, updates)
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
      await useChannelStore.getState().delete(id)

      // 如果刪除的是當前選中的頻道，清除選擇
      if (useChannelsUIStore.getState().selectedChannel?.id === id) {
        useChannelsUIStore.getState().setSelectedChannel(null)
      }
      if (useChannelsUIStore.getState().currentChannel?.id === id) {
        useChannelsUIStore.getState().setCurrentChannel(null)
      }
    },

    toggleChannelFavorite: async (id: string) => {
      const channel = useChannelStore.getState().items.find(ch => ch.id === id)
      if (!channel) return

      await useChannelStore.getState().update(id, { is_favorite: !channel.is_favorite })
    },

    archiveChannel: async (id: string) => {
      const now = new Date().toISOString()
      await useChannelStore.getState().update(id, {
        is_archived: true,
        archived_at: now,
        updated_at: now,
      })
      logger.log(`頻道 ${id} 已封存`)
    },

    unarchiveChannel: async (id: string) => {
      await useChannelStore.getState().update(id, {
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      logger.log(`頻道 ${id} 已解除封存`)
    },

    selectChannel: async (channel: Channel | null) => {
      useChannelsUIStore.getState().setSelectedChannel(channel)
      useChannelsUIStore.getState().setCurrentChannel(channel)
    },

    updateChannelOrder: async (channelId: string, newOrder: number) => {
      await useChannelStore.getState().update(channelId, { order: newOrder })
    },

    reorderChannels: (channels: Channel[]) => {
      // 批量更新順序 (createStore 會自動處理)
      channels.forEach((channel, index) => {
        useChannelStore
          .getState()
          .update(channel.id, { order: index })
          .catch(error => {
            logger.warn('[ChannelsStore] 更新頻道順序失敗:', error)
          })
      })
    },

    // ============================================
    // Channel Group 操作 (使用 createStore 的方法)
    // ============================================
    loadChannelGroups: async (workspaceId?: string) => {
      await useChannelGroupStore.getState().fetchAll()
    },

    createChannelGroup: async (group: Omit<ChannelGroup, 'id' | 'created_at'>) => {
      const newGroup: ChannelGroup = {
        ...group,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      }
      await useChannelGroupStore.getState().create(newGroup)
    },

    deleteChannelGroup: async (id: string) => {
      // 先更新該群組下的頻道，將 group_id 設為 null
      const channelsInGroup = useChannelStore.getState().items.filter(ch => ch.group_id === id)

      // 批量更新頻道
      await Promise.all(
        channelsInGroup.map(channel =>
          useChannelStore.getState().update(channel.id, { group_id: null })
        )
      )

      // 刪除群組
      await useChannelGroupStore.getState().delete(id)
    },

    toggleGroupCollapse: async (id: string) => {
      const group = useChannelGroupStore.getState().items.find(g => g.id === id)
      if (!group) return

      await useChannelGroupStore.getState().update(id, { is_collapsed: !group.is_collapsed })
    },

    // ============================================
    // 搜尋與過濾
    // ============================================
    setSearchQuery: useChannelsUIStore.getState().setSearchQuery,
    setChannelFilter: useChannelsUIStore.getState().setChannelFilter,

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
    clearError: useChannelsUIStore.getState().clearError,
  }
}

/**
 * Hook 型別（方便使用）
 */
export type ChannelsStoreType = ReturnType<typeof useChannelsStore>
