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
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { DroppableZone } from './DroppableZone'
import { MentionInput, type MentionInputHandle } from '../mention-input'
import { SortableAttractionChip } from './SortableAttractionChip'

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
}: DayRowProps) {
  // === Block 模式邏輯 ===
  // 從 attractions + route 轉成 blocks（向下相容）
  const blocks: ItineraryBlock[] = React.useMemo(() => {
    if (day.blocks && day.blocks.length > 0) return day.blocks
    const result: ItineraryBlock[] = []
    // 把 route 文字放前面
    if (day.route?.trim()) result.push({ type: 'text', content: day.route })
    // 把 attractions 放後面
    if (day.attractions) {
      for (const a of day.attractions) {
        result.push({ type: 'attraction', id: a.id, name: a.name, verified: a.verified })
      }
    }
    // 至少有一個空文字塊
    if (result.length === 0) result.push({ type: 'text', content: '' })
    return result
  }, [day.blocks, day.route, day.attractions])

  const syncBlocks = React.useCallback((newBlocks: ItineraryBlock[]) => {
    if (updateBlocks) {
      updateBlocks(idx, newBlocks)
    }
    // 同步到舊的 attractions 和 route（向下相容）
    const newAttractions = newBlocks
      .filter((b): b is ItineraryBlock & { type: 'attraction' } => b.type === 'attraction')
      .map(b => ({ id: b.id, name: b.name, verified: b.verified }))
    const routeParts = newBlocks
      .filter((b): b is ItineraryBlock & { type: 'text' } => b.type === 'text')
      .map(b => b.content)
      .filter(Boolean)
    updateDaySchedule(idx, 'route', routeParts.join(' '))
    reorderAttractions(idx, newAttractions)
  }, [idx, updateBlocks, updateDaySchedule, reorderAttractions])

  const handleBlockTextChange = React.useCallback((blockIdx: number, value: string) => {
    const newBlocks = [...blocks]
    newBlocks[blockIdx] = { type: 'text', content: value }
    syncBlocks(newBlocks)
  }, [blocks, syncBlocks])

  const handleBlockKeyDown = React.useCallback((blockIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // 在當前 block 後面插入一個空文字塊
      const newBlocks = [...blocks]
      newBlocks.splice(blockIdx + 1, 0, { type: 'text', content: '' })
      syncBlocks(newBlocks)
      // Focus 新的 input（下一個 tick）
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="block-${idx}-${blockIdx + 1}"]`) as HTMLInputElement
        el?.focus()
      }, 50)
    } else if (e.key === 'Backspace' && blocks[blockIdx].type === 'text' && (blocks[blockIdx] as { content: string }).content === '') {
      // 空文字塊按 Backspace 刪除（但至少保留一個）
      const textBlocks = blocks.filter(b => b.type === 'text')
      if (textBlocks.length > 1 || blocks.length > 1) {
        e.preventDefault()
        const newBlocks = blocks.filter((_, i) => i !== blockIdx)
        if (newBlocks.length === 0) newBlocks.push({ type: 'text', content: '' })
        syncBlocks(newBlocks)
      }
    }
  }, [blocks, idx, syncBlocks])

  const handleRemoveBlock = React.useCallback((blockIdx: number) => {
    const block = blocks[blockIdx]
    if (block.type === 'attraction') {
      removeAttraction(idx, block.id)
    }
    const newBlocks = blocks.filter((_, i) => i !== blockIdx)
    if (newBlocks.length === 0) newBlocks.push({ type: 'text', content: '' })
    syncBlocks(newBlocks)
  }, [blocks, idx, removeAttraction, syncBlocks])
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
        {/* Route -- block editor (text + attraction mixed) */}
        <td className="px-0 py-0 border border-border/20 align-middle">
          <DroppableZone id={`attraction-drop-${idx}`} acceptType="attraction">
            <div className="flex flex-wrap items-center gap-0.5 px-1.5 min-h-[32px]">
              <SortableContext
                items={(day.attractions || []).map(a => a.id)}
                strategy={horizontalListSortingStrategy}
              >
                {blocks.map((block, bIdx) => {
                  if (block.type === 'attraction') {
                    return (
                      <React.Fragment key={`a-${block.id}`}>
                        <SortableAttractionChip
                          id={block.id}
                          name={block.name}
                          dayIndex={idx}
                          verified={block.verified}
                          onRemove={() => handleRemoveBlock(bIdx)}
                        />
                      </React.Fragment>
                    )
                  }
                  // text block
                  return (
                    <input
                      key={`t-${bIdx}`}
                      data-block-id={`block-${idx}-${bIdx}`}
                      type="text"
                      value={block.content}
                      onChange={e => handleBlockTextChange(bIdx, e.target.value)}
                      onKeyDown={e => handleBlockKeyDown(bIdx, e)}
                      placeholder={
                        blocks.length === 1 && !block.content
                          ? isFirst
                            ? COMP_TOURS_LABELS.抵達目的地
                            : isLast
                              ? COMP_TOURS_LABELS.返回台灣
                              : COMP_TOURS_LABELS.今日行程標題
                          : ''
                      }
                      className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-morandi-gold/30 rounded px-1.5 bg-transparent outline-none"
                      style={{ width: Math.max(60, (block.content?.length || 0) * 14 + 30) }}
                    />
                  )
                })}
              </SortableContext>
              {/* 最後的 mention input（用 @ 搜景點） */}
              <MentionInput
                ref={el => { mentionInputRefs.current[idx] = el }}
                value=""
                onChange={() => {}}
                onAttractionSelect={attraction => {
                  // 插入景點到 blocks 末尾（在最後一個文字塊後面）
                  const newBlocks = [...blocks, { type: 'attraction' as const, id: attraction.id, name: attraction.name }]
                  syncBlocks(newBlocks)
                }}
                countryName={tourLocation}
                attractions={day.attractions}
                placeholder={blocks.length <= 1 && !(blocks[0] as { content?: string })?.content ? '' : '+'}
                className="h-8 w-8 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent px-1 flex-shrink-0"
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
