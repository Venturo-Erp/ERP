'use client'

/**
 * Channel Members Entity - 頻道成員管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

interface ChannelMember {
  id: string
  channel_id: string
  employee_id: string
  role: string
  status: string
  workspace_id: string
  created_at: string | null
  updated_at: string | null
}

const channelMemberEntity = createEntityHook<ChannelMember>('channel_members', {
  workspaceScoped: true,
  list: {
    select: 'id,workspace_id,channel_id,employee_id,role,status,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: true },
  },
  slim: {
    select: 'id,channel_id,employee_id,role,status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

const useChannelMembers = channelMemberEntity.useList
const useChannelMembersSlim = channelMemberEntity.useListSlim
const useChannelMember = channelMemberEntity.useDetail
const useChannelMembersPaginated = channelMemberEntity.usePaginated
const useChannelMemberDictionary = channelMemberEntity.useDictionary

export const createChannelMember = channelMemberEntity.create
const updateChannelMember = channelMemberEntity.update
const deleteChannelMember = channelMemberEntity.delete
const invalidateChannelMembers = channelMemberEntity.invalidate
