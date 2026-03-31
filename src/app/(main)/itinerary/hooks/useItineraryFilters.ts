'use client'

import { useMemo } from 'react'
import type { Itinerary } from '@/stores/types'
import { stripHtml } from '@/lib/utils/string-utils'

interface UseItineraryFiltersProps {
  itineraries: Itinerary[]
  statusFilter: string
  searchTerm: string
  authorFilter: string
  viewMode: 'my' | 'all' | 'templates' | 'proposals'
  userId?: string
  isSuperAdmin: boolean
  isItineraryClosed: (itinerary: Itinerary) => boolean
}

export function useItineraryFilters({
  itineraries,
  statusFilter,
  searchTerm,
  authorFilter,
  viewMode,
  userId,
  isSuperAdmin,
  isItineraryClosed,
}: UseItineraryFiltersProps) {
  const filteredItineraries = useMemo(() => {
    let filtered = itineraries

    // 根據 viewMode 篩選
    if (viewMode === 'templates') {
      // 模板：只顯示模板
      filtered = filtered.filter(
        item => !item.archived_at &&
        (item.template_id || item.tour_code?.startsWith('TMPL-'))
      )
    } else if (viewMode === 'proposals') {
      // 提案：只顯示提案（PROP- 開頭的團號）
      filtered = filtered.filter(
        item => !item.template_id && !item.archived_at &&
        item.tour_code?.startsWith('PROP-')
      )
    } else {
      // 團體：顯示正式團（不含模板和提案）
      filtered = filtered.filter(
        item => !item.template_id && !item.archived_at &&
        !item.tour_code?.startsWith('PROP-') &&
        !item.tour_code?.startsWith('TMPL-')
      )
    }

    const effectiveAuthorFilter = authorFilter === '__mine__' ? userId : authorFilter
    if (effectiveAuthorFilter && effectiveAuthorFilter !== 'all') {
      filtered = filtered.filter(item => item.created_by === effectiveAuthorFilter)
    }

    if (isSuperAdmin) {
      const workspaceFilter =
        typeof window !== 'undefined' ? localStorage.getItem('itinerary_workspace_filter') : null
      if (workspaceFilter && workspaceFilter !== 'all') {
        filtered = filtered.filter(
          item => (item as Itinerary & { workspace_id?: string }).workspace_id === workspaceFilter
        )
      }
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        item =>
          stripHtml(item.title).toLowerCase().includes(searchLower) ||
          item.country.toLowerCase().includes(searchLower) ||
          item.city.toLowerCase().includes(searchLower) ||
          item.tour_code?.toLowerCase().includes(searchLower) ||
          item.status.toLowerCase().includes(searchLower) ||
          stripHtml(item.description).toLowerCase().includes(searchLower)
      )
    }

    // 未綁定團的行程排在前面
    filtered = filtered.sort((a, b) => {
      const aLinked = !!a.tour_id
      const bLinked = !!b.tour_id
      if (aLinked && !bLinked) return 1
      if (!aLinked && bLinked) return -1
      return 0
    })

    return filtered
  }, [
    itineraries,
    statusFilter,
    searchTerm,
    isItineraryClosed,
    authorFilter,
    viewMode,
    userId,
    isSuperAdmin,
  ])

  return { filteredItineraries }
}
