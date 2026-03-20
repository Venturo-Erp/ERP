'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Check,
  Hotel,
  MapPin,
  X,
} from 'lucide-react'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { DroppableZone } from './DroppableZone'
import { MentionInput, type MentionInputHandle } from '../mention-input'

export type ItineraryBlock = 
  | { type: 'text'; content: string }
  | { type: 'attraction'; id: string; name: string; verified?: boolean }

export interface DailyScheduleItem {
  day: number
  route: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation: string
  hotelBreakfast?: boolean
  lunchSelf?: boolean
  dinnerSelf?: boolean
  sameAsPrevious?: boolean
  attractions?: { id: string; name: string; verified?: boolean }[]
  blocks?: ItineraryBlock[]
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
  reorderAttractions: (dayIdx: number, newOrder: { id: string; name: string; verified?: boolean }[]) => void
  handleMentionSelect: (dayIdx: number, attraction: { id: string; name: string }) => void
  updateBlocks?: (dayIdx: number, blocks: ItineraryBlock[]) => void
  mentionInputRefs: React.MutableRefObject<Record<number, MentionInputHandle | null>>
  tourLocation: string
  getDateLabel: (idx: number) => string
  getPreviousAccommodation: (index: number) => string
  disabledAttractionIds?: string[]
}

export function DayRow({
  day,
  idx,
  isFirst,
  isLast,
  updateDaySchedule,
  removeAttraction,
  reorderAttractions,
  handleMentionSelect,
  updateBlocks,
  mentionInputRefs,
  tourLocation,
  getDateLabel,
  getPreviousAccommodation,
  disabledAttractionIds = [],
}: DayRowProps) {
  const routeInputRef = React.useRef<HTMLInputElement>(null)

  // 插入景點：名字插到游標位置 + 加到 attractions 列表
  const handleInsertAttraction = React.useCallback((attraction: { id: string; name: string }) => {
    // 加到 attractions 列表（DB 連結）
    const existing = day.attractions || []
    if (existing.some(a => a.id === attraction.id)) return
    const newAttractions = [...existing, attraction]
    reorderAttractions(idx, newAttractions)

    // 在游標位置插入景點名字
    const input = routeInputRef.current
    const currentRoute = day.route || ''
    const cursorPos = input?.selectionStart ?? currentRoute.length
    const before = currentRoute.slice(0, cursorPos)
    const after = currentRoute.slice(cursorPos)
    const newRoute = before + attraction.name + after
    updateDaySchedule(idx, 'route', newRoute)

    // 同步 blocks
    if (updateBlocks) {
      const newBlocks: ItineraryBlock[] = [
        { type: 'text', content: newRoute },
        ...newAttractions.map(a => ({ type: 'attraction' as const, id: a.id, name: a.name })),
      ]
      updateBlocks(idx, newBlocks)
    }

    // Focus 回 input，游標放在插入的景點名後面
    const newCursorPos = cursorPos + attraction.name.length
    setTimeout(() => {
      if (input) {
        input.focus()
        input.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 50)
  }, [day.route, day.attractions, idx, reorderAttractions, updateDaySchedule, updateBlocks])

  // route 文字變更
  const handleRouteChange = React.useCallback((value: string) => {
    updateDaySchedule(idx, 'route', value)
    // 同步 blocks（保留文字 + attractions）
    if (updateBlocks) {
      const newBlocks: ItineraryBlock[] = [
        { type: 'text', content: value },
        ...(day.attractions || []).map(a => ({ type: 'attraction' as const, id: a.id, name: a.name, verified: a.verified })),
      ]
      updateBlocks(idx, newBlocks)
    }
  }, [idx, day.attractions, updateDaySchedule, updateBlocks])

  // 移除景點：從 attractions 移除 + 從 route 文字中移除名字
  const handleRemoveAttraction = React.useCallback((attractionId: string) => {
    const attraction = (day.attractions || []).find(a => a.id === attractionId)
    removeAttraction(idx, attractionId)

    // 從 route 文字中移除景點名
    if (attraction && day.route) {
      let newRoute = day.route
      // 移除 " → 景點名" 或 "景點名 → " 或單獨的 "景點名"
      newRoute = newRoute.replace(new RegExp(`\\s*→\\s*${attraction.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '')
      newRoute = newRoute.replace(new RegExp(`${attraction.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*→\\s*`, 'g'), '')
      newRoute = newRoute.replace(new RegExp(`${attraction.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '')
      newRoute = newRoute.replace(/^\s*→\s*|\s*→\s*$/g, '').trim()
      updateDaySchedule(idx, 'route', newRoute)
    }
  }, [day.attractions, day.route, idx, removeAttraction, updateDaySchedule])

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
        {/* Route — 文字輸入 + 景點標籤在下排 */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`attraction-drop-${idx}`} acceptType="attraction">
            <div className="flex flex-col">
              {/* 文字輸入 */}
              <div className="flex items-center">
                <input
                  ref={routeInputRef}
                  type="text"
                  value={day.route || ''}
                  onChange={e => handleRouteChange(e.target.value)}
                  placeholder={
                    isFirst
                      ? COMP_TOURS_LABELS.抵達目的地
                      : isLast
                        ? COMP_TOURS_LABELS.返回台灣
                        : COMP_TOURS_LABELS.今日行程標題
                  }
                  className="h-8 flex-1 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-morandi-gold/30 rounded px-2 bg-transparent outline-none min-w-0"
                />
                {/* @ mention 搜景點 - 已移除，改用右側資源庫拖拉 */}
              </div>
              {/* 景點標籤列 */}
              {(day.attractions?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1 px-2 pb-1">
                  {(day.attractions || []).map(a => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] whitespace-nowrap bg-morandi-gold/10 text-morandi-gold"
                    >
                      <MapPin size={8} />
                      <span>{a.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttraction(a.id)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DroppableZone>
        </td>
        {/* Tools — 簡化，只保留備註 */}
        <td className="px-1 py-0 border border-border/20 align-middle">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => {
                // 插入箭頭到 route
                const input = routeInputRef.current
                if (input) {
                  const pos = input.selectionStart || input.value.length
                  const val = input.value
                  const newVal = val.slice(0, pos) + ' → ' + val.slice(pos)
                  handleRouteChange(newVal)
                  setTimeout(() => {
                    input.focus()
                    input.setSelectionRange(pos + 3, pos + 3)
                  }, 0)
                }
              }}
              className="px-1 py-0.5 text-[10px] hover:bg-morandi-gold/20 rounded text-muted-foreground"
              title="插入箭頭"
            >
              →
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
