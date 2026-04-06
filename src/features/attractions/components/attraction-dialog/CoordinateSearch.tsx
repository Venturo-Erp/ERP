'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, ExternalLink } from 'lucide-react'

interface CoordinateSearchProps {
  attractionName: string
  city?: string
  country?: string
  currentLat?: number
  currentLng?: number
  onCoordsUpdate: (lat: number, lng: number, address?: string) => void
  readOnly?: boolean
}

/**
 * 座標輸入工具
 * 支援：
 * 1. 手動輸入 lat/lng
 * 2. 貼上 Google Maps 連結自動解析
 */
export function CoordinateSearch({
  attractionName,
  currentLat,
  currentLng,
  onCoordsUpdate,
  readOnly = false,
}: CoordinateSearchProps) {
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [coordsPaste, setCoordsPaste] = useState('')

  // 從 Google Maps URL 解析座標
  const parseGoogleMapsUrl = (url: string): { lat: number; lng: number } | null => {
    try {
      // 格式: @lat,lng,zoom
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
      }
      // 格式: /maps/place/...!3dlat!4dlng
      const d3Match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
      if (d3Match) {
        return { lat: parseFloat(d3Match[1]), lng: parseFloat(d3Match[2]) }
      }
      // 格式: ll=lat,lng
      const llMatch = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (llMatch) {
        return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
      }
      return null
    } catch {
      return null
    }
  }

  const handleUrlPaste = () => {
    setUrlError('')
    const coords = parseGoogleMapsUrl(googleMapsUrl)
    if (coords) {
      onCoordsUpdate(coords.lat, coords.lng)
      setGoogleMapsUrl('')
    } else {
      setUrlError('無法解析座標，請確認連結格式')
    }
  }

  // 解析貼上的「緯度, 經度」格式
  const handleCoordsPaste = () => {
    setUrlError('')
    const match = coordsPaste.trim().match(/^(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)$/)
    if (!match) {
      setUrlError('格式錯誤，請輸入「緯度, 經度」（例如：12.9483, 100.8898）')
      return
    }
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setUrlError('座標超出範圍')
      return
    }
    onCoordsUpdate(lat, lng)
    setCoordsPaste('')
  }

  const handleManualInput = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setUrlError('請輸入有效的座標數值')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setUrlError('座標超出範圍')
      return
    }
    setUrlError('')
    onCoordsUpdate(lat, lng)
    setManualLat('')
    setManualLng('')
  }

  if (readOnly) {
    if (!currentLat || !currentLng) return null
    return (
      <a
        href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-status-info hover:underline"
      >
        <MapPin size={12} />
        {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
        <ExternalLink size={10} />
      </a>
    )
  }

  return (
    <div className="space-y-3">
      {/* 目前座標顯示 */}
      {currentLat && currentLng && (
        <div className="flex items-center gap-2 text-xs text-morandi-secondary">
          <MapPin size={12} className="text-morandi-gold" />
          <span>
            目前：{currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-status-info hover:underline flex items-center gap-1"
          >
            地圖確認 <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* 貼上「緯度, 經度」座標 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">貼上座標（格式：緯度, 經度）</p>
        <div className="flex gap-2">
          <Input
            value={coordsPaste}
            onChange={e => setCoordsPaste(e.target.value)}
            placeholder="例如：12.948332, 100.889793"
            className="text-xs"
            onKeyDown={e => e.key === 'Enter' && coordsPaste && handleCoordsPaste()}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCoordsPaste}
            disabled={!coordsPaste}
          >
            套用
          </Button>
        </div>
      </div>

      {/* 貼上 Google Maps 連結 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">貼上 Google Maps 連結自動解析座標</p>
        <div className="flex gap-2">
          <Input
            value={googleMapsUrl}
            onChange={e => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUrlPaste}
            disabled={!googleMapsUrl}
          >
            解析
          </Button>
        </div>
      </div>

      {/* 手動輸入 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">或手動輸入座標</p>
        <div className="flex gap-2">
          <Input
            value={manualLat}
            onChange={e => setManualLat(e.target.value)}
            placeholder="緯度（如 18.7883）"
            className="text-xs"
          />
          <Input
            value={manualLng}
            onChange={e => setManualLng(e.target.value)}
            placeholder="經度（如 98.9853）"
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleManualInput}
            disabled={!manualLat || !manualLng}
          >
            套用
          </Button>
        </div>
      </div>

      {urlError && <p className="text-xs text-status-danger">{urlError}</p>}

      {/* 提示 */}
      <p className="text-xs text-morandi-muted">
        提示：在 Google Maps 找到景點後，點「分享」複製連結，或直接複製網址列的 URL
      </p>
    </div>
  )
}
