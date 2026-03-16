'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  Check,
  Hotel,
  MapPin,
  X,
} from 'lucide-react'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { DroppableZone } from './DroppableZone'
import { MentionInput, type MentionInputHandle } from '../mention-input'

export interface DailyScheduleItem {
  day: number
  route: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation: string
  hotelBreakfast?: boolean
  lunchSelf?: boolean
  dinnerSelf?: boolean
  sameAsPrevious?: boolean
  attractions?: { id: string; name: string }[]
  note?: string
  accommodationId?: string
  mealIds?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
}

interface DayRowProps {
  day: DailyScheduleItem
  idx: number
  isFirst: boolean
  isLast: boolean
  updateDaySchedule: (index: number, field: string, value: string | boolean | undefined) => void
  removeAttraction: (dayIdx: number, attractionId: string) => void
  handleMentionSelect: (dayIdx: number, attraction: { id: string; name: string }) => void
  mentionInputRefs: React.MutableRefObject<Record<number, MentionInputHandle | null>>
  tourLocation: string
  getDateLabel: (idx: number) => string
  getPreviousAccommodation: (index: number) => string
}

export function DayRow({
  day,
  idx,
  isFirst,
  isLast,
  updateDaySchedule,
  removeAttraction,
  handleMentionSelect,
  mentionInputRefs,
  tourLocation,
  getDateLabel,
  getPreviousAccommodation,
}: DayRowProps) {
  return (
    <tbody>
      <tr className={`${idx % 2 === 1 ? 'bg-muted/5' : ''} group hover:bg-morandi-gold/5`}>
        {/* Day + date */}
        <td className="px-2 py-1 border border-border/20 align-middle">
          <div className="font-semibold text-morandi-gold text-xs">Day {day.day}</div>
          {getDateLabel(idx) && (
            <div className="text-[10px] text-muted-foreground">{getDateLabel(idx)}</div>
          )}
        </td>
        {/* Route -- attraction drop zone */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`attraction-drop-${idx}`} acceptType="attraction">
            {/* 景點卡片列 + 手動輸入 */}
            <div className="flex flex-wrap items-center gap-1 px-2 min-h-[32px]">
              {(day.attractions || []).map((a, aIdx) => (
                <React.Fragment key={a.id}>
                  {aIdx > 0 && <span className="text-muted-foreground text-xs">→</span>}
                  <div className="inline-flex items-center gap-1 text-blue-600 text-base">
                    <span>{a.name}</span>
                    <button type="button" onClick={() => removeAttraction(idx, a.id)} className="hover:text-destructive opacity-40 hover:opacity-100 transition-opacity"><X size={10} /></button>
                  </div>
                </React.Fragment>
              ))}
              {/* 手動輸入（沒有景點時顯示 placeholder，有景點時縮小） */}
              <MentionInput
                ref={el => { mentionInputRefs.current[idx] = el }}
                value={day.route || ''}
                onChange={val => updateDaySchedule(idx, 'route', val)}
                onAttractionSelect={attraction => handleMentionSelect(idx, attraction)}
                countryName={tourLocation}
                attractions={day.attractions}
                placeholder={
                  day.attractions && day.attractions.length > 0
                    ? ''
                    : isFirst
                      ? COMP_TOURS_LABELS.抵達目的地
                      : isLast
                        ? COMP_TOURS_LABELS.返回台灣
                        : COMP_TOURS_LABELS.今日行程標題
                }
                className={`text-sm border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent ${
                  day.attractions && day.attractions.length > 0 ? 'h-8 w-24 px-2 flex-shrink' : 'h-8 w-full px-2'
                }`}
              />
            </div>
          </DroppableZone>
        </td>
        {/* Tools */}
        <td className="px-1 py-0 border border-border/20 align-middle">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => mentionInputRefs.current[idx]?.insertAtCursor(' → ')}
              className="p-1 hover:bg-morandi-gold/20 rounded"
              title={COMP_TOURS_LABELS.插入箭頭}
            >
              <ArrowRight size={12} className="text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => mentionInputRefs.current[idx]?.insertAtCursor(' ⇀ ')}
              className="px-1 py-0.5 text-[10px] hover:bg-morandi-gold/20 rounded text-muted-foreground"
              title={COMP_TOURS_LABELS.插入鉤箭頭}
            >
              ⇀
            </button>
            <button
              type="button"
              onClick={() => mentionInputRefs.current[idx]?.insertAtCursor(' · ')}
              className="px-1 py-0.5 text-[10px] hover:bg-morandi-gold/20 rounded text-muted-foreground"
              title={COMP_TOURS_LABELS.插入間隔點}
            >
              ·
            </button>
            <button
              type="button"
              onClick={() => {
                const hasNote = day.note !== undefined
                updateDaySchedule(idx, 'note', hasNote ? undefined : '')
              }}
              className={`px-1 py-0.5 text-[10px] font-medium rounded ${day.note !== undefined ? 'bg-morandi-gold/20 text-morandi-gold' : 'hover:bg-morandi-gold/20 text-muted-foreground'}`}
              title="備註"
            >
              PS
            </button>
          </div>
        </td>
        {/* Breakfast -- restaurant drop zone */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`meal-breakfast-drop-${idx}`} acceptType="restaurant">
            <div className="relative">
              {!day.hotelBreakfast && day.meals.breakfast ? (
                <div className="h-8 flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.breakfast}</span>
                    <button type="button" onClick={() => updateDaySchedule(idx, 'meals.breakfast', '')} className="hover:text-destructive"><X size={10} /></button>
                  </div>
                </div>
              ) : (
                <Input
                  value={day.hotelBreakfast ? COMP_TOURS_LABELS.飯店早餐 : ''}
                  onChange={e => updateDaySchedule(idx, 'meals.breakfast', e.target.value)}
                  placeholder={COMP_TOURS_LABELS.早餐}
                  className={`h-8 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent ${!isFirst ? 'pr-6' : ''}`}
                  disabled={day.hotelBreakfast}
                />
              )}
              {!isFirst && (
                <button
                  type="button"
                  onClick={() =>
                    updateDaySchedule(idx, 'hotelBreakfast', !day.hotelBreakfast)
                  }
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  title={COMP_TOURS_LABELS.飯店早餐}
                >
                  <Check
                    size={12}
                    className={`transition-opacity ${day.hotelBreakfast ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                  />
                </button>
              )}
            </div>
          </DroppableZone>
        </td>
        {/* Lunch -- restaurant drop zone */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`meal-lunch-drop-${idx}`} acceptType="restaurant">
            <div className="relative">
              {!day.lunchSelf && day.meals.lunch ? (
                <div className="h-8 flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.lunch}</span>
                    <button type="button" onClick={() => updateDaySchedule(idx, 'meals.lunch', '')} className="hover:text-destructive"><X size={10} /></button>
                  </div>
                </div>
              ) : (
                <Input
                  value={day.lunchSelf ? COMP_TOURS_LABELS.敬請自理 : ''}
                  onChange={e => updateDaySchedule(idx, 'meals.lunch', e.target.value)}
                  placeholder={COMP_TOURS_LABELS.午餐}
                  className="h-8 text-sm pr-6 border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent"
                  disabled={day.lunchSelf}
                />
              )}
              <button
                type="button"
                onClick={() => updateDaySchedule(idx, 'lunchSelf', !day.lunchSelf)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                title={COMP_TOURS_LABELS.敬請自理}
              >
                <Check
                  size={12}
                  className={`transition-opacity ${day.lunchSelf ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                />
              </button>
            </div>
          </DroppableZone>
        </td>
        {/* Dinner -- restaurant drop zone */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`meal-dinner-drop-${idx}`} acceptType="restaurant">
            <div className="relative">
              {!day.dinnerSelf && day.meals.dinner ? (
                <div className="h-8 flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.dinner}</span>
                    <button type="button" onClick={() => updateDaySchedule(idx, 'meals.dinner', '')} className="hover:text-destructive"><X size={10} /></button>
                  </div>
                </div>
              ) : (
                <Input
                  value={day.dinnerSelf ? COMP_TOURS_LABELS.敬請自理 : ''}
                  onChange={e => updateDaySchedule(idx, 'meals.dinner', e.target.value)}
                  placeholder={COMP_TOURS_LABELS.晚餐}
                  className="h-8 text-sm pr-6 border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent"
                  disabled={day.dinnerSelf}
                />
              )}
              <button
                type="button"
                onClick={() => updateDaySchedule(idx, 'dinnerSelf', !day.dinnerSelf)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                title={COMP_TOURS_LABELS.敬請自理}
              >
                <Check
                  size={12}
                  className={`transition-opacity ${day.dinnerSelf ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                />
              </button>
            </div>
          </DroppableZone>
        </td>
      </tr>
      {/* Accommodation row -- hotel drop zone (not for last day) */}
      {!isLast && (
        <tr className={idx % 2 === 1 ? 'bg-muted/5' : ''}>
          <td className="px-2 py-0 border border-border/20 align-middle text-[10px] text-morandi-gold font-medium">
            <Hotel size={10} className="inline" />
          </td>
          <td colSpan={4} className="px-0 py-0 border border-border/20 align-middle">
            <DroppableZone id={`hotel-drop-${idx}`} acceptType="hotel">
              {day.sameAsPrevious ? (
                <div className="h-7 flex items-center px-2 text-sm text-muted-foreground">
                  續住 ({getPreviousAccommodation(idx) || '-'})
                </div>
              ) : day.accommodation ? (
                <div className="h-7 flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5 text-xs">
                    <Hotel size={10} />
                    <span>{day.accommodation}</span>
                    <button type="button" onClick={() => updateDaySchedule(idx, 'accommodation', '')} className="hover:text-destructive"><X size={10} /></button>
                  </div>
                </div>
              ) : (
                <Input
                  value=""
                  onChange={e => updateDaySchedule(idx, 'accommodation', e.target.value)}
                  placeholder="拖拽酒店到此處..."
                  className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent"
                />
              )}
            </DroppableZone>
          </td>
          <td className="px-1 py-0 border border-border/20 align-middle text-center">
            {idx > 0 && (
              <label className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!day.sameAsPrevious}
                  onChange={() => updateDaySchedule(idx, 'sameAsPrevious', !day.sameAsPrevious)}
                  className="rounded border-morandi-secondary w-3 h-3"
                />
                續住
              </label>
            )}
          </td>
        </tr>
      )}
      {/* Note row */}
      {day.note !== undefined && (
        <tr className={idx % 2 === 1 ? 'bg-muted/5' : ''}>
          <td className="px-2 py-0 border border-border/20 align-middle text-[10px] text-morandi-gold font-medium">
            PS
          </td>
          <td colSpan={5} className="px-0 py-0 border border-border/20 align-middle">
            <Input
              value={day.note || ''}
              onChange={e => updateDaySchedule(idx, 'note', e.target.value)}
              placeholder="輸入備註..."
              className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent text-muted-foreground"
            />
          </td>
        </tr>
      )}
    </tbody>
  )
}
