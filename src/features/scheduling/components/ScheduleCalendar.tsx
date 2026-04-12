'use client'
/**
 * ScheduleCalendar - 甘特圖式調度日曆
 */

import React, { useMemo } from 'react'
import {
  format as formatDate,
  eachDayOfInterval,
  isWithinInterval,
  isSameDay,
  isWeekend,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { parseLocalDate, startOfDay } from '@/lib/utils/format-date'

// 安全的日期格式化函式
function safeFormat(date: Date | null | undefined, formatStr: string): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
  try {
    return formatDate(date, formatStr, { locale: zhTW })
  } catch {
    return ''
  }
}
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { FleetVehicle, FleetSchedule, LeaderSchedule } from '@/types/fleet.types'
import type { TourLeader } from '@/types/tour-leader.types'
import { getVehicleTypeLabel } from '@/types/fleet.types'
import { SCHEDULING_LABELS } from './constants/labels'

interface ScheduleCalendarProps {
  type: 'vehicle' | 'leader'
  resources: FleetVehicle[] | TourLeader[]
  schedules: FleetSchedule[] | LeaderSchedule[]
  dateRange: { start: Date; end: Date }
  viewMode: 'week' | 'month'
  onAddSchedule: (resourceId: string, date: string) => void
  onEditSchedule: (schedule: FleetSchedule | LeaderSchedule) => void
  onDeleteSchedule: (schedule: FleetSchedule | LeaderSchedule) => void
}

// 調度條顏色（根據狀態）
const SCHEDULE_COLORS = {
  confirmed: 'bg-morandi-green/80 border-morandi-green text-white',
  pending: 'bg-morandi-gold/80 border-morandi-gold text-white',
  cancelled: 'bg-morandi-secondary/50 border-morandi-secondary text-morandi-primary line-through',
}

// 安全地生成日期列表
function generateDays(dateRange: { start: Date; end: Date } | null | undefined): Date[] {
  if (!dateRange?.start || !dateRange?.end) return []
  try {
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    const interval = eachDayOfInterval({ start, end })
    return Array.isArray(interval)
      ? interval.filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      : []
  } catch {
    return []
  }
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  type,
  resources,
  schedules,
  dateRange,
  viewMode,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
}) => {
  // 生成日期列表
  const days = useMemo(() => generateDays(dateRange), [dateRange])

  // 按資源分組的調度（必須在條件返回之前）
  const schedulesByResource = useMemo(() => {
    const map = new Map<string, (FleetSchedule | LeaderSchedule)[]>()

    if (!schedules) return map

    schedules.forEach(schedule => {
      const resourceId =
        type === 'vehicle'
          ? (schedule as FleetSchedule).vehicle_id
          : (schedule as LeaderSchedule).leader_id

      if (!map.has(resourceId)) {
        map.set(resourceId, [])
      }
      map.get(resourceId)?.push(schedule)
    })

    return map
  }, [schedules, type])

  // 提前返回：如果沒有有效的日期範圍或資源（必須在所有 hooks 之後）
  if (!days || days.length === 0 || !resources || !schedules) {
    return (
      <div className="h-full flex items-center justify-center border border-border rounded-lg bg-card shadow-sm">
        <span className="text-morandi-secondary">{SCHEDULING_LABELS.LOADING_6912}</span>
      </div>
    )
  }

  // 取得資源名稱
  const getResourceName = (resource: FleetVehicle | TourLeader) => {
    if (type === 'vehicle') {
      const v = resource as FleetVehicle
      return v.vehicle_name || v.license_plate
    } else {
      return (resource as TourLeader).name
    }
  }

  // 取得資源副標題
  const getResourceSubtitle = (resource: FleetVehicle | TourLeader) => {
    if (type === 'vehicle') {
      const v = resource as FleetVehicle
      return `${v.license_plate} · ${getVehicleTypeLabel(v.vehicle_type)}`
    } else {
      const l = resource as TourLeader
      return l.phone || ''
    }
  }

  // 計算調度條的位置和寬度
  const getScheduleStyle = (schedule: FleetSchedule | LeaderSchedule) => {
    const startDate = parseLocalDate(schedule.start_date)
    const endDate = parseLocalDate(schedule.end_date)
    if (!startDate || !endDate) return { gridColumnStart: 2, gridColumnEnd: 'span 1' }

    // 計算開始位置
    let startIndex = days.findIndex(d => isSameDay(startOfDay(d), startOfDay(startDate)))
    if (startIndex < 0) startIndex = 0

    // 計算結束位置
    let endIndex = days.findIndex(d => isSameDay(startOfDay(d), startOfDay(endDate)))
    if (endIndex < 0) endIndex = days.length - 1

    // 計算寬度（跨越的天數）
    const span = endIndex - startIndex + 1

    return {
      gridColumnStart: startIndex + 2, // +2 因為第一列是資源名稱
      gridColumnEnd: `span ${span}`,
    }
  }

  // 檢查該日期是否在調度範圍內
  const isDateInSchedule = (schedule: FleetSchedule | LeaderSchedule, date: Date) => {
    const startDate = parseLocalDate(schedule.start_date)
    const endDate = parseLocalDate(schedule.end_date)
    if (!startDate || !endDate) return false
    return isWithinInterval(startOfDay(date), {
      start: startOfDay(startDate),
      end: startOfDay(endDate),
    })
  }

  // 過濾在當前視圖範圍內的調度
  const getVisibleSchedules = (resourceId: string) => {
    const resourceSchedules = schedulesByResource.get(resourceId) || []
    return resourceSchedules.filter(schedule => {
      const startDate = parseLocalDate(schedule.start_date)
      const endDate = parseLocalDate(schedule.end_date)
      if (!startDate || !endDate) return false
      // 調度與視圖範圍有重疊
      return (
        isWithinInterval(startOfDay(startDate), {
          start: startOfDay(dateRange.start),
          end: startOfDay(dateRange.end),
        }) ||
        isWithinInterval(startOfDay(endDate), {
          start: startOfDay(dateRange.start),
          end: startOfDay(dateRange.end),
        }) ||
        (startDate <= dateRange.start && endDate >= dateRange.end)
      )
    })
  }

  const cellWidth = viewMode === 'week' ? 'min-w-[100px]' : 'min-w-[40px]'
  const headerHeight = 'h-12'
  const rowHeight = 'h-16'

  return (
    <div className="h-full overflow-auto border border-border rounded-lg bg-card shadow-sm">
      <div className="inline-block min-w-full">
        {/* 表頭：日期 */}
        <div
          className="grid sticky top-0 z-20 bg-card border-b border-border shadow-sm"
          style={{
            gridTemplateColumns: `200px repeat(${days.length}, minmax(${viewMode === 'week' ? '100px' : '40px'}, 1fr))`,
          }}
        >
          <div
            className={cn(
              'px-4 flex items-center font-medium text-morandi-primary border-r border-border',
              headerHeight
            )}
          >
            {SCHEDULING_LABELS.LABEL_1014}
          </div>
          {Array.isArray(days) &&
            days.map((day, i) => {
              if (!(day instanceof Date)) return null
              const isToday = isSameDay(day, new Date())
              const isWeekendDay = isWeekend(day)
              return (
                <div
                  key={i}
                  className={cn(
                    'px-2 flex flex-col items-center justify-center text-sm border-r border-border last:border-r-0',
                    headerHeight,
                    isWeekendDay ? 'bg-morandi-red/5' : '',
                    isToday ? 'bg-morandi-gold/10' : ''
                  )}
                >
                  {viewMode === 'week' ? (
                    <>
                      <span className="text-morandi-secondary text-xs">
                        {safeFormat(day, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          isToday ? 'text-morandi-gold' : 'text-morandi-primary'
                        )}
                      >
                        {safeFormat(day, 'd')}
                      </span>
                    </>
                  ) : (
                    <span
                      className={cn(
                        'font-medium',
                        isToday ? 'text-morandi-gold' : 'text-morandi-primary'
                      )}
                    >
                      {safeFormat(day, 'd')}
                    </span>
                  )}
                </div>
              )
            })}
        </div>

        {/* 資源行 */}
        {resources.length === 0 ? (
          <div className="p-8 text-center text-morandi-secondary">
            尚無{type === 'vehicle' ? '車輛' : '領隊'}資料
          </div>
        ) : (
          resources.map(resource => {
            const visibleSchedules = getVisibleSchedules(resource.id)

            return (
              <div
                key={resource.id}
                className="grid border-b border-border last:border-b-0 hover:bg-morandi-container/20"
                style={{
                  gridTemplateColumns: `200px repeat(${days.length}, minmax(${viewMode === 'week' ? '100px' : '40px'}, 1fr))`,
                }}
              >
                {/* 資源名稱 */}
                <div
                  className={cn(
                    'px-4 flex flex-col justify-center border-r border-border bg-card sticky left-0 z-[5]',
                    rowHeight
                  )}
                >
                  <span className="font-medium text-morandi-primary truncate">
                    {getResourceName(resource)}
                  </span>
                  <span className="text-xs text-morandi-secondary truncate">
                    {getResourceSubtitle(resource)}
                  </span>
                </div>

                {/* 日期格子 */}
                {Array.isArray(days) &&
                  days.map((day, dayIndex) => {
                    if (!(day instanceof Date)) return null
                    // 檢查這一天是否被任何調度覆蓋
                    const coveringSchedule = visibleSchedules.find(s => isDateInSchedule(s, day))
                    // 只在調度開始日顯示調度條
                    const startDateParsed = coveringSchedule
                      ? parseLocalDate(coveringSchedule.start_date)
                      : null
                    const startsHere =
                      coveringSchedule &&
                      startDateParsed &&
                      isSameDay(startOfDay(startDateParsed), startOfDay(day))
                    const isToday = isSameDay(day, new Date())
                    const isWeekendDay = isWeekend(day)

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'relative border-r border-border last:border-r-0 group',
                          rowHeight,
                          isWeekendDay ? 'bg-morandi-red/5' : '',
                          isToday ? 'bg-morandi-gold/5' : ''
                        )}
                      >
                        {/* 調度條 - 只在開始日渲染 */}
                        {startsHere && coveringSchedule && (
                          <div
                            className={cn(
                              'absolute top-2 left-1 right-1 h-12 rounded-md border px-2 py-1 cursor-pointer z-[2]',
                              'flex flex-col justify-center overflow-hidden',
                              'hover:shadow-md transition-shadow',
                              SCHEDULE_COLORS[
                                coveringSchedule.status as keyof typeof SCHEDULE_COLORS
                              ] || SCHEDULE_COLORS.confirmed
                            )}
                            style={{
                              width: `calc(${
                                (() => {
                                  const endDate = parseLocalDate(coveringSchedule.end_date)
                                  if (!endDate) return 1
                                  const endIndex = days.findIndex(
                                    d => d && isSameDay(startOfDay(d), startOfDay(endDate))
                                  )
                                  return (endIndex >= 0 ? endIndex : days.length - 1) - dayIndex + 1
                                })() * 100
                              }% - 8px)`,
                            }}
                            onClick={() => onEditSchedule(coveringSchedule)}
                          >
                            <span className="text-xs font-medium truncate">
                              {coveringSchedule.tour_name || coveringSchedule.tour_code || '未命名'}
                            </span>
                            <span className="text-[10px] opacity-80 truncate">
                              {type === 'vehicle'
                                ? (coveringSchedule as FleetSchedule).client_name || ''
                                : (coveringSchedule as LeaderSchedule).destination || ''}
                            </span>
                          </div>
                        )}

                        {/* 新增按鈕 - 只在沒有調度的日子顯示 */}
                        {!coveringSchedule && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute inset-1 opacity-0 group-hover:opacity-100 transition-opacity text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10"
                            onClick={() =>
                              onAddSchedule(resource.id, safeFormat(day, 'yyyy-MM-dd'))
                            }
                          >
                            <Plus size={16} />
                          </Button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
