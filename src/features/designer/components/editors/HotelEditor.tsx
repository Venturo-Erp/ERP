'use client'

/**
 * 飯店編輯器
 *
 * 支援從行程自動帶入飯店，並辨識續住（連續住同一間飯店只算一間）
 */

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/ui/image-uploader'
import { cn } from '@/lib/utils'
import { Hotel, Plus, Trash2, Check, ChevronDown, ChevronRight, Download } from 'lucide-react'
import type { DailyItinerary, HotelData } from '../../templates/definitions/types'
import { DESIGNER_LABELS } from './constants/labels'

interface HotelEditorProps {
  templateData: Record<string, unknown>
  onTemplateDataChange: (newData: Record<string, unknown>) => void
  currentHotelIndex?: number
}

export function HotelEditor({
  templateData,
  onTemplateDataChange,
  currentHotelIndex = 0,
}: HotelEditorProps) {
  // 取得飯店列表
  const hotels = (templateData.hotels as HotelData[]) || []
  const dailyItineraries = (templateData.dailyItineraries as DailyItinerary[]) || []

  // 展開狀態
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // 從行程表提取不重複的飯店（辨識續住）
  const extractHotelsFromItinerary = (): { name: string; nights: number; days: string }[] => {
    const result: { name: string; nights: number; days: string }[] = []
    let currentHotel = ''
    let nightCount = 0
    let startDay = 0

    dailyItineraries.forEach((day, idx) => {
      const hotelName = day.accommodation?.trim() || ''

      if (!hotelName) return

      if (hotelName === currentHotel) {
        // 續住，增加晚數
        nightCount++
      } else {
        // 新飯店，保存前一間
        if (currentHotel) {
          result.push({
            name: currentHotel,
            nights: nightCount,
            days:
              nightCount > 1 ? `Day ${startDay}-${startDay + nightCount - 1}` : `Day ${startDay}`,
          })
        }
        currentHotel = hotelName
        nightCount = 1
        startDay = idx + 1
      }
    })

    // 保存最後一間
    if (currentHotel) {
      result.push({
        name: currentHotel,
        nights: nightCount,
        days: nightCount > 1 ? `Day ${startDay}-${startDay + nightCount - 1}` : `Day ${startDay}`,
      })
    }

    return result
  }

  const extractedHotels = extractHotelsFromItinerary()

  // 從行程帶入飯店
  const importHotelsFromItinerary = () => {
    const newHotels: HotelData[] = extractedHotels.map((h, idx) => ({
      id: `hotel-${Date.now()}-${idx}`,
      nameZh: h.name,
      nameEn: '',
      location: '',
      description: '',
      tags: [],
      enabled: true,
    }))

    onTemplateDataChange({
      ...templateData,
      hotels: newHotels,
      currentHotelIndex: 0,
    })
  }

  // 新增飯店
  const addHotel = () => {
    const newHotel: HotelData = {
      id: `hotel-${Date.now()}`,
      nameZh: DESIGNER_LABELS.NEW_HOTEL,
      nameEn: '',
      location: '',
      description: '',
      tags: [],
      enabled: true,
    }
    onTemplateDataChange({
      ...templateData,
      hotels: [...hotels, newHotel],
    })
  }

  // 更新飯店欄位
  const updateHotelField = (
    hotelIndex: number,
    field: keyof HotelData,
    value: string | string[] | boolean
  ) => {
    const newHotels = hotels.map((hotel, idx) => {
      if (idx !== hotelIndex) return hotel
      return { ...hotel, [field]: value }
    })
    onTemplateDataChange({
      ...templateData,
      hotels: newHotels,
    })
  }

  // 刪除飯店
  const deleteHotel = (hotelIndex: number) => {
    const newHotels = hotels.filter((_, idx) => idx !== hotelIndex)
    onTemplateDataChange({
      ...templateData,
      hotels: newHotels,
      currentHotelIndex: Math.min(currentHotelIndex, Math.max(0, newHotels.length - 1)),
    })
  }

  // 切換當前顯示的飯店
  const setCurrentHotel = (index: number) => {
    onTemplateDataChange({
      ...templateData,
      currentHotelIndex: index,
    })
  }

  // 計算啟用的飯店數量
  const enabledCount = hotels.filter(h => h.enabled !== false).length

  return (
    <div className="space-y-3">
      {/* 從行程帶入區塊 */}
      {extractedHotels.length > 0 && hotels.length === 0 && (
        <div className="p-3 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg">
          <p className="text-xs text-morandi-primary mb-2">
            偵測到行程中有{' '}
            <span className="font-bold text-morandi-gold">{extractedHotels.length}</span>{' '}
            {DESIGNER_LABELS.LABEL_6107}
          </p>
          <ul className="text-[11px] text-morandi-secondary space-y-1 mb-3">
            {extractedHotels.map((h, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Hotel size={12} className="text-morandi-gold shrink-0" />
                <span className="flex-1 truncate">{h.name}</span>
                <span className="text-morandi-muted text-[10px]">
                  {h.nights > 1 ? `${h.nights}${DESIGNER_LABELS.NIGHTS_SUFFIX}` : ''} {h.days}
                </span>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            onClick={importHotelsFromItinerary}
            className="w-full gap-1.5 text-xs bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
          >
            <Download size={12} />
            {DESIGNER_LABELS.LABEL_2050}
          </Button>
        </div>
      )}

      {/* 已有飯店時的提示 */}
      {extractedHotels.length > 0 && hotels.length > 0 && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-morandi-secondary">
            {DESIGNER_LABELS.SELECTED_COUNT_PREFIX}
            <span className="font-medium text-morandi-gold">{enabledCount}</span>
            {DESIGNER_LABELS.SELECTED_COUNT_MID}
            {hotels.length}
            {DESIGNER_LABELS.SELECTED_COUNT_SUFFIX}
          </span>
          <button
            type="button"
            onClick={importHotelsFromItinerary}
            className="text-morandi-gold hover:underline"
          >
            {DESIGNER_LABELS.LABEL_6276}
          </button>
        </div>
      )}

      <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.EDIT_2476}</p>

      {/* 飯店列表 */}
      <div className="space-y-2">
        {hotels.length === 0 ? (
          <div className="p-3 text-center text-xs text-morandi-muted border border-dashed border-border rounded">
            {extractedHotels.length > 0
              ? DESIGNER_LABELS.IMPORT_HINT
              : DESIGNER_LABELS.NO_HOTEL_DATA}
          </div>
        ) : (
          hotels.map((hotel, idx) => (
            <div
              key={hotel.id}
              className={cn(
                'rounded border overflow-hidden transition-all',
                hotel.enabled === false
                  ? 'border-border/30 bg-morandi-container/5 opacity-60'
                  : idx === currentHotelIndex
                    ? 'border-morandi-gold bg-morandi-gold/5'
                    : 'border-border/50 bg-morandi-container/10'
              )}
            >
              {/* 飯店標題列 */}
              <div className="flex items-center gap-2 p-2">
                {/* 啟用/停用勾選 */}
                <button
                  type="button"
                  onClick={() =>
                    updateHotelField(idx, 'enabled', hotel.enabled === false ? true : false)
                  }
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    hotel.enabled !== false
                      ? 'border-morandi-gold bg-morandi-gold text-white'
                      : 'border-border hover:border-morandi-gold'
                  )}
                >
                  {hotel.enabled !== false && <Check size={10} />}
                </button>

                {/* 飯店名稱（可點擊展開編輯） */}
                <button
                  type="button"
                  className={cn(
                    'flex-1 text-left text-xs font-medium truncate',
                    hotel.enabled !== false
                      ? 'text-morandi-primary hover:text-morandi-gold'
                      : 'text-morandi-muted'
                  )}
                  onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                >
                  <Hotel size={12} className="inline mr-1.5" />
                  {hotel.nameZh || DESIGNER_LABELS.UNNAMED_HOTEL}
                </button>

                {/* 目前顯示標記 */}
                {hotel.enabled !== false && idx === currentHotelIndex && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-morandi-gold/20 text-morandi-gold rounded shrink-0">
                    {DESIGNER_LABELS.LABEL_2986}
                  </span>
                )}

                {/* 設為目前顯示 */}
                {hotel.enabled !== false && idx !== currentHotelIndex && (
                  <button
                    type="button"
                    onClick={() => setCurrentHotel(idx)}
                    className="text-[9px] text-morandi-secondary hover:text-morandi-gold shrink-0"
                  >
                    {DESIGNER_LABELS.LABEL_4463}
                  </button>
                )}

                {/* 展開/收合指示 */}
                {expandedIndex === idx ? (
                  <ChevronDown size={12} className="text-morandi-secondary shrink-0" />
                ) : (
                  <ChevronRight size={12} className="text-morandi-secondary shrink-0" />
                )}

                {/* 刪除按鈕 */}
                <button
                  type="button"
                  onClick={() => deleteHotel(idx)}
                  className="text-morandi-muted hover:text-morandi-red shrink-0 p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* 展開的編輯區域 */}
              {expandedIndex === idx && (
                <div className="px-2 pb-2 space-y-2 border-t border-border/30 pt-2">
                  {/* 中文名稱 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_5430}
                    </Label>
                    <Input
                      value={hotel.nameZh || ''}
                      onChange={e => updateHotelField(idx, 'nameZh', e.target.value)}
                      className="h-7 text-xs"
                      placeholder={DESIGNER_LABELS.LABEL_7502}
                    />
                  </div>

                  {/* 英文名稱 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_9990}
                    </Label>
                    <Input
                      value={hotel.nameEn || ''}
                      onChange={e => updateHotelField(idx, 'nameEn', e.target.value)}
                      className="h-7 text-xs"
                      placeholder={DESIGNER_LABELS.LABEL_4049}
                    />
                  </div>

                  {/* 地點 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_8716}
                    </Label>
                    <Input
                      value={hotel.location || ''}
                      onChange={e => updateHotelField(idx, 'location', e.target.value)}
                      className="h-7 text-xs"
                      placeholder={DESIGNER_LABELS.LABEL_3245}
                    />
                  </div>

                  {/* 描述 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_8542}
                    </Label>
                    <Textarea
                      value={hotel.description || ''}
                      onChange={e => updateHotelField(idx, 'description', e.target.value)}
                      className="text-xs min-h-[80px] resize-none"
                      placeholder={DESIGNER_LABELS.LABEL_5150}
                    />
                  </div>

                  {/* 設施標籤 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_5630}
                    </Label>
                    <Input
                      value={(hotel.tags || []).join(', ')}
                      onChange={e =>
                        updateHotelField(
                          idx,
                          'tags',
                          e.target.value
                            .split(',')
                            .map(t => t.trim())
                            .filter(Boolean)
                        )
                      }
                      className="h-7 text-xs"
                      placeholder={DESIGNER_LABELS.LABEL_5957}
                    />
                  </div>

                  {/* 飯店圖片 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {DESIGNER_LABELS.LABEL_1815}
                    </Label>
                    <ImageUploader
                      value={hotel.image}
                      onChange={url => updateHotelField(idx, 'image', url || '')}
                      bucket="brochure-images"
                      filePrefix="hotel"
                      previewHeight="80px"
                      aspectRatio={16 / 9}
                      placeholder={DESIGNER_LABELS.UPLOADING_5167}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 新增飯店按鈕 */}
      <Button variant="outline" size="sm" onClick={addHotel} className="w-full gap-1.5 text-xs">
        <Plus size={12} />
        {DESIGNER_LABELS.ADD_9739}
      </Button>

      <p className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.LABEL_7873}</p>
    </div>
  )
}
