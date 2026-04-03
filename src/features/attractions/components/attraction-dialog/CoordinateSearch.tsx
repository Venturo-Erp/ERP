'use client'

import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getPlaceCoordinates, extractCoordsFromUrl, isValidCoordinates } from '@/lib/google-places'
import type { PlaceCoordinates } from '@/lib/google-places'

interface CoordinateSearchProps {
  attractionName: string
  city?: string
  country?: string
  currentLat?: number
  currentLng?: number
  onCoordsUpdate: (lat: number, lng: number, address?: string) => void
  readOnly?: boolean
}

export function CoordinateSearch({
  attractionName,
  city = '清邁',
  country = 'Thailand',
  currentLat,
  currentLng,
  onCoordsUpdate,
  readOnly = false,
}: CoordinateSearchProps) {
  const [searching, setSearching] = useState(false)
  const [suggestedCoords, setSuggestedCoords] = useState<PlaceCoordinates | null>(null)
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  // 自動搜尋（debounced）
  useEffect(() => {
    if (!attractionName || readOnly) {
      setSuggestedCoords(null)
      return
    }

    // 如果已有座標，不自動搜尋
    if (isValidCoordinates(currentLat, currentLng)) {
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 1000) // 1 秒 debounce

    return () => clearTimeout(timer)
  }, [attractionName, city, country, readOnly, currentLat, currentLng])

  const handleSearch = useCallback(async () => {
    if (!attractionName || readOnly) return

    setSearching(true)
    try {
      const coords = await getPlaceCoordinates(attractionName, city, country)
      setSuggestedCoords(coords)
    } catch (error) {
      console.error('搜尋座標失敗:', error)
    } finally {
      setSearching(false)
    }
  }, [attractionName, city, country, readOnly])

  const handleApplyCoords = () => {
    if (suggestedCoords) {
      onCoordsUpdate(suggestedCoords.lat, suggestedCoords.lng, suggestedCoords.address)
      setSuggestedCoords(null)
    }
  }

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setGoogleMapsUrl(url)
    setUrlError('')

    if (!url) return

    const coords = extractCoordsFromUrl(url)
    if (coords) {
      onCoordsUpdate(coords.lat, coords.lng)
      setGoogleMapsUrl('')
      setUrlError('')
    } else if (url.includes('maps.google') || url.includes('goo.gl/maps')) {
      setUrlError('無法從 URL 解析座標，請確認格式')
    }
  }

  const hasValidCoords = isValidCoordinates(currentLat, currentLng)

  if (readOnly) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">緯度</label>
          <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
            {currentLat?.toFixed(6) || '-'}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">經度</label>
          <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
            {currentLng?.toFixed(6) || '-'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 座標輸入區 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">
            緯度 {hasValidCoords && <span className="text-green-600">✓</span>}
          </label>
          <Input
            type="number"
            step="0.000001"
            value={currentLat ?? ''}
            onChange={e => onCoordsUpdate(parseFloat(e.target.value) || 0, currentLng ?? 0)}
            placeholder="18.788015"
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            經度 {hasValidCoords && <span className="text-green-600">✓</span>}
          </label>
          <Input
            type="number"
            step="0.000001"
            value={currentLng ?? ''}
            onChange={e => onCoordsUpdate(currentLat ?? 0, parseFloat(e.target.value) || 0)}
            placeholder="98.985934"
          />
        </div>
      </div>

      {/* 自動搜尋建議 */}
      {suggestedCoords && !hasValidCoords && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 text-sm">
              <div className="font-medium text-blue-900 dark:text-blue-100">找到座標：</div>
              <div className="text-blue-700 dark:text-blue-300 mt-1">
                {suggestedCoords.name}
              </div>
              <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                {suggestedCoords.lat.toFixed(6)}, {suggestedCoords.lng.toFixed(6)}
              </div>
              <div className="text-blue-600/80 dark:text-blue-400/80 text-xs mt-0.5">
                {suggestedCoords.address}
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleApplyCoords}
              className="shrink-0"
            >
              使用此座標
            </Button>
          </div>
        </div>
      )}

      {/* 手動搜尋按鈕 */}
      {!hasValidCoords && !suggestedCoords && attractionName && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSearch}
          disabled={searching}
          className="w-full"
        >
          {searching ? '搜尋中...' : '🔍 搜尋座標'}
        </Button>
      )}

      {/* Google Maps URL 貼上 */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          或貼上 Google Maps 連結
        </label>
        <Input
          value={googleMapsUrl}
          onChange={handleUrlPaste}
          placeholder="https://maps.google.com/?q=18.788015,98.985934"
          className={urlError ? 'border-red-500' : ''}
        />
        {urlError && (
          <p className="text-xs text-red-500 mt-1">{urlError}</p>
        )}
      </div>

      {/* 說明文字 */}
      {!hasValidCoords && (
        <p className="text-xs text-muted-foreground">
          💡 輸入景點名稱後會自動搜尋座標，或直接貼上 Google Maps 連結
        </p>
      )}
    </div>
  )
}
