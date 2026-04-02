'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, MapPin, User, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateCompact } from '@/lib/utils/format-date'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { MOBILE_LABELS } from './constants/labels'

interface SearchResult {
  type: 'tour' | 'member'
  id: string
  title: string
  subtitle: string
  tourCode?: string
  tourId?: string
}

interface GlobalSearchProps {
  autoFocus?: boolean
  onResultClick?: () => void
  className?: string
}

// 從 localStorage 讀取最近搜尋
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('venturo_recent_searches')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// 儲存最近搜尋
function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  try {
    const recent = getRecentSearches()
    const filtered = recent.filter(s => s !== query)
    const updated = [query, ...filtered].slice(0, 5)
    localStorage.setItem('venturo_recent_searches', JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function GlobalSearch({ autoFocus, onResultClick, className }: GlobalSearchProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)

  // 載入最近搜尋
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // 自動聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // 搜尋邏輯
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)

    try {
      const [toursRes, membersRes] = await Promise.all([
        // 搜尋團：團號、團名
        supabase
          .from('tours')
          .select('id, code, name, departure_date, current_participants')
          .or(`code.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .order('departure_date', { ascending: false })
          .limit(5),

        // 搜尋成員：姓名、護照號
        supabase
          .from('order_members')
          .select('id, chinese_name, passport_number, order_id')
          .or(`chinese_name.ilike.%${searchQuery}%,passport_number.ilike.%${searchQuery}%`)
          .limit(10),
      ])

      const searchResults: SearchResult[] = []

      // 格式化團結果
      if (toursRes.data) {
        toursRes.data.forEach(tour => {
          searchResults.push({
            type: 'tour',
            id: tour.id,
            title: tour.code,
            subtitle: `${tour.name} | ${tour.current_participants || 0}人 | ${formatDateCompact(tour.departure_date)}`,
          })
        })
      }

      // 格式化成員結果
      if (membersRes.data) {
        membersRes.data.forEach(member => {
          searchResults.push({
            type: 'member',
            id: member.id,
            title: member.chinese_name || '未命名',
            subtitle: member.passport_number || '',
          })
        })
      }

      setResults(searchResults)
    } catch (error) {
      logger.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 防抖搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // 處理結果點擊
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query)

    if (result.type === 'tour') {
      router.push(`/m/tours/${result.id}`)
    } else if (result.type === 'member') {
      router.push(`/m/members/${result.id}`)
    }

    setQuery('')
    setShowResults(false)
    onResultClick?.()
  }

  // 處理最近搜尋點擊
  const handleRecentClick = (search: string) => {
    setQuery(search)
    setShowResults(true)
  }

  // 清除搜尋
  const handleClear = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      {/* 搜尋輸入框 */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder={MOBILE_LABELS.SEARCH_3289}
          className="w-full pl-10 pr-10 py-3 bg-morandi-container/50 border border-border rounded-xl
                     text-morandi-primary placeholder:text-morandi-secondary/60
                     focus:outline-none focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold
                     transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-morandi-container rounded-full"
          >
            <X size={16} className="text-morandi-secondary" />
          </button>
        )}
      </div>

      {/* 搜尋結果 */}
      {showResults && (
        <div className="mt-2">
          {/* 載入中 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-morandi-gold" />
            </div>
          )}

          {/* 搜尋結果列表 */}
          {!isLoading && query && results.length > 0 && (
            <div className="space-y-1">
              {/* 團結果 */}
              {results.filter(r => r.type === 'tour').length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-morandi-secondary px-1 mb-1">
                    旅遊團 ({results.filter(r => r.type === 'tour').length})
                  </div>
                  {results
                    .filter(r => r.type === 'tour')
                    .map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-morandi-container/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-status-info/10 flex items-center justify-center">
                          <MapPin size={18} className="text-status-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-morandi-primary truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-morandi-secondary truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-morandi-secondary/50" />
                      </button>
                    ))}
                </div>
              )}

              {/* 成員結果 */}
              {results.filter(r => r.type === 'member').length > 0 && (
                <div>
                  <div className="text-xs font-medium text-morandi-secondary px-1 mb-1">
                    成員 ({results.filter(r => r.type === 'member').length})
                  </div>
                  {results
                    .filter(r => r.type === 'member')
                    .map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-morandi-container/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-morandi-container flex items-center justify-center">
                          <User size={18} className="text-morandi-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-morandi-primary truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-morandi-secondary truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-morandi-secondary/50" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 無結果 */}
          {!isLoading && query && results.length === 0 && (
            <div className="text-center py-8 text-morandi-secondary">
              找不到符合「{query}」的結果
            </div>
          )}

          {/* 最近搜尋 (當沒有輸入時顯示) */}
          {!query && recentSearches.length > 0 && (
            <div>
              <div className="text-xs font-medium text-morandi-secondary px-1 mb-2">
                {MOBILE_LABELS.SEARCH_483}
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-morandi-container/50 rounded-full
                               text-sm text-morandi-primary hover:bg-morandi-container transition-colors"
                  >
                    <Clock size={12} className="text-morandi-secondary" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
