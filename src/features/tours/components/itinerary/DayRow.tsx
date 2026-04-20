'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Check, Hotel, MapPin, Plane, X } from 'lucide-react'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { DroppableZone } from './DroppableZone'
import { useRestaurants } from '@/data'

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
  lunchAirline?: boolean
  dinnerAirline?: boolean
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

type MealKey = 'breakfast' | 'lunch' | 'dinner'

interface RestaurantItem {
  id: string
  name?: string | null
  english_name?: string | null
}

interface MealComboboxProps {
  mealKey: MealKey
  placeholder: string
  restaurants: RestaurantItem[]
  onPick: (restaurant: { id: string; name: string }) => void
  onPlainText: (text: string) => void
  extraRightPadding: boolean
}

function MealCombobox({
  placeholder,
  restaurants,
  onPick,
  onPlainText,
  extraRightPadding,
}: MealComboboxProps) {
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return [] as RestaurantItem[]
    return restaurants
      .filter(r => {
        const name = (r.name || '').toLowerCase()
        const en = (r.english_name || '').toLowerCase()
        return name.includes(q) || en.includes(q)
      })
      .slice(0, 10)
  }, [restaurants, text])

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const commit = (r: RestaurantItem) => {
    const name = r.name || ''
    onPick({ id: r.id, name })
    setText('')
    setOpen(false)
    setHighlight(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) {
        setOpen(true)
        setHighlight(h => (h < filtered.length - 1 ? h + 1 : h))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h > 0 ? h - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && highlight >= 0 && highlight < filtered.length) {
        commit(filtered[highlight])
      } else if (text.trim()) {
        onPlainText(text.trim())
        setText('')
        setOpen(false)
        setHighlight(-1)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setHighlight(-1)
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        value={text}
        onChange={e => {
          setText(e.target.value)
          setOpen(true)
          setHighlight(-1)
        }}
        onFocus={() => {
          if (text.trim()) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`h-8 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent placeholder:text-muted-foreground/70 ${extraRightPadding ? 'pr-6' : ''}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                commit(r)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                highlight === i ? 'bg-morandi-gold/15' : 'hover:bg-morandi-container/40'
              }`}
            >
              <span className="text-morandi-primary">{r.name}</span>
              {r.english_name && (
                <span className="ml-1 text-muted-foreground">{r.english_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface DayRowProps {
  day: DailyScheduleItem
  idx: number
  isFirst: boolean
  isLast: boolean
  updateDaySchedule: (index: number, field: string, value: string | boolean | undefined) => void
  removeAttraction: (dayIdx: number, attractionId: string) => void
  reorderAttractions: (
    dayIdx: number,
    newOrder: { id: string; name: string; verified?: boolean }[]
  ) => void
  updateBlocks?: (dayIdx: number, blocks: ItineraryBlock[]) => void
  tourLocation: string
  getDateLabel: (idx: number) => string
  getPreviousAccommodation: (index: number) => string
  disabledAttractionIds?: string[]
  onAttractionClick?: (attraction: { id: string; name: string; verified?: boolean }) => void
  onHotelClick?: (hotel: { id: string; name: string }) => void
}

const CELL = 'border-b border-r border-border'
const CELL_LAST = 'border-b border-border'
const CELL_NO_B = 'border-r border-border'
const CELL_LAST_NO_B = ''

export function DayRow({
  day,
  idx,
  isFirst,
  isLast,
  updateDaySchedule,
  removeAttraction,
  reorderAttractions,
  updateBlocks,
  tourLocation,
  getDateLabel,
  getPreviousAccommodation,
  disabledAttractionIds = [],
  onAttractionClick,
  onHotelClick,
}: DayRowProps) {
  // 最後一天的最後一行不需要底線（外框已有）
  const hasNote = day.note !== undefined
  const mainRowIsTableBottom = isLast && !hasNote
  const noteRowIsTableBottom = isLast && hasNote
  const c = mainRowIsTableBottom ? CELL_NO_B : CELL
  const cLast = mainRowIsTableBottom ? CELL_LAST_NO_B : CELL_LAST

  const routeInputRef = React.useRef<HTMLInputElement>(null)

  // 餐廳清單（Combobox 搜尋資料）
  const { items: restaurants } = useRestaurants()
  const restaurantOptions = (restaurants || []) as RestaurantItem[]

  // 選餐廳：寫 meals.xxx + mealIds.xxx，並清掉該餐的 preset flags
  const handlePickRestaurant = React.useCallback(
    (mealKey: MealKey, r: { id: string; name: string }) => {
      updateDaySchedule(idx, `meals.${mealKey}`, r.name)
      updateDaySchedule(idx, `mealIds.${mealKey}`, r.id)
      if (mealKey === 'breakfast') {
        updateDaySchedule(idx, 'hotelBreakfast', false)
      } else if (mealKey === 'lunch') {
        updateDaySchedule(idx, 'lunchSelf', false)
        updateDaySchedule(idx, 'lunchAirline', false)
      } else {
        updateDaySchedule(idx, 'dinnerSelf', false)
        updateDaySchedule(idx, 'dinnerAirline', false)
      }
    },
    [idx, updateDaySchedule]
  )

  // 純文字輸入：寫 meals.xxx，清 mealIds.xxx
  const handlePlainTextMeal = React.useCallback(
    (mealKey: MealKey, text: string) => {
      updateDaySchedule(idx, `meals.${mealKey}`, text)
      updateDaySchedule(idx, `mealIds.${mealKey}`, '')
    },
    [idx, updateDaySchedule]
  )

  // 清除某餐的文字與 id
  const handleClearMeal = React.useCallback(
    (mealKey: MealKey) => {
      updateDaySchedule(idx, `meals.${mealKey}`, '')
      updateDaySchedule(idx, `mealIds.${mealKey}`, '')
    },
    [idx, updateDaySchedule]
  )

  // 勾一個 preset：互斥清掉其他
  const toggleLunchPreset = React.useCallback(
    (which: 'self' | 'airline') => {
      const isSelf = which === 'self'
      const currentlyOn = isSelf ? !!day.lunchSelf : !!day.lunchAirline
      const next = !currentlyOn
      updateDaySchedule(idx, 'lunchSelf', isSelf ? next : false)
      updateDaySchedule(idx, 'lunchAirline', isSelf ? false : next)
      updateDaySchedule(idx, 'meals.lunch', '')
      updateDaySchedule(idx, 'mealIds.lunch', '')
    },
    [idx, day.lunchSelf, day.lunchAirline, updateDaySchedule]
  )

  const toggleDinnerPreset = React.useCallback(
    (which: 'self' | 'airline') => {
      const isSelf = which === 'self'
      const currentlyOn = isSelf ? !!day.dinnerSelf : !!day.dinnerAirline
      const next = !currentlyOn
      updateDaySchedule(idx, 'dinnerSelf', isSelf ? next : false)
      updateDaySchedule(idx, 'dinnerAirline', isSelf ? false : next)
      updateDaySchedule(idx, 'meals.dinner', '')
      updateDaySchedule(idx, 'mealIds.dinner', '')
    },
    [idx, day.dinnerSelf, day.dinnerAirline, updateDaySchedule]
  )

  // 插入景點：名字插到游標位置 + 加到 attractions 列表
  const handleInsertAttraction = React.useCallback(
    (attraction: { id: string; name: string }) => {
      // 加到 attractions 列表（DB 連結）
      const existing = day.attractions || []
      if (existing.some(a => a.id === attraction.id)) return
      const newAttractions = [...existing, attraction]
      reorderAttractions(idx, newAttractions)

      // 插到 route 文字
      const input = routeInputRef.current
      const currentRoute = day.route || ''
      const insertText = attraction.name

      if (input) {
        const pos = input.selectionStart || currentRoute.length
        const before = currentRoute.slice(0, pos)
        const after = currentRoute.slice(pos)
        const separator = before && !before.endsWith(' → ') && !before.endsWith(' ') ? ' → ' : ''
        const newRoute = before + separator + insertText + after
        updateDaySchedule(idx, 'route', newRoute)
      } else {
        const separator = currentRoute ? ' → ' : ''
        updateDaySchedule(idx, 'route', currentRoute + separator + insertText)
      }
    },
    [day.attractions, day.route, idx, reorderAttractions, updateDaySchedule]
  )

  const handleRouteChange = React.useCallback(
    (value: string) => {
      updateDaySchedule(idx, 'route', value)
    },
    [idx, updateDaySchedule]
  )

  const handleRemoveAttraction = React.useCallback(
    (attractionId: string) => {
      const attraction = (day.attractions || []).find(a => a.id === attractionId)
      if (!attraction) return
      removeAttraction(idx, attractionId)

      // 從 route 中移除景點名稱
      const name = attraction.name
      let newRoute = day.route || ''
      // 嘗試匹配各種分隔符模式
      newRoute = newRoute.replace(` → ${name}`, '')
      newRoute = newRoute.replace(`${name} → `, '')
      newRoute = newRoute.replace(name, '')
      newRoute = newRoute.trim()
      if (newRoute !== day.route) {
        updateDaySchedule(idx, 'route', newRoute)
      }
    },
    [day.attractions, day.route, idx, removeAttraction, updateDaySchedule]
  )

  return (
    <tbody>
      <tr className={`${idx % 2 === 1 ? 'bg-muted/5' : ''} group`}>
        {/* Day + date */}
        <td className={`px-2 py-1 ${c} align-middle text-center`}>
          <div className="font-semibold text-morandi-gold text-xs">Day {day.day}</div>
          {getDateLabel(idx) && (
            <div className="text-[10px] text-muted-foreground">{getDateLabel(idx)}</div>
          )}
        </td>
        {/* Route — 文字輸入 + 景點標籤在下排 */}
        <td className={`px-0 py-0 ${c} align-middle`}>
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
                  className="h-8 flex-1 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-morandi-gold/30 rounded px-2 bg-transparent outline-none min-w-0 placeholder:text-muted-foreground/70"
                />
                {/* @ mention 搜景點 - 已移除，改用右側資源庫拖拉 */}
              </div>
              {/* 景點標籤列 */}
              {(day.attractions?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1 px-2 pb-1">
                  {(day.attractions || []).map(a => (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] whitespace-nowrap ${
                        a.verified === false
                          ? 'bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30'
                          : 'bg-morandi-gold/10 text-morandi-gold'
                      } ${onAttractionClick ? 'cursor-pointer hover:bg-morandi-gold/20 transition-colors' : ''}`}
                      title={a.verified === false ? '資料待完善' : undefined}
                      onClick={onAttractionClick ? () => onAttractionClick(a) : undefined}
                    >
                      {a.verified === false && <span className="mr-0.5">⚠</span>}
                      <MapPin size={8} />
                      <span>{a.name}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveAttraction(a.id)
                        }}
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
        <td className={`px-1 py-0 ${c} align-middle`}>
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
                const input = routeInputRef.current
                if (input) {
                  const pos = input.selectionStart || input.value.length
                  const val = input.value
                  const newVal = val.slice(0, pos) + ' ✈ ' + val.slice(pos)
                  handleRouteChange(newVal)
                  setTimeout(() => {
                    input.focus()
                    input.setSelectionRange(pos + 3, pos + 3)
                  }, 0)
                }
              }}
              className="px-1 py-0.5 text-[10px] hover:bg-morandi-gold/20 rounded text-muted-foreground"
              title="插入飛機"
            >
              ✈
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
        <td className={`px-0 py-0 ${c} align-middle hover:bg-morandi-gold/10 transition-colors`}>
          <DroppableZone id={`meal-breakfast-drop-${idx}`} acceptType="restaurant">
            <div className="relative min-h-8 flex items-center">
              {day.hotelBreakfast ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{COMP_TOURS_LABELS.飯店早餐}</span>
                  </div>
                </div>
              ) : day.meals.breakfast ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.breakfast}</span>
                    <button
                      type="button"
                      onClick={() => handleClearMeal('breakfast')}
                      className="hover:text-destructive"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ) : (
                <MealCombobox
                  mealKey="breakfast"
                  placeholder={COMP_TOURS_LABELS.早餐}
                  restaurants={restaurantOptions}
                  onPick={r => handlePickRestaurant('breakfast', r)}
                  onPlainText={t => handlePlainTextMeal('breakfast', t)}
                  extraRightPadding={!isFirst}
                />
              )}
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !day.hotelBreakfast
                    updateDaySchedule(idx, 'hotelBreakfast', next)
                    // 互斥：勾飯店早餐時清餐廳，取消時也清
                    updateDaySchedule(idx, 'meals.breakfast', '')
                    updateDaySchedule(idx, 'mealIds.breakfast', '')
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10"
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
        <td className={`px-0 py-0 ${c} align-middle hover:bg-morandi-gold/10 transition-colors`}>
          <DroppableZone id={`meal-lunch-drop-${idx}`} acceptType="restaurant">
            <div className="relative min-h-8 flex items-center">
              {day.lunchSelf ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{COMP_TOURS_LABELS.敬請自理}</span>
                  </div>
                </div>
              ) : day.lunchAirline ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{COMP_TOURS_LABELS.機上簡餐}</span>
                  </div>
                </div>
              ) : day.meals.lunch ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.lunch}</span>
                    <button
                      type="button"
                      onClick={() => handleClearMeal('lunch')}
                      className="hover:text-destructive"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ) : (
                <MealCombobox
                  mealKey="lunch"
                  placeholder={COMP_TOURS_LABELS.午餐}
                  restaurants={restaurantOptions}
                  onPick={r => handlePickRestaurant('lunch', r)}
                  onPlainText={t => handlePlainTextMeal('lunch', t)}
                  extraRightPadding
                />
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleLunchPreset('self')}
                  title={COMP_TOURS_LABELS.敬請自理}
                >
                  <Check
                    size={12}
                    className={`transition-opacity ${day.lunchSelf ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLunchPreset('airline')}
                  title={COMP_TOURS_LABELS.機上簡餐}
                >
                  <Plane
                    size={12}
                    className={`transition-opacity ${day.lunchAirline ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                  />
                </button>
              </div>
            </div>
          </DroppableZone>
        </td>
        {/* Dinner -- restaurant drop zone */}
        <td
          className={`px-0 py-0 ${cLast} align-middle hover:bg-morandi-gold/10 transition-colors`}
        >
          <DroppableZone id={`meal-dinner-drop-${idx}`} acceptType="restaurant">
            <div className="relative min-h-8 flex items-center">
              {day.dinnerSelf ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{COMP_TOURS_LABELS.敬請自理}</span>
                  </div>
                </div>
              ) : day.dinnerAirline ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{COMP_TOURS_LABELS.機上簡餐}</span>
                  </div>
                </div>
              ) : day.meals.dinner ? (
                <div className="flex items-center px-2">
                  <div className="inline-flex items-center gap-1 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded-full px-2 py-0.5 text-xs">
                    <span>{day.meals.dinner}</span>
                    <button
                      type="button"
                      onClick={() => handleClearMeal('dinner')}
                      className="hover:text-destructive"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ) : (
                <MealCombobox
                  mealKey="dinner"
                  placeholder={COMP_TOURS_LABELS.晚餐}
                  restaurants={restaurantOptions}
                  onPick={r => handlePickRestaurant('dinner', r)}
                  onPlainText={t => handlePlainTextMeal('dinner', t)}
                  extraRightPadding
                />
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleDinnerPreset('self')}
                  title={COMP_TOURS_LABELS.敬請自理}
                >
                  <Check
                    size={12}
                    className={`transition-opacity ${day.dinnerSelf ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => toggleDinnerPreset('airline')}
                  title={COMP_TOURS_LABELS.機上簡餐}
                >
                  <Plane
                    size={12}
                    className={`transition-opacity ${day.dinnerAirline ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
                  />
                </button>
              </div>
            </div>
          </DroppableZone>
        </td>
      </tr>
      {/* Accommodation row -- hotel drop zone (not for last day) */}
      {!isLast && (
        <tr className={idx % 2 === 1 ? 'bg-muted/5' : ''}>
          <td
            className={`px-2 py-0 ${CELL} align-middle text-center text-[10px] text-morandi-gold font-medium`}
          >
            <Hotel size={10} className="inline mx-auto" />
          </td>
          <td colSpan={4} className={`px-0 py-0 ${CELL} align-middle`}>
            <DroppableZone id={`hotel-drop-${idx}`} acceptType="hotel">
              {day.sameAsPrevious ? (
                <div className="h-7 flex items-center px-2 text-sm text-muted-foreground">
                  續住 ({getPreviousAccommodation(idx) || '-'})
                </div>
              ) : day.accommodation ? (
                <div className="h-7 flex items-center px-2">
                  <div
                    className={`inline-flex items-center gap-1 bg-status-info/10 text-status-info border border-status-info/30 rounded-full px-2 py-0.5 text-xs ${onHotelClick && day.accommodationId ? 'cursor-pointer hover:bg-status-info/20 transition-colors' : ''}`}
                    onClick={
                      onHotelClick && day.accommodationId
                        ? () => onHotelClick({ id: day.accommodationId!, name: day.accommodation })
                        : undefined
                    }
                  >
                    <Hotel size={10} />
                    <span>{day.accommodation}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        updateDaySchedule(idx, 'accommodation', '')
                      }}
                      className="hover:text-destructive"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-7 flex items-center px-2 text-sm text-muted-foreground/70">
                  拖拽酒店到此處...
                </div>
              )}
            </DroppableZone>
          </td>
          <td className={`px-1 py-0 ${CELL_LAST} align-middle text-center`}>
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
          <td
            className={`px-2 py-0 ${noteRowIsTableBottom ? CELL_NO_B : CELL} align-middle text-[10px] text-morandi-gold font-medium`}
          >
            PS
          </td>
          <td
            colSpan={5}
            className={`px-0 py-0 ${noteRowIsTableBottom ? CELL_LAST_NO_B : CELL_LAST} align-middle`}
          >
            <Input
              value={day.note || ''}
              onChange={e => updateDaySchedule(idx, 'note', e.target.value)}
              placeholder="輸入備註..."
              className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent text-muted-foreground placeholder:text-muted-foreground/70"
            />
          </td>
        </tr>
      )}
    </tbody>
  )
}
