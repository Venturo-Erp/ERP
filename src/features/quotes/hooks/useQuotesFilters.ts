/**
 * Hook for filtering and searching quotes
 */

'use client'

import { useMemo } from 'react'
import { Quote } from '@/stores/types'

interface UseQuotesFiltersParams {
  quotes: Quote[]
  statusFilter: string
  searchTerm: string
  authorFilter?: string
}

export const useQuotesFilters = ({
  quotes,
  statusFilter,
  searchTerm,
  authorFilter,
}: UseQuotesFiltersParams) => {
  const filteredQuotes = useMemo(() => {
    // 分離置頂和非置頂報價單
    const pinnedQuotes = quotes.filter(quote => quote.is_pinned)
    const unpinnedQuotes = quotes.filter(quote => !quote.is_pinned)

    // 對非置頂報價單進行篩選
    const filteredUnpinned = unpinnedQuotes.filter(quote => {
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

      // 搜尋 - 搜尋所有文字欄位（包含 name 和 customer_name）
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        quote.name?.toLowerCase().includes(searchLower) ||
        quote.customer_name?.toLowerCase().includes(searchLower) ||
        quote.code?.toLowerCase().includes(searchLower) ||
        quote.status?.toLowerCase().includes(searchLower)

      // 作者篩選
      const matchesAuthor =
        !authorFilter ||
        authorFilter === 'all' ||
        ('created_by_name' in quote && quote.created_by_name === authorFilter) ||
        ('handler_name' in quote && quote.handler_name === authorFilter)

      return matchesStatus && matchesSearch && matchesAuthor
    })

    // 排序非置頂報價單（按建立時間）
    const sortedUnpinned = filteredUnpinned.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // 排序置頂報價單（按建立時間）
    const sortedPinned = pinnedQuotes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // 置頂報價單永遠在最前面
    return [...sortedPinned, ...sortedUnpinned]
  }, [quotes, statusFilter, searchTerm, authorFilter])

  return { filteredQuotes }
}
