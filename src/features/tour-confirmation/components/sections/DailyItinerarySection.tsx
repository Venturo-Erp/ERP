/**
 * 每日行程表區塊
 */

import React, { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import type { Itinerary, DailyItineraryDay } from '@/stores/types'
import {
  DAILY_ITINERARY_SECTION_LABELS,
  TOUR_CONFIRMATION_SHEET_PAGE_LABELS,
} from '../../constants/labels'

interface DailyItinerarySectionProps {
  itinerary: Itinerary
}

export function DailyItinerarySection({ itinerary }: DailyItinerarySectionProps) {
  // 每日說明展開狀態
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})
  // 每日說明文字
  const [dayNotes, setDayNotes] = useState<Record<number, string>>({})

  // 切換說明展開
  const toggleDayNote = (dayIdx: number) => {
    setExpandedDays(prev => ({ ...prev, [dayIdx]: !prev[dayIdx] }))
  }

  // 更新說明文字
  const updateDayNote = (dayIdx: number, note: string) => {
    setDayNotes(prev => ({ ...prev, [dayIdx]: note }))
  }

  if (!itinerary.daily_itinerary || itinerary.daily_itinerary.length === 0) {
    return null
  }

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2 px-4 py-2 bg-morandi-gold-header">
        <span className="font-medium">{TOUR_CONFIRMATION_SHEET_PAGE_LABELS.LABEL_2780}</span>
        <span className="text-white/80 text-sm">({itinerary.daily_itinerary.length} 天)</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-morandi-container/50 border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-morandi-primary w-[80px]">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.日期}
            </th>
            <th className="px-3 py-2 text-left font-medium text-morandi-primary">
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.LABEL_9277}
            </th>
          </tr>
        </thead>
        <tbody>
          {itinerary.daily_itinerary.map((day, idx) => {
            const isExpanded = expandedDays[idx]
            const noteText = dayNotes[idx] || ''

            // 組合行程字串
            const itineraryStr =
              day.activities && day.activities.length > 0
                ? `${day.dayLabel}｜${day.activities
                    .map(a => a.title)
                    .filter(Boolean)
                    .join(' > ')}`
                : `${day.dayLabel}｜${day.title || ''}`

            return (
              <React.Fragment key={idx}>
                {/* 第一行：日期 + 行程 */}
                <tr className="border-t border-border/50 bg-card hover:bg-morandi-container/10">
                  <td className="px-3 py-2 align-top">
                    <div className="text-sm font-medium text-morandi-primary">{day.date}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-morandi-primary">{itineraryStr}</div>
                  </td>
                </tr>

                {/* 第二行：[+] 按鈕 + 餐食住宿 */}
                <tr className="border-t border-border/30 bg-morandi-container/5">
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => toggleDayNote(idx)}
                      className="flex items-center gap-1 text-xs text-morandi-gold hover:text-morandi-gold-hover"
                      title={isExpanded ? '收起說明' : DAILY_ITINERARY_SECTION_LABELS.新增說明}
                    >
                      <Plus
                        size={14}
                        className={`transition-transform ${isExpanded ? 'rotate-45' : ''}`}
                      />
                      {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.LABEL_5591}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex text-sm text-morandi-secondary">
                      <span className="w-[150px] flex items-center">
                        早：{day.meals?.breakfast || 'X'}
                        {day.meals?.breakfast === DAILY_ITINERARY_SECTION_LABELS.飯店早餐 && (
                          <Check size={14} className="ml-1 text-morandi-green/40" />
                        )}
                      </span>
                      <span className="w-[150px] flex items-center">
                        午：{day.meals?.lunch || 'X'}
                      </span>
                      <span className="w-[150px] flex items-center">
                        晚：{day.meals?.dinner || 'X'}
                      </span>
                      {day.accommodation &&
                        day.accommodation !== TOUR_CONFIRMATION_SHEET_PAGE_LABELS.溫暖的家 && (
                          <span className="flex-1 flex items-center">
                            住：{day.accommodation}
                            {(day.isSameAccommodation ||
                              day.accommodation.includes(DAILY_ITINERARY_SECTION_LABELS.續住)) && (
                              <Check size={14} className="ml-1 text-morandi-green/40" />
                            )}
                          </span>
                        )}
                    </div>
                  </td>
                </tr>

                {/* 第三行：說明（展開時顯示） */}
                {isExpanded && (
                  <tr className="border-t border-border/30 bg-morandi-gold/5">
                    <td className="px-3 py-2 align-top">
                      <span className="text-xs text-morandi-secondary">
                        {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.REMARKS}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={noteText}
                        onChange={e => updateDayNote(idx, e.target.value)}
                        placeholder={
                          DAILY_ITINERARY_SECTION_LABELS.輸入說明文字_例如_提醒客戶帶護照
                        }
                        className="w-full px-2 py-1.5 text-sm border border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 resize-none"
                        rows={2}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
