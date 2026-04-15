'use client'

import { useMemo } from 'react'
import { useToursSlim, useOrdersSlim } from '@/data'
import type { StatConfig, StatType } from '../types'
import type { Tour, Order } from '@/stores/types'
import { CheckSquare, TrendingUp, Briefcase, Calendar } from 'lucide-react'
import { DASHBOARD_LABELS } from '../constants/labels'

// 計算週範圍（weekOffset: 0 = 本週, 1 = 下週, -1 = 上週）
function getWeekRange(weekOffset = 0): { start: Date; end: Date } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() + mondayOffset + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { start: weekStart, end: weekEnd }
}

// 計算月份範圍（monthOffset: 0 = 本月, 1 = 下月, -1 = 上月）
function getMonthRange(monthOffset = 0): { start: Date; end: Date } {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset + 1,
    0,
    23,
    59,
    59,
    999
  )
  return { start: monthStart, end: monthEnd }
}

// 篩選指定日期範圍內的旅遊團
function filterToursByDateRange(tours: Tour[], start: Date, end: Date): Tour[] {
  return tours.filter(tour => {
    if (!tour.departure_date) return false
    const departureDate = new Date(tour.departure_date)
    return departureDate >= start && departureDate <= end
  })
}

// 計算指定日期範圍內訂單的金額總和
function sumOrderAmountByTourDateRange(
  orders: Order[],
  tours: Tour[],
  start: Date,
  end: Date,
  amountField: 'total_amount' | 'paid_amount'
): number {
  const tourIdsInRange = new Set(filterToursByDateRange(tours, start, end).map(t => t.id))
  return orders
    .filter(order => tourIdsInRange.has(order.tour_id || ''))
    .reduce((sum, order) => sum + (order[amountField] || 0), 0)
}

/**
 * Dashboard 統計資料 Hook
 *
 * ⚠️ 效能注意 (DASH-03):
 * 目前載入所有 tours 和 orders 後在前端計算統計。
 * 當資料量大時，建議改用以下方式優化：
 * 1. 建立 `/api/dashboard/stats` API 在後端計算
 * 2. 或使用 Supabase RPC 函數進行聚合查詢
 * 由於 stats widget 預設未啟用，暫時保留現有實作。
 */
export function useStatsData() {
  const { items: tours } = useToursSlim()
  const { items: orders } = useOrdersSlim()

  return useMemo(() => {
    const today = new Date()

    // 過濾掉特殊團
    const normalTours = tours.filter(t => t.status !== 'special')

    // 計算時間範圍
    const thisWeek = getWeekRange(0)
    const nextWeek = getWeekRange(1)
    const thisMonth = getMonthRange(0)

    // 本週/本月出團數量
    const toursThisWeek = filterToursByDateRange(normalTours, thisWeek.start, thisWeek.end).length
    const toursThisMonth = filterToursByDateRange(
      normalTours,
      thisMonth.start,
      thisMonth.end
    ).length

    // 本週/下週請款金額
    const paymentsThisWeek = sumOrderAmountByTourDateRange(
      orders,
      normalTours,
      thisWeek.start,
      thisWeek.end,
      'total_amount'
    )
    const paymentsNextWeek = sumOrderAmountByTourDateRange(
      orders,
      normalTours,
      nextWeek.start,
      nextWeek.end,
      'total_amount'
    )

    // 本週甲存金額
    const depositsThisWeek = sumOrderAmountByTourDateRange(
      orders,
      normalTours,
      thisWeek.start,
      thisWeek.end,
      'paid_amount'
    )

    // 待辦事項數量（未收齊款且 14 天內出發的訂單）
    const tourIdSet = new Set(normalTours.map(t => t.id))
    const todosCount = orders.filter(order => {
      if (order.payment_status === 'paid') return false
      if (!order.tour_id || !tourIdSet.has(order.tour_id)) return false
      const tour = normalTours.find(t => t.id === order.tour_id)
      if (!tour || !tour.departure_date) return false
      const departureDate = new Date(tour.departure_date)
      const daysUntilDeparture = Math.ceil(
        (departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysUntilDeparture <= 14 && daysUntilDeparture >= 0
    }).length

    const allStats: StatConfig[] = [
      {
        id: 'todos',
        label: DASHBOARD_LABELS.statTodos,
        value: todosCount,
        icon: CheckSquare,
        color: 'text-morandi-gold',
        bgColor: 'bg-morandi-gold/10',
      },
      {
        id: 'paymentsThisWeek',
        label: DASHBOARD_LABELS.statPaymentsThisWeek,
        value: `NT$ ${paymentsThisWeek.toLocaleString()}`,
        icon: TrendingUp,
        color: 'text-status-success',
        bgColor: 'bg-status-success-bg',
      },
      {
        id: 'paymentsNextWeek',
        label: DASHBOARD_LABELS.statPaymentsNextWeek,
        value: `NT$ ${paymentsNextWeek.toLocaleString()}`,
        icon: TrendingUp,
        color: 'text-status-info',
        bgColor: 'bg-status-info-bg',
      },
      {
        id: 'depositsThisWeek',
        label: DASHBOARD_LABELS.statDepositsThisWeek,
        value: `NT$ ${depositsThisWeek.toLocaleString()}`,
        icon: Briefcase,
        color: 'text-cat-purple',
        bgColor: 'bg-cat-purple-bg',
      },
      {
        id: 'toursThisWeek',
        label: DASHBOARD_LABELS.statToursThisWeek,
        value: `${toursThisWeek} ${DASHBOARD_LABELS.statTourUnit}`,
        icon: Calendar,
        color: 'text-status-warning',
        bgColor: 'bg-status-warning-bg',
      },
      {
        id: 'toursThisMonth',
        label: DASHBOARD_LABELS.statToursThisMonth,
        value: `${toursThisMonth} ${DASHBOARD_LABELS.statTourUnit}`,
        icon: Calendar,
        color: 'text-cat-pink',
        bgColor: 'bg-cat-pink-bg',
      },
    ]

    return allStats
  }, [tours, orders])
}

export function useStatsConfig() {
  const loadStatsConfig = (): StatType[] => {
    if (typeof window === 'undefined') {
      return [
        'todos',
        'paymentsThisWeek',
        'paymentsNextWeek',
        'depositsThisWeek',
        'toursThisWeek',
        'toursThisMonth',
      ]
    }
    const saved = localStorage.getItem('homepage-stats-config')
    if (saved) {
      return JSON.parse(saved)
    }
    return [
      'todos',
      'paymentsThisWeek',
      'paymentsNextWeek',
      'depositsThisWeek',
      'toursThisWeek',
      'toursThisMonth',
    ]
  }

  return loadStatsConfig()
}

export function saveStatsConfig(config: StatType[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('homepage-stats-config', JSON.stringify(config))
  }
}
