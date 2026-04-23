'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Plus,
  Check,
  Pencil,
  FileText,
  Loader2,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import { useItineraries, createItinerary, updateItinerary, useCountries, useCities } from '@/data'
import type { Tour, Itinerary } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { stripHtml } from '@/lib/utils/string-utils'
import { DOCUMENTS_LABELS } from './constants/labels'
import { getWorkspaceTagline } from '@/lib/workspace-helpers'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

// 判斷是否為已確認版本（狀態為結案）
function isConfirmedItinerary(itinerary: Itinerary): boolean {
  return itinerary.status === TOUR_STATUS.CLOSED
}

interface ItineraryVersionPickerProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

export function ItineraryVersionPicker({ isOpen, onClose, tour }: ItineraryVersionPickerProps) {
  const router = useRouter()
  const { items: itineraries, loading } = useItineraries()
  const { items: countries } = useCountries()
  const { items: cities } = useCities()
  const { user: currentUser } = useAuthStore()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // SWR 自動載入 regions 資料，不需要手動 fetchAll

  // 編輯時自動聚焦
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // 已關聯此旅遊團的行程表
  const linkedItineraries = itineraries.filter(
    i => i.tour_id === tour.id && !(i as { _deleted?: boolean })._deleted
  )

  // 根據 country_id 和 airport_code 查詢名稱（SSOT，不再 fallback 到 tour.location）
  const countryName = (() => {
    if (!tour.country_id) return ''
    const country = countries.find(c => c.id === tour.country_id)
    return country?.name || ''
  })()

  const cityName = (() => {
    if (!tour.airport_code) return ''
    const city = cities.find(c => c.id === tour.airport_code)
    return city?.name || ''
  })()

  // 計算天數
  const calculateDays = () => {
    if (!tour.departure_date || !tour.return_date) return 5
    const start = new Date(tour.departure_date)
    const end = new Date(tour.return_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, Math.min(diffDays, 30))
  }

  // 初始化每日行程
  const initializeDailyItinerary = () => {
    const days = calculateDays()
    return Array.from({ length: days }, (_, idx) => {
      let dateLabel = ''
      if (tour.departure_date) {
        const date = new Date(tour.departure_date)
        date.setDate(date.getDate() + idx)
        const weekdays = ['日', '一', '二', '三', '四', '五', '六']
        dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
      }

      const isFirst = idx === 0
      const isLast = idx === days - 1
      const defaultTitle = isFirst ? '抵達目的地' : isLast ? '返回台灣' : `第 ${idx + 1} 天行程`

      return {
        dayLabel: `Day ${idx + 1}`,
        date: dateLabel,
        title: defaultTitle,
        highlight: '',
        description: '',
        activities: [],
        recommendations: [],
        meals: { breakfast: '', lunch: '', dinner: '' },
        accommodation: '',
        images: [],
      }
    })
  }

  // 建立新行程表
  const handleCreate = async () => {
    try {
      setIsCreating(true)

      const authorName = currentUser?.display_name || currentUser?.chinese_name || ''
      const formattedDailyItinerary = initializeDailyItinerary()

      const newItinerary = await createItinerary({
        title: '未命名行程表',
        tour_id: tour.id,
        tour_code: tour.code,
        status: '草稿',
        author_name: authorName,
        departure_date: tour.departure_date || '',
        city: cityName,
        daily_itinerary: formattedDailyItinerary,
        tagline: getWorkspaceTagline(),
        subtitle: '',
        description: '',
        cover_image: '',
        country: countryName,
        features: [],
        focus_cards: [],
        outbound_flight: (() => {
          const flight = Array.isArray(tour.outbound_flight)
            ? tour.outbound_flight[0]
            : tour.outbound_flight
          return flight
            ? {
                airline: flight.airline || '',
                flightNumber: flight.flightNumber || '',
                departureAirport: flight.departureAirport || 'TPE',
                departureTime: flight.departureTime || '',
                arrivalAirport: flight.arrivalAirport || '',
                arrivalTime: flight.arrivalTime || '',
                departureDate: flight.departureDate || '',
              }
            : undefined
        })(),
        return_flight: (() => {
          const flight = Array.isArray(tour.return_flight)
            ? tour.return_flight[0]
            : tour.return_flight
          return flight
            ? {
                airline: flight.airline || '',
                flightNumber: flight.flightNumber || '',
                departureAirport: flight.departureAirport || '',
                departureTime: flight.departureTime || '',
                arrivalAirport: flight.arrivalAirport || 'TPE',
                arrivalTime: flight.arrivalTime || '',
                departureDate: flight.departureDate || '',
              }
            : undefined
        })(),
      } as unknown as Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>)

      if (newItinerary?.id) {
        onClose()
        router.push(`/itinerary/new?itinerary_id=${newItinerary.id}`)
      }
    } catch (error) {
      logger.error('建立行程表失敗:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // 進入編輯
  const handleView = (itinerary: Itinerary) => {
    onClose()
    router.push(`/itinerary/new?itinerary_id=${itinerary.id}`)
  }

  // 開始 inline 改名
  const handleStartRename = (e: React.MouseEvent, itinerary: Itinerary) => {
    e.stopPropagation()
    setEditingId(itinerary.id)
    setEditingName(stripHtml(itinerary.title) || '')
  }

  // 儲存改名
  const handleSaveRename = async (itinerary: Itinerary) => {
    if (!editingName.trim()) {
      setEditingId(null)
      return
    }

    try {
      await updateItinerary(itinerary.id, { title: editingName.trim() })
    } catch (error) {
      logger.error('更新名稱失敗:', error)
    }

    setEditingId(null)
  }

  // 按 Enter 或 Escape
  const handleKeyDown = (e: React.KeyboardEvent, itinerary: Itinerary) => {
    if (e.key === 'Enter') {
      handleSaveRename(itinerary)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-[400px] max-h-[500px] overflow-hidden p-0">
        <DialogHeader className="px-4 py-3 border-b border-border bg-morandi-container/20">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-morandi-primary" />
            <DialogTitle className="font-medium text-morandi-primary">
              {DOCUMENTS_LABELS.MANAGE_6774}
            </DialogTitle>
            <span className="text-sm text-morandi-secondary">- {tour.code}</span>
          </div>
        </DialogHeader>

        {/* 內容區 */}
        <div className="flex flex-col">
          <div className="flex-1 overflow-y-auto max-h-[380px] p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-morandi-secondary" />
              </div>
            ) : linkedItineraries.length === 0 ? (
              <div className="text-center py-8 text-sm text-morandi-secondary">
                {DOCUMENTS_LABELS.EMPTY_3128}
              </div>
            ) : (
              <div className="space-y-1">
                {linkedItineraries.map(itinerary => (
                  <div
                    key={itinerary.id}
                    onClick={() => handleView(itinerary)}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                      'hover:bg-morandi-primary/5 border border-transparent hover:border-morandi-primary/20',
                      isConfirmedItinerary(itinerary) &&
                        'bg-morandi-green/5 border-morandi-green/20'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isConfirmedItinerary(itinerary) && (
                          <Check size={14} className="text-morandi-green shrink-0" />
                        )}
                        {itinerary.tour_code && (
                          <span className="font-mono text-xs text-morandi-gold shrink-0">
                            {itinerary.tour_code}
                          </span>
                        )}

                        {editingId === itinerary.id ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => handleSaveRename(itinerary)}
                            onKeyDown={e => handleKeyDown(e, itinerary)}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 text-sm bg-card border border-morandi-primary rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-morandi-primary"
                          />
                        ) : (
                          <span className="text-sm text-morandi-primary truncate">
                            {stripHtml(itinerary.title) || '未命名'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-morandi-secondary mt-1">
                        {itinerary.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {itinerary.city}
                          </span>
                        )}
                        {itinerary.departure_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {itinerary.departure_date}
                          </span>
                        )}
                        {itinerary.daily_itinerary && itinerary.daily_itinerary.length > 0 && (
                          <span>{itinerary.daily_itinerary.length} 天</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => handleStartRename(e, itinerary)}
                        className="p-1 hover:bg-morandi-container rounded"
                        title={DOCUMENTS_LABELS.LABEL_725}
                      >
                        <Pencil size={12} className="text-morandi-secondary" />
                      </button>
                      <ExternalLink size={14} className="text-morandi-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 新增按鈕 */}
          <DialogFooter className="p-2 border-t border-border">
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              variant="ghost"
              className="w-full gap-2"
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              新增
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
