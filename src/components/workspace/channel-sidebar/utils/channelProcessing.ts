import type { Channel, ChannelGroup } from '@/stores/workspace/types'

/**
 * 排序頻道（依名稱）
 */
function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
}

/**
 * 處理和分組頻道資料
 */
export function processChannels(
  filteredChannels: Channel[],
  channelGroups: ChannelGroup[],
  checkIsMember: (channelId: string) => boolean
) {
  // 1. 公司公告群組
  const announcementGroup = channelGroups.find(
    g => g.is_system && g.system_type === 'company_announcements'
  )
  const announcementChannels = announcementGroup
    ? sortChannels(
        filteredChannels.filter(ch => ch.group_id === announcementGroup.id && !ch.is_archived)
      )
    : []

  // 2. 我的最愛（獨立群組）
  const favoriteChannels = sortChannels(
    filteredChannels.filter(ch => ch.is_favorite && !ch.is_archived && checkIsMember(ch.id))
  )
  const favoriteChannelIds = new Set(favoriteChannels.map(ch => ch.id))

  // 3. 使用者自訂群組
  const userGroups = channelGroups
    .filter(g => !g.is_system)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const userGroupedChannels = userGroups.map(group => ({
    group,
    channels: sortChannels(
      filteredChannels.filter(
        ch =>
          ch.group_id === group.id &&
          !ch.is_archived &&
          checkIsMember(ch.id) &&
          !favoriteChannelIds.has(ch.id)
      )
    ),
  }))

  // 4. 未分組頻道（已加入但無群組，排除 DM 頻道）
  const ungroupedChannels = sortChannels(
    filteredChannels.filter(
      ch =>
        !ch.group_id &&
        !ch.is_archived &&
        checkIsMember(ch.id) &&
        !favoriteChannelIds.has(ch.id) &&
        ch.type !== 'direct' &&
        !ch.name.startsWith('dm:')
    )
  )

  // 5. 未加入的公開頻道
  const unjoinedChannels = sortChannels(
    filteredChannels.filter(ch => ch.type === 'public' && !ch.is_archived && !checkIsMember(ch.id))
  )

  // 6. 封存群組
  const archivedGroup = channelGroups.find(g => g.is_system && g.system_type === 'archived')
  const archivedChannels = archivedGroup
    ? sortChannels(
        filteredChannels.filter(ch => ch.is_archived || ch.group_id === archivedGroup.id)
      )
    : []

  return {
    announcementGroup,
    announcementChannels,
    favoriteChannels,
    userGroupedChannels,
    ungroupedChannels,
    unjoinedChannels,
    archivedGroup,
    archivedChannels,
  }
}
