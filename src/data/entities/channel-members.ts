'use client'

/**
 * Channel Members Entity - 頻道成員管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface ChannelMember {
  id: string
  channel_id: string
  employee_id: string
  role: string
  status: string
  workspace_id: string
  created_at: string | null
  updated_at: string | null
}

export const channelMemberEntity = createEntityHook<ChannelMember>('channel_members', {
  workspaceScoped: true,
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: true },
  },
  slim: {
    select: 'id,channel_id,employee_id,role,status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useChannelMembers = channelMemberEntity.useList
export const useChannelMembersSlim = channelMemberEntity.useListSlim
export const useChannelMember = channelMemberEntity.useDetail
export const useChannelMembersPaginated = channelMemberEntity.usePaginated
export const useChannelMemberDictionary = channelMemberEntity.useDictionary

export const createChannelMember = channelMemberEntity.create
export const updateChannelMember = channelMemberEntity.update
export const deleteChannelMember = channelMemberEntity.delete
export const invalidateChannelMembers = channelMemberEntity.invalidate
