// @ts-nocheck -- tour_requests table missing columns in generated types; pending DB migration
/**
 * 飯店確認區塊
 */

import React from 'react'
import type { Itinerary } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'
import type { TourRoom, QuoteRoomItem } from '../../hooks/useTourSheetData'
import {
  CONFIRMATION_HEADER_LABELS,
  DAILY_ITINERARY_SECTION_LABELS,
  HOTEL_CONFIRMATION_SECTION_LABELS,
  TOUR_CONFIRMATION_SHEET_PAGE_LABELS,
} from '../../constants/labels'

type TourRequestRow = Database['public']['Tables']['tour_requests']['Row']

interface NightlyAccommodation {
  nightNumber: number
  date: string
  dayLabel: string
  hotelName: string
  isSameAsPrevious: boolean
}

interface HotelConfirmationSectionProps {
  itinerary: Itinerary
  tourRequests: TourRequestRow[]
  tourRooms: TourRoom[]
  quoteRoomItems: QuoteRoomItem[]
}

export function HotelConfirmationSection({
  itinerary,
  tourRequests,
  tourRooms,
  quoteRoomItems,
}: HotelConfirmationSectionProps) {
  if (!itinerary?.daily_itinerary || itinerary.daily_itinerary.length === 0) {
    return null
  }

  // 建立每晚住宿清單（排除最後一天和「溫暖的家」）
  const nightlyAccommodations: NightlyAccommodation[] = []

  itinerary.daily_itinerary.forEach((day, idx) => {
    // 最後一天通常不住宿
    if (idx === itinerary.daily_itinerary.length - 1) return
    if (!day.accommodation || day.accommodation === TOUR_CONFIRMATION_SHEET_PAGE_LABELS.溫暖的家)
      return

    const isSame =
      day.isSameAccommodation || day.accommodation.includes(DAILY_ITINERARY_SECTION_LABELS.續住)
    // 提取實際飯店名稱（去掉「續住」前綴）
    let hotelName = day.accommodation
    if (isSame && day.accommodation.includes('(')) {
      hotelName = day.accommodation.replace(/續住\s*\(([^)]+)\)/, '$1').trim()
    }

    nightlyAccommodations.push({
      nightNumber: idx + 1,
      date: day.date || '',
      dayLabel: day.dayLabel || `Day ${idx + 1}`,
      hotelName: hotelName,
      isSameAsPrevious: isSame,
    })
  })

  if (nightlyAccommodations.length === 0) {
    return null
  }

  // 從需求單取得住宿確認狀態
  const accommodationRequests = tourRequests.filter(
    req => req.category === 'accommodation' || req.category === 'hotel'
  )

  // 取得每晚的房型配置
  const getRoomTypesForNight = (nightNumber: number) => {
    // 優先從報價單取得房型
    const quoteRooms = quoteRoomItems.filter(r => r.day === nightNumber)
    if (quoteRooms.length > 0) {
      return quoteRooms.map(r => `${r.room_type} x${r.quantity}`).join('、')
    }

    // 其次從 tour_rooms 表取得
    const rooms = tourRooms.filter(r => r.night_number === nightNumber)
    if (rooms.length === 0) return '-'

    // 統計各房型數量
    const roomCounts: Record<string, number> = {}
    rooms.forEach(r => {
      const type = r.room_type || HOTEL_CONFIRMATION_SECTION_LABELS.未指定
      roomCounts[type] = (roomCounts[type] || 0) + 1
    })
    return Object.entries(roomCounts)
      .map(([type, count]) => `${type} x${count}`)
      .join('、')
  }

  // 取得飯店的確認狀態
  const getHotelStatus = (hotelName: string) => {
    const req = accommodationRequests.find(
      r => r.supplier_name?.includes(hotelName) || r.title?.includes(hotelName)
    )
    if (!req)
      return {
        status: 'pending',
        label: HOTEL_CONFIRMATION_SECTION_LABELS.待確認,
        color: 'bg-morandi-gold/20 text-morandi-gold',
      }
    if (req.status === 'confirmed')
      return {
        status: 'confirmed',
        label: CONFIRMATION_HEADER_LABELS.已確認,
        color: 'bg-morandi-green/20 text-morandi-green',
      }
    if (req.status === 'replied')
      return {
        status: 'replied',
        label: HOTEL_CONFIRMATION_SECTION_LABELS.已回覆,
        color: 'bg-morandi-container text-morandi-primary',
      }
    return {
      status: 'pending',
      label: HOTEL_CONFIRMATION_SECTION_LABELS.待確認,
      color: 'bg-morandi-gold/20 text-morandi-gold',
    }
  }

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-morandi-primary text-white">
        <div className="flex items-center gap-2">
          <span className="font-medium">{TOUR_CONFIRMATION_SHEET_PAGE_LABELS.CONFIRM_2803}</span>
          <span className="text-white/80 text-sm">
            {HOTEL_CONFIRMATION_SECTION_LABELS.NIGHTS_PREFIX}
            {nightlyAccommodations.length}
            {HOTEL_CONFIRMATION_SECTION_LABELS.NIGHTS_SUFFIX}
          </span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-morandi-container/50 border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-morandi-primary w-[80px]">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.日期}
            </th>
            <th className="px-3 py-2 text-left font-medium text-morandi-primary">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.LABEL_5863}
            </th>
            <th className="px-3 py-2 text-left font-medium text-morandi-primary w-[200px]">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.LABEL_4541}
            </th>
            <th className="px-3 py-2 text-left font-medium text-morandi-primary w-[80px]">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.STATUS}
            </th>
          </tr>
        </thead>
        <tbody>
          {nightlyAccommodations.map((night, idx) => {
            const status = getHotelStatus(night.hotelName)
            const roomTypes = getRoomTypesForNight(night.nightNumber)
            return (
              <tr
                key={idx}
                className={`border-t border-border/50 hover:bg-morandi-container/10 ${idx % 2 === 1 ? 'bg-morandi-container/5' : ''}`}
              >
                <td className="px-3 py-2 text-morandi-secondary">{night.date}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{night.hotelName}</span>
                  {night.isSameAsPrevious && (
                    <span className="ml-2 text-xs text-morandi-secondary">
                      {HOTEL_CONFIRMATION_SECTION_LABELS.CONTINUED_STAY}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-morandi-secondary">{roomTypes}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${status.color}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
