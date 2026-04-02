import { useState, useMemo, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { Channel } from '@/stores/workspace-store'

export function useChannelSidebar(channels: Channel[], searchQuery: string, channelFilter: string) {
  const { user } = useAuthStore()

  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    ungrouped: true,
  })

  const isAdmin = useAuthStore(state => state.isAdmin)

  const canManageMembers = useMemo(() => {
    if (!user) return false
    if (isAdmin) return true
    const permissions = user.permissions || []
    return (
      permissions.includes('workspace:manage_members') ||
      permissions.includes('workspace:manage')
    )
  }, [user, isAdmin])

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
