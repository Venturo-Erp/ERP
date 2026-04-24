'use client'

/**
 * PexelsPicker - Pexels 圖庫選擇器
 *
 * 提供免費圖庫搜尋與選擇功能
 * 需要設定 NEXT_PUBLIC_PEXELS_API_KEY 環境變數
 */

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Search, X, ExternalLink, Download, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  searchPexelsPhotos,
  isPexelsConfigured,
  PEXELS_TRAVEL_KEYWORDS,
  type PexelsPhoto,
} from '@/lib/pexels'
const DESIGNER_LABELS = {
  SETTINGS_9925: '請在 .env.local 設定 NEXT_PUBLIC_PEXELS_API_KEY',
  LABEL_1754: '前往 Pexels 申請免費 API Key',
  SEARCH_2404: '搜尋圖片（英文效果較佳）...',
  SEARCH_2692: '搜尋中...',
  SEARCH: '搜尋',
  SEARCH_6536: '熱門搜尋',
  NOT_FOUND_2874: '找不到符合的圖片',
  SEARCH_2947: '輸入關鍵字搜尋圖片',
}

interface PexelsPickerProps {
  onSelectImage: (imageUrl: string, attribution?: { name: string; link: string }) => void
}

export function PexelsPicker({ onSelectImage }: PexelsPickerProps) {
  const [search, setSearch] = useState('')
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const isConfigured = isPexelsConfigured()

  // 執行搜尋
  const handleSearch = useCallback(async (query: string, pageNum: number = 1) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await searchPexelsPhotos(query, {
        page: pageNum,
        perPage: 80, // Pexels 上限
        orientation: 'landscape',
      })

      if (pageNum === 1) {
        setPhotos(result.photos)
      } else {
        setPhotos(prev => [...prev, ...result.photos])
      }

      setTotalResults(result.total_results)
      setPage(pageNum)
      setHasSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜尋失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  // 按 Enter 搜尋
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch(search, 1)
      }
    },
    [search, handleSearch]
  )

  // 選擇圖片
  const handleSelect = useCallback(
    (photo: PexelsPhoto) => {
      // 使用 large 尺寸（較適合設計用途）
      onSelectImage(photo.src.large, {
        name: photo.photographer,
        link: photo.photographer_url,
      })
    },
    [onSelectImage]
  )

  // 載入更多
  const loadMore = useCallback(() => {
    const hasMore = photos.length < totalResults
    if (hasMore && !loading) {
      handleSearch(search, page + 1)
    }
  }, [photos.length, totalResults, loading, search, page, handleSearch])

  // 快速關鍵字
  const handleQuickKeyword = useCallback(
    (keyword: string) => {
      setSearch(keyword)
      handleSearch(keyword, 1)
    },
    [handleSearch]
  )

  // 如果未設定 API
  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-morandi-container flex items-center justify-center">
          <ExternalLink size={24} className="text-morandi-secondary" />
        </div>
        <h3 className="font-medium text-morandi-primary mb-2">Pexels API 未設定</h3>
        <p className="text-sm text-morandi-secondary mb-4">{DESIGNER_LABELS.SETTINGS_9925}</p>
        <a
          href="https://www.pexels.com/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-morandi-gold hover:underline flex items-center gap-1"
        >
          {DESIGNER_LABELS.LABEL_1754}
          <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 搜尋框 */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-morandi-secondary" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={DESIGNER_LABELS.SEARCH_2404}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                setPhotos([])
                setHasSearched(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-morandi-secondary hover:text-morandi-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 搜尋按鈕 */}
        <Button
          size="sm"
          className="w-full mt-2 h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover"
          onClick={() => handleSearch(search, 1)}
          disabled={!search.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="mr-1 animate-spin" />
              {DESIGNER_LABELS.SEARCH_2692}
            </>
          ) : (
            <>
              <Search size={12} className="mr-1" />
              {DESIGNER_LABELS.SEARCH}
            </>
          )}
        </Button>
      </div>

      {/* 快速關鍵字 */}
      {!hasSearched && (
        <div className="p-2 border-b border-border">
          <p className="text-[10px] text-morandi-secondary mb-1.5">{DESIGNER_LABELS.SEARCH_6536}</p>
          <div className="flex flex-wrap gap-1">
            {PEXELS_TRAVEL_KEYWORDS.en.slice(0, 10).map((keyword, i) => (
              <button
                key={keyword}
                onClick={() => handleQuickKeyword(keyword)}
                className="px-2 py-0.5 text-[10px] rounded bg-morandi-container/50 hover:bg-morandi-container text-morandi-secondary hover:text-morandi-primary transition-colors"
              >
                {PEXELS_TRAVEL_KEYWORDS.zh[i]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && <div className="p-3 bg-morandi-red/10 text-morandi-red text-sm">{error}</div>}

      {/* 圖片列表 */}
      <div className="flex-1 overflow-auto">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 p-2">
            {photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => handleSelect(photo)}
                className="relative aspect-[4/3] rounded overflow-hidden group hover:ring-2 hover:ring-morandi-gold transition-all"
              >
                <Image
                  src={photo.src.medium}
                  alt={photo.alt || 'Pexels photo'}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={20} className="text-white" />
                  </div>
                </div>
                {/* 攝影師標註 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white truncate">by {photo.photographer}</p>
                </div>
              </button>
            ))}
          </div>
        ) : hasSearched && !loading ? (
          <div className="p-4 text-center text-sm text-morandi-secondary">
            {DESIGNER_LABELS.NOT_FOUND_2874}
          </div>
        ) : !hasSearched ? (
          <div className="p-4 text-center text-sm text-morandi-secondary">
            {DESIGNER_LABELS.SEARCH_2947}
          </div>
        ) : null}

        {/* 載入更多 */}
        {photos.length < totalResults && photos.length > 0 && (
          <div className="p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? '載入中...' : '載入更多'}
            </Button>
          </div>
        )}
      </div>

      {/* Pexels 標註 */}
      <div className="p-2 border-t border-border text-center">
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-morandi-secondary hover:text-morandi-gold"
        >
          Photos by Pexels
        </a>
      </div>
    </div>
  )
}
