/**
 * Members Store Facade
 * 整合 ChannelMember Store (createStore)，提供統一接口
 * 保持與舊版 members-store 相同的 API
 *
 * 注意：
 * - 主要使用 API endpoint（包含 profile 資訊）
 * - createStore 作為快取層和離線支援
 */

import { create } from 'zustand'
import {
  fetchChannelMembers,
  removeChannelMember as removeChannelMemberService,
  type ChannelMember,
} from '@/services/workspace-members'

// UUID 驗證正則
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

/**
 * Members UI 狀態 (不需要同步到 Supabase 的狀態)
 */
interface MembersUIState {
  channelMembers: Record<string, ChannelMember[]>
  error: string | null

  // Internal state management
  setChannelMembers: (channelId: string, members: ChannelMember[]) => void
  setError: (error: string | null) => void
  clearError: () => void
}

/**
 * UI 狀態 Store (純前端狀態)
 */
const useMembersUIStore = create<MembersUIState>(set => ({
  channelMembers: {},
  error: null,

  setChannelMembers: (channelId, members) => {
    set(state => ({
      channelMembers: {
        ...state.channelMembers,
        [channelId]: members,
      },
    }))
  },

  setError: error => set({ error }),
  clearError: () => set({ error: null }),
}))

/**
 * Members Store Facade
 * 使用 API endpoint（包含 profile 資訊）
 * 保持與舊版相同的 API
 *
 * 未來可以整合 ChannelMemberStore (createStore) 作為快取層
 */
export const useMembersStore = () => {
  const uiStore = useMembersUIStore()

  return {
    // ============================================
    // 資料
    // ============================================
    channelMembers: uiStore.channelMembers,
    error: uiStore.error,

    // ============================================
    // Member 操作
    // ============================================
    loadChannelMembers: async (workspaceId: string, channelId: string) => {
      // 跳過假資料（不是有效的 UUID）
      if (!isValidUUID(workspaceId) || !isValidUUID(channelId)) {
        uiStore.setChannelMembers(channelId, [])
        return
      }

      try {
        const members = await fetchChannelMembers(workspaceId, channelId)
        uiStore.setChannelMembers(channelId, members)
      } catch (error) {
        uiStore.setError(error instanceof Error ? error.message : 'Failed to load channel members')
      }
    },

    removeChannelMember: async (workspaceId: string, channelId: string, memberId: string) => {
      try {
        await removeChannelMemberService(workspaceId, channelId, memberId)

        // 更新 UI 狀態
        const currentMembers = uiStore.channelMembers[channelId] || []
        uiStore.setChannelMembers(
          channelId,
          currentMembers.filter(member => member.id !== memberId)
        )
      } catch (error) {
        uiStore.setError(error instanceof Error ? error.message : 'Failed to remove channel member')
      }
    },

    clearError: uiStore.clearError,
  }
}

/**
 * Hook 型別（方便使用）
 */
type MembersStoreType = ReturnType<typeof useMembersStore>
