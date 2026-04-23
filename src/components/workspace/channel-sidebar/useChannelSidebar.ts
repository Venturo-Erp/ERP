import { useState, useMemo, useEffect } from 'react'
import { useTabPermissions } from '@/lib/permissions'
import type { Channel } from '@/stores/workspace-store'

export function useChannelSidebar(channels: Channel[], searchQuery: string, channelFilter: string) {
  const { canWrite } = useTabPermissions()

  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    ungrouped: true,
  })

  // workspace 模組無 tab、用 module-level 寫入權判定能否管理成員（admin 已 backfill）
  const canManageMembers = useMemo(() => canWrite('workspace'), [canWrite])

  // 篩選頻道
  const filteredChannels = useMemo(() => {
    let filtered = channels

    // 搜尋篩選
    if (searchQuery) {
      filtered = filtered.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // 狀態篩選
    if (channelFilter === 'starred') {
      filtered = filtered.filter(ch => ch.is_favorite)
    }

    // 根據 order 排序
    filtered = [...filtered].sort((a, b) => {
      const orderA = a.order ?? 9999
      const orderB = b.order ?? 9999
      return orderA - orderB
    })

    return filtered
  }, [channels, searchQuery, channelFilter])

  return {
    expandedSections,
    setExpandedSections,
    canManageMembers,
    filteredChannels,
  }
}
