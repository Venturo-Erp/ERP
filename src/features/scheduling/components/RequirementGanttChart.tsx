'use client'
/**
 * RequirementGanttChart - 需求驅動的甘特圖
 *
 * 左側：需求甘特圖（專案名稱 + 日期格子）
 * 右側：可展開資源庫存面板（車輛/領隊）
 */

import React, { useMemo, useState } from 'react'
import { format, eachDayOfInterval, isSameDay, isWeekend, isWithinInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { parseLocalDate, startOfDay } from '@/lib/utils/format-date'
import {
  Bus,
  Users,
  Package,
  ChevronRight,
  ChevronLeft,
  Check,
  Truck,
  UserCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { FleetVehicle } from '@/types/fleet.types'
import type { TourLeader } from '@/types/tour-leader.types'
import type { LeaderAvailability } from '@/stores/leader-availability-store'
import type { AvailableResource } from '../hooks/useSupplierResponses'
import { SCHEDULING_LABELS } from './constants/labels'

// 需求單類型
interface TourRequest {
  id: string
  code: string
  category: string
  tour_id: string | null
  tour_code: string | null
  tour_name: string | null
  supplier_name: string | null
  title: string | null
  service_date: string | null
  service_date_end: string | null
  quantity: number | null
  status: string
  handler_type: string
  description: string | null
  notes: string | null
  assigned_vehicle_id?: string | null
  assigned_leader_id?: string | null
  // 跨公司需求欄位
  recipient_workspace_id?: string | null
  response_status?: string | null
}

// 展開後的需求列（每個數量一列）
interface RequirementRow {
  id: string // `${request.id}-${index}`
  requestId: string
  tourName: string
  tourCode: string | null
  supplierName: string | null
  title: string | null
  serviceDate: string | null
  serviceDateEnd: string | null
  quantity: number
  index: number // 第幾個（1-based）
  totalCount: number // 總數
  status: string
  category: string
  assignedVehicleId: string | null
  assignedLeaderId: string | null
  // 跨公司需求欄位
  recipientWorkspaceId: string | null
  responseStatus: string | null
}

// 回覆狀態配置
const RESPONSE_STATUS_COLORS: Record<string, { label: string; color: string }> = {
  pending: { label: '待回覆', color: 'bg-morandi-gold/20 text-morandi-gold border-morandi-gold' },
  responded: { label: '已回覆', color: 'bg-morandi-blue/20 text-morandi-blue border-morandi-blue' },
  accepted: {
    label: '已接受',
    color: 'bg-morandi-green/20 text-morandi-green border-morandi-green',
  },
  rejected: { label: '已拒絕', color: 'bg-morandi-red/20 text-morandi-red border-morandi-red' },
}

interface RequirementGanttChartProps {
  type: 'vehicle' | 'leader'
  requests: TourRequest[]
  dateRange: { start: Date; end: Date }
  viewMode: 'week' | 'month'
  vehicles?: FleetVehicle[]
  leaders?: TourLeader[]
  // 新增：領隊可用檔期
  leaderAvailability?: LeaderAvailability[]
  // 新增：供應商回覆的可用資源
  supplierResources?: AvailableResource[]
  onRowClick?: (row: RequirementRow) => void
  onAssign?: (requestId: string, resourceId: string, index: number) => void
  // 新增：選擇供應商資源
  onSelectSupplierResource?: (resource: AvailableResource, requestId: string) => void
}

// 安全的日期格式化
function safeFormat(date: Date | null | undefined, formatStr: string): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
  try {
    return format(date, formatStr, { locale: zhTW })
  } catch {
    return ''
  }
}

// 生成日期列表
function generateDays(dateRange: { start: Date; end: Date }): Date[] {
  try {
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    return eachDayOfInterval({ start, end })
  } catch {
    return []
  }
}

// 狀態顏色
const STATUS_COLORS = {
  draft: 'bg-morandi-secondary/60 border-morandi-secondary',
  pending: 'bg-morandi-gold/70 border-morandi-gold',
  confirmed: 'bg-morandi-green/70 border-morandi-green',
  completed: 'bg-status-info-bg border-status-info/30',
  cancelled: 'bg-morandi-red/50 border-morandi-red line-through',
}

export const RequirementGanttChart: React.FC<RequirementGanttChartProps> = ({
  type,
  requests,
  dateRange,
  viewMode,
  vehicles = [],
  leaders = [],
  leaderAvailability = [],
  supplierResources = [],
  onRowClick,
  onAssign,
  onSelectSupplierResource,
}) => {
  // 側邊面板狀態
  const [showResourcePanel, setShowResourcePanel] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  // 資源面板分頁：'internal' = 內部資源, 'available' = 可用資源（領隊檔期）, 'supplier' = 供應商回覆
  const [resourceTab, setResourceTab] = useState<'internal' | 'available' | 'supplier'>('internal')

  // 生成日期列表
  const days = useMemo(() => generateDays(dateRange), [dateRange])

  // 將需求展開為多列（根據 quantity）
  const rows = useMemo((): RequirementRow[] => {
    const result: RequirementRow[] = []

    for (const req of requests) {
      const quantity = req.quantity || 1
      const tourName = req.tour_name || req.supplier_name || '未命名專案'

      for (let i = 0; i < quantity; i++) {
        result.push({
          id: `${req.id}-${i}`,
          requestId: req.id,
          tourName,
          tourCode: req.tour_code,
          supplierName: req.supplier_name,
          title: req.title,
          serviceDate: req.service_date,
          serviceDateEnd: req.service_date_end,
          quantity,
          index: i + 1,
          totalCount: quantity,
          status: req.status,
          category: req.category,
          assignedVehicleId: req.assigned_vehicle_id || null,
          assignedLeaderId: req.assigned_leader_id || null,
          recipientWorkspaceId: req.recipient_workspace_id || null,
          responseStatus: req.response_status || null,
        })
      }
    }

    // 按日期排序
    result.sort((a, b) => {
      const dateA = a.serviceDate || ''
      const dateB = b.serviceDate || ''
      return dateA.localeCompare(dateB)
    })

    return result
  }, [requests])

  // 計算在日期範圍內有空的領隊
  const availableLeadersForRange = useMemo(() => {
    if (type !== 'leader' || leaderAvailability.length === 0) return []

    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')

    // 找出在日期範圍內有可用/暫定狀態的領隊
    const availableMap = new Map<string, { status: string; dateRange: string }>()

    leaderAvailability.forEach(avail => {
      if (avail.status === 'blocked') return

      // 檢查可用時間是否與視圖日期範圍重疊
      const availStart = avail.available_start_date
      const availEnd = avail.available_end_date
      const overlaps = availStart <= endStr && availEnd >= startStr

      if (overlaps) {
        const existing = availableMap.get(avail.leader_id)
        const status = avail.status || 'available'
        // 優先顯示 available 狀態
        if (!existing || (status === 'available' && existing.status === 'tentative')) {
          availableMap.set(avail.leader_id, {
            status,
            dateRange: `${avail.available_start_date} ~ ${avail.available_end_date}`,
          })
        }
      }
    })

    // 轉換為帶領隊資訊的陣列
    return Array.from(availableMap.entries())
      .map(([leaderId, info]) => {
        const leader = leaders.find(l => l.id === leaderId)
        if (!leader) return null
        return {
          leader,
          status: info.status,
          dateRange: info.dateRange,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [type, leaderAvailability, leaders, dateRange])

  // 過濾供應商回覆的資源（根據類型）
  const filteredSupplierResources = useMemo(() => {
    return supplierResources.filter(r => {
      if (type === 'vehicle') return r.type === 'vehicle'
      if (type === 'leader') return r.type === 'leader'
      return true
    })
  }, [supplierResources, type])

  // 取得資源名稱
  const getResourceName = (row: RequirementRow): string | null => {
    if (type === 'vehicle' && row.assignedVehicleId) {
      const vehicle = vehicles.find(v => v.id === row.assignedVehicleId)
      return vehicle ? vehicle.vehicle_name || vehicle.license_plate : null
    }
    if (type === 'leader' && row.assignedLeaderId) {
      const leader = leaders.find(l => l.id === row.assignedLeaderId)
      return leader?.name || null
    }
    return null
  }

  // 處理資源分配
  const handleAssign = (resourceId: string) => {
    if (!selectedRowId || !onAssign) return
    const row = rows.find(r => r.id === selectedRowId)
    if (row) {
      onAssign(row.requestId, resourceId, row.index)
      setSelectedRowId(null)
    }
  }

  // 檢查日期是否在需求範圍內
  const isDateInRange = (row: RequirementRow, date: Date): boolean => {
    const start = parseLocalDate(row.serviceDate)
    if (!start) return false
    const end = parseLocalDate(row.serviceDateEnd) || start
    return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) })
  }

  // 計算甘特條的起始位置和寬度
  const getBarStyle = (
    row: RequirementRow,
    dayIndex: number,
    day: Date
  ): { show: boolean; isStart: boolean; isEnd: boolean } => {
    const start = parseLocalDate(row.serviceDate)
    if (!start) return { show: false, isStart: false, isEnd: false }
    const end = parseLocalDate(row.serviceDateEnd) || start

    // 使用 startOfDay 確保比較時不受時間影響
    const dayStart = startOfDay(day)
    const startDay = startOfDay(start)
    const endDay = startOfDay(end)

    const isInRange = isWithinInterval(dayStart, { start: startDay, end: endDay })
    const isStartDay = isSameDay(dayStart, startDay)
    const isEndDay = isSameDay(dayStart, endDay)

    return { show: isInRange, isStart: isStartDay, isEnd: isEndDay }
  }

  if (days.length === 0) {
    return (
      <div className="h-full flex items-center justify-center border border-border rounded-lg bg-card">
        <span className="text-morandi-secondary">{SCHEDULING_LABELS.LOADING_6912}</span>
      </div>
    )
  }

  const Icon = type === 'vehicle' ? Bus : Users
  const resources = type === 'vehicle' ? vehicles : leaders

  return (
    <div className="h-full flex gap-2">
      {/* 左側：主要甘特圖區域 */}
      <div className="flex-1 min-w-0 overflow-auto border border-border rounded-lg bg-card shadow-sm">
        <div className="inline-block min-w-full">
          {/* 表頭 */}
          <div
            className="grid sticky top-0 z-20 bg-card border-b border-border shadow-sm"
            style={{
              gridTemplateColumns: `220px repeat(${days.length}, minmax(${viewMode === 'week' ? '80px' : '35px'}, 1fr))`,
            }}
          >
            <div className="px-4 h-12 flex items-center font-medium text-morandi-primary border-r border-border gap-2">
              <Icon size={16} className="text-morandi-gold" />
              {type === 'vehicle' ? '交通需求' : '領隊需求'}
            </div>
            {days.map((day, i) => {
              const isToday = isSameDay(day, new Date())
              const isWeekendDay = isWeekend(day)
              return (
                <div
                  key={i}
                  className={cn(
                    'px-1 h-12 flex flex-col items-center justify-center text-xs border-r border-border last:border-r-0',
                    isWeekendDay ? 'bg-morandi-red/5' : '',
                    isToday ? 'bg-morandi-gold/10' : ''
                  )}
                >
                  {viewMode === 'week' ? (
                    <>
                      <span className="text-morandi-secondary text-[10px]">
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

          {/* 需求列表 */}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-morandi-secondary">
              尚無{type === 'vehicle' ? '交通' : '領隊'}需求
            </div>
          ) : (
            rows.map(row => {
              const assignedName = getResourceName(row)
              const isSelected = selectedRowId === row.id

              return (
                <div
                  key={row.id}
                  className={cn(
                    'grid border-b border-border last:border-b-0 cursor-pointer transition-colors',
                    isSelected ? 'bg-morandi-gold/10' : 'hover:bg-morandi-container/20'
                  )}
                  style={{
                    gridTemplateColumns: `220px repeat(${days.length}, minmax(${viewMode === 'week' ? '80px' : '35px'}, 1fr))`,
                  }}
                  onClick={() => {
                    setSelectedRowId(isSelected ? null : row.id)
                    onRowClick?.(row)
                  }}
                >
                  {/* 專案名稱 + 已分配資源 */}
                  <div className="px-3 py-2 flex flex-col justify-center border-r border-border bg-card sticky left-0 z-[5]">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-morandi-primary text-sm truncate">
                        {row.tourName}
                      </span>
                      {row.totalCount > 1 && (
                        <span className="text-xs text-morandi-secondary whitespace-nowrap">
                          ({row.index}/{row.totalCount})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {assignedName ? (
                        <span className="text-morandi-green flex items-center gap-1">
                          <Check size={10} />
                          {assignedName}
                        </span>
                      ) : (
                        <span className="text-morandi-secondary">
                          {row.tourCode || row.title || '未分配'}
                        </span>
                      )}
                      {/* 跨公司需求的回覆狀態 */}
                      {row.recipientWorkspaceId && row.responseStatus && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] border',
                            RESPONSE_STATUS_COLORS[row.responseStatus]?.color ||
                              'bg-morandi-container text-morandi-secondary'
                          )}
                        >
                          {RESPONSE_STATUS_COLORS[row.responseStatus]?.label || row.responseStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 日期格子 */}
                  {days.map((day, dayIndex) => {
                    const { show, isStart, isEnd } = getBarStyle(row, dayIndex, day)
                    const isToday = isSameDay(day, new Date())
                    const isWeekendDay = isWeekend(day)
                    const statusColor = assignedName
                      ? 'bg-morandi-green/70 border-morandi-green'
                      : STATUS_COLORS[row.status as keyof typeof STATUS_COLORS] ||
                        STATUS_COLORS.draft

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'relative h-12 border-r border-border last:border-r-0',
                          isWeekendDay ? 'bg-morandi-red/5' : '',
                          isToday ? 'bg-morandi-gold/5' : ''
                        )}
                      >
                        {show && (
                          <div
                            className={cn(
                              'absolute top-2 bottom-2 border-y',
                              statusColor,
                              isStart ? 'left-1 rounded-l-md border-l' : 'left-0',
                              isEnd ? 'right-1 rounded-r-md border-r' : 'right-0'
                            )}
                          >
                            {isStart && viewMode === 'week' && (
                              <span className="px-2 text-xs text-white font-medium truncate">
                                {assignedName || row.tourName}
                              </span>
                            )}
                          </div>
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

      {/* 右側：資源庫存面板 */}
      <div
        className={cn(
          'border border-border rounded-lg bg-card shadow-sm transition-all overflow-hidden flex-shrink-0 flex flex-col',
          showResourcePanel ? 'w-[240px]' : 'w-[40px]'
        )}
      >
        {/* 面板標題 */}
        <div
          className="h-12 px-2 flex items-center justify-between border-b border-border bg-morandi-container/60 cursor-pointer flex-shrink-0"
          onClick={() => setShowResourcePanel(!showResourcePanel)}
        >
          {showResourcePanel ? (
            <>
              <div className="flex items-center gap-2">
                <Package size={16} className="text-morandi-gold" />
                <span className="font-medium text-morandi-primary text-sm">
                  {SCHEDULING_LABELS.LABEL_7348}
                </span>
              </div>
              <ChevronRight size={16} className="text-morandi-secondary" />
            </>
          ) : (
            <ChevronLeft size={16} className="text-morandi-secondary mx-auto" />
          )}
        </div>

        {/* 分頁標籤 */}
        {showResourcePanel && (
          <div className="flex border-b border-border flex-shrink-0">
            <button
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                resourceTab === 'internal'
                  ? 'bg-morandi-gold/10 text-morandi-gold border-b-2 border-morandi-gold'
                  : 'text-morandi-secondary hover:bg-morandi-container/30'
              )}
              onClick={() => setResourceTab('internal')}
            >
              <div className="flex items-center justify-center gap-1">
                {type === 'vehicle' ? <Truck size={12} /> : <Users size={12} />}
                <span>{SCHEDULING_LABELS.LABEL_3084}</span>
              </div>
            </button>
            {type === 'leader' && (
              <button
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                  resourceTab === 'available'
                    ? 'bg-morandi-green/10 text-morandi-green border-b-2 border-morandi-green'
                    : 'text-morandi-secondary hover:bg-morandi-container/30'
                )}
                onClick={() => setResourceTab('available')}
              >
                <div className="flex items-center justify-center gap-1">
                  <UserCheck size={12} />
                  <span>{SCHEDULING_LABELS.LABEL_763}</span>
                </div>
              </button>
            )}
            <button
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                resourceTab === 'supplier'
                  ? 'bg-morandi-blue/10 text-morandi-blue border-b-2 border-morandi-blue'
                  : 'text-morandi-secondary hover:bg-morandi-container/30'
              )}
              onClick={() => setResourceTab('supplier')}
            >
              <div className="flex items-center justify-center gap-1">
                <Building2 size={12} />
                <span>{SCHEDULING_LABELS.LABEL_7036}</span>
              </div>
            </button>
          </div>
        )}

        {/* 資源列表 */}
        {showResourcePanel && (
          <div className="overflow-y-auto flex-1">
            {/* 內部資源 */}
            {resourceTab === 'internal' && (
              <>
                {resources.length === 0 ? (
                  <div className="p-4 text-center text-morandi-secondary text-xs">
                    尚無{type === 'vehicle' ? '車輛' : '領隊'}
                  </div>
                ) : (
                  resources.map(resource => {
                    const resourceId = resource.id
                    const resourceName =
                      type === 'vehicle'
                        ? (resource as FleetVehicle).vehicle_name ||
                          (resource as FleetVehicle).license_plate
                        : (resource as TourLeader).name
                    const resourceSubtitle =
                      type === 'vehicle'
                        ? (resource as FleetVehicle).license_plate
                        : (resource as TourLeader).phone

                    return (
                      <div
                        key={resourceId}
                        className={cn(
                          'px-3 py-2 border-b border-border/50 transition-colors',
                          selectedRowId
                            ? 'hover:bg-morandi-gold/20 cursor-pointer'
                            : 'hover:bg-morandi-container/20'
                        )}
                        onClick={() => selectedRowId && handleAssign(resourceId)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} className="text-morandi-secondary" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-morandi-primary truncate">
                              {resourceName}
                            </div>
                            {resourceSubtitle && resourceSubtitle !== resourceName && (
                              <div className="text-xs text-morandi-secondary truncate">
                                {resourceSubtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedRowId && (
                          <div className="mt-1 text-xs text-morandi-gold">
                            {SCHEDULING_LABELS.LABEL_1593}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* 可用領隊（從 leader_availability 來） */}
            {resourceTab === 'available' && type === 'leader' && (
              <>
                {availableLeadersForRange.length === 0 ? (
                  <div className="p-4 text-center text-morandi-secondary text-xs">
                    {SCHEDULING_LABELS.LABEL_2370}
                  </div>
                ) : (
                  availableLeadersForRange.map(item => (
                    <div
                      key={item.leader.id}
                      className={cn(
                        'px-3 py-2 border-b border-border/50 transition-colors',
                        selectedRowId
                          ? 'hover:bg-morandi-green/20 cursor-pointer'
                          : 'hover:bg-morandi-container/20'
                      )}
                      onClick={() => selectedRowId && handleAssign(item.leader.id)}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-morandi-green" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-morandi-primary truncate">
                            {item.leader.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1 py-0',
                                item.status === 'available'
                                  ? 'border-morandi-green text-morandi-green'
                                  : 'border-morandi-gold text-morandi-gold'
                              )}
                            >
                              {item.status === 'available' ? '可用' : '暫定'}
                            </Badge>
                            <span className="text-morandi-secondary truncate">
                              {item.dateRange}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedRowId && (
                        <div className="mt-1 text-xs text-morandi-green">
                          {SCHEDULING_LABELS.LABEL_1593}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {/* 供應商回覆的資源 */}
            {resourceTab === 'supplier' && (
              <>
                {filteredSupplierResources.length === 0 ? (
                  <div className="p-4 text-center text-morandi-secondary text-xs">
                    {SCHEDULING_LABELS.EMPTY_1509}
                  </div>
                ) : (
                  filteredSupplierResources.map(resource => (
                    <div
                      key={resource.id}
                      className={cn(
                        'px-3 py-2 border-b border-border/50 transition-colors',
                        selectedRowId
                          ? 'hover:bg-morandi-blue/20 cursor-pointer'
                          : 'hover:bg-morandi-container/20'
                      )}
                      onClick={() => {
                        if (selectedRowId && onSelectSupplierResource) {
                          const row = rows.find(r => r.id === selectedRowId)
                          if (row) {
                            onSelectSupplierResource(resource, row.requestId)
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-morandi-blue" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-morandi-primary truncate">
                            {resource.name}
                          </div>
                          <div className="text-xs text-morandi-secondary truncate">
                            {resource.supplierName}
                          </div>
                          {resource.unitPrice && (
                            <div className="text-xs text-morandi-gold">
                              NT$ {resource.unitPrice.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1 py-0',
                            resource.status === 'accepted'
                              ? 'border-morandi-green text-morandi-green'
                              : 'border-morandi-blue text-morandi-blue'
                          )}
                        >
                          {resource.status === 'accepted' ? '已接受' : '待確認'}
                        </Badge>
                      </div>
                      {selectedRowId && (
                        <div className="mt-1 text-xs text-morandi-blue">
                          {SCHEDULING_LABELS.LABEL_3368}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
