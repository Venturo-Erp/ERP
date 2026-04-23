/**
 * Analytics Service
 * 核心分析服務
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import type {
  DateRange,
  MetricResult,
  ChartData,
  TimeSeriesData,
  TourMetrics,
  OrderMetrics,
  CustomerMetrics,
  FinancialMetrics,
} from './types'

export class AnalyticsService {
  private workspaceId: string

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId
  }

  // ==================== 旅遊團分析 ====================

  async getTourMetrics(dateRange?: DateRange): Promise<TourMetrics> {
    try {
      let query = supabase
        .from('tours')
        .select(
          'id, status, total_revenue, total_cost, current_participants, departure_date, archived, archive_reason'
        )
        .eq('workspace_id', this.workspaceId)

      if (dateRange) {
        query = query
          .gte('departure_date', this.formatDate(dateRange.start))
          .lte('departure_date', this.formatDate(dateRange.end))
      }

      const { data: tours, error } = await query

      if (error) throw error

      const toursData = tours || []
      const totalRevenue = toursData.reduce((sum, t) => sum + (t.total_revenue || 0), 0)
      const totalCost = toursData.reduce((sum, t) => sum + (t.total_cost || 0), 0)
      const totalParticipants = toursData.reduce((sum, t) => sum + (t.current_participants || 0), 0)

      return {
        totalTours: toursData.length,
        activeTours: toursData.filter(t => t.status === TOUR_STATUS.UPCOMING).length,
        completedTours: toursData.filter(t => t.status === TOUR_STATUS.CLOSED).length,
        // 取消已改為封存維度（archive_reason='cancelled'）
        cancelledTours: toursData.filter(
          t => t.archived === true && t.archive_reason === 'cancelled'
        ).length,
        totalParticipants,
        averageGroupSize: toursData.length > 0 ? totalParticipants / toursData.length : 0,
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      }
    } catch (error) {
      logger.error('Failed to get tour metrics', { error })
      return this.getEmptyTourMetrics()
    }
  }

  // ==================== 訂單分析 ====================

  async getOrderMetrics(dateRange?: DateRange): Promise<OrderMetrics> {
    try {
      let query = supabase
        .from('orders')
        .select('id, total_amount, payment_status, created_at')
        .eq('workspace_id', this.workspaceId)

      if (dateRange) {
        query = query
          .gte('created_at', this.formatDate(dateRange.start))
          .lte('created_at', this.formatDate(dateRange.end))
      }

      const { data: orders, error } = await query

      if (error) throw error

      const ordersData = orders || []
      const totalAmount = ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const paidAmount = ordersData
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const paidOrders = ordersData.filter(o => o.payment_status === 'paid').length

      return {
        totalOrders: ordersData.length,
        paidOrders,
        unpaidOrders: ordersData.length - paidOrders,
        totalAmount,
        paidAmount,
        unpaidAmount: totalAmount - paidAmount,
        averageOrderValue: ordersData.length > 0 ? totalAmount / ordersData.length : 0,
        paymentRate: ordersData.length > 0 ? (paidOrders / ordersData.length) * 100 : 0,
      }
    } catch (error) {
      logger.error('Failed to get order metrics', { error })
      return this.getEmptyOrderMetrics()
    }
  }

  // ==================== 客戶分析 ====================

  async getCustomerMetrics(dateRange?: DateRange): Promise<CustomerMetrics> {
    try {
      let query = supabase
        .from('customers')
        .select('id, created_at')
        .eq('workspace_id', this.workspaceId)

      const { data: customers, error } = await query

      if (error) throw error

      const customersData = customers || []

      // 計算新客戶（在日期範圍內建立的）
      let newCustomers = customersData.length
      if (dateRange) {
        newCustomers = customersData.filter(c => {
          if (!c.created_at) return false
          const createdAt = new Date(c.created_at)
          return createdAt >= new Date(dateRange.start) && createdAt <= new Date(dateRange.end)
        }).length
      }

      // [Planned] 回購率計算需關聯訂單資料，待效能優化後實作
      const repeatCustomers = 0

      return {
        totalCustomers: customersData.length,
        newCustomers,
        repeatCustomers,
        averageLifetimeValue: 0, // [Planned] 客戶終身價值 (LTV) 計算
        retentionRate: 0, // [Planned] 留存率計算
      }
    } catch (error) {
      logger.error('Failed to get customer metrics', { error })
      return this.getEmptyCustomerMetrics()
    }
  }

  // ==================== 財務分析 ====================

  async getFinancialMetrics(dateRange?: DateRange): Promise<FinancialMetrics> {
    try {
      const tourMetrics = await this.getTourMetrics(dateRange)

      // 取得應收帳款（未收款的收款單）
      // receipt_orders 沒有 status/workspace_id，改用 receipts 表
      let receiptQuery = supabase
        .from('receipts')
        .select('total_amount')
        .eq('workspace_id', this.workspaceId)
        .neq('status', 'paid')

      const { data: receipts } = await receiptQuery
      const accountsReceivable = (receipts || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)

      // 取得應付帳款（未付款的請款單）
      let paymentQuery = supabase
        .from('payment_requests')
        .select('amount')
        .eq('workspace_id', this.workspaceId)
        .eq('status', 'pending')

      const { data: payments } = await paymentQuery
      const accountsPayable = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)

      return {
        revenue: tourMetrics.totalRevenue,
        cost: tourMetrics.totalCost,
        profit: tourMetrics.profit,
        profitMargin: tourMetrics.profitMargin,
        accountsReceivable,
        accountsPayable,
        cashFlow: accountsReceivable - accountsPayable,
      }
    } catch (error) {
      logger.error('Failed to get financial metrics', { error })
      return this.getEmptyFinancialMetrics()
    }
  }

  // ==================== 時間序列分析 ====================

  async getRevenueTimeSeries(
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<TimeSeriesData[]> {
    try {
      const { data: tours, error } = await supabase
        .from('tours')
        .select('departure_date, total_revenue')
        .eq('workspace_id', this.workspaceId)
        .gte('departure_date', this.formatDate(dateRange.start))
        .lte('departure_date', this.formatDate(dateRange.end))
        .order('departure_date', { ascending: true })

      if (error) throw error

      // 按時間分組
      const grouped = new Map<string, number>()

      for (const tour of tours || []) {
        if (!tour.departure_date) continue
        const date = new Date(tour.departure_date)
        const key = this.getTimeSeriesKey(date, groupBy)

        const current = grouped.get(key) || 0
        grouped.set(key, current + (tour.total_revenue || 0))
      }

      return Array.from(grouped.entries()).map(([date, value]) => ({
        date,
        value,
      }))
    } catch (error) {
      logger.error('Failed to get revenue time series', { error })
      return []
    }
  }

  // ==================== 圖表資料 ====================

  async getTourStatusChart(): Promise<ChartData> {
    const metrics = await this.getTourMetrics()

    return {
      labels: ['開團', '待出發', '已結團', '取消'],
      datasets: [
        {
          name: '旅遊團數量',
          data: [
            metrics.totalTours -
              metrics.activeTours -
              metrics.completedTours -
              metrics.cancelledTours,
            metrics.activeTours,
            metrics.completedTours,
            metrics.cancelledTours,
          ],
          color: '#c9aa7c',
        },
      ],
    }
  }

  async getPaymentStatusChart(): Promise<ChartData> {
    const metrics = await this.getOrderMetrics()

    return {
      labels: ['已收款', '未收款'],
      datasets: [
        {
          name: '訂單金額',
          data: [metrics.paidAmount, metrics.unpaidAmount],
          color: '#9fa68f',
        },
      ],
    }
  }

  // ==================== 比較分析 ====================

  async compareMetrics(
    metric: string,
    currentRange: DateRange,
    previousRange: DateRange
  ): Promise<MetricResult> {
    const current = await this.getMetricValue(metric, currentRange)
    const previous = await this.getMetricValue(metric, previousRange)

    const change = current - previous
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0

    return {
      name: metric,
      value: current,
      previousValue: previous,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    }
  }

  // ==================== Helper Methods ====================

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date.split('T')[0]
    return date.toISOString().split('T')[0]
  }

  private getTimeSeriesKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0]
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().split('T')[0]
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      default:
        return date.toISOString().split('T')[0]
    }
  }

  private async getMetricValue(metric: string, dateRange: DateRange): Promise<number> {
    switch (metric) {
      case 'revenue':
        const tourMetrics = await this.getTourMetrics(dateRange)
        return tourMetrics.totalRevenue
      case 'orders':
        const orderMetrics = await this.getOrderMetrics(dateRange)
        return orderMetrics.totalOrders
      case 'customers':
        const customerMetrics = await this.getCustomerMetrics(dateRange)
        return customerMetrics.newCustomers
      default:
        return 0
    }
  }

  private getEmptyTourMetrics(): TourMetrics {
    return {
      totalTours: 0,
      activeTours: 0,
      completedTours: 0,
      cancelledTours: 0,
      totalParticipants: 0,
      averageGroupSize: 0,
      totalRevenue: 0,
      totalCost: 0,
      profit: 0,
      profitMargin: 0,
    }
  }

  private getEmptyOrderMetrics(): OrderMetrics {
    return {
      totalOrders: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      averageOrderValue: 0,
      paymentRate: 0,
    }
  }

  private getEmptyCustomerMetrics(): CustomerMetrics {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      averageLifetimeValue: 0,
      retentionRate: 0,
    }
  }

  private getEmptyFinancialMetrics(): FinancialMetrics {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      cashFlow: 0,
    }
  }
}

// 工廠函數
export function analyticsService(workspaceId: string): AnalyticsService {
  return new AnalyticsService(workspaceId)
}
