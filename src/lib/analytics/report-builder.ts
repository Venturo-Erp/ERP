/**
 * Report Builder
 * 動態報表生成器
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { ReportDefinition, ReportFormat, DateRange } from './types'

interface ReportColumn {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'currency' | 'percent'
  format?: string
}

interface ReportRow {
  [key: string]: unknown
}

interface GeneratedReport {
  definition: ReportDefinition
  columns: ReportColumn[]
  rows: ReportRow[]
  summary?: Record<string, number>
  generatedAt: string
}

export class ReportBuilder {
  private workspaceId: string
  private definition: Partial<ReportDefinition> = {}
  private columns: ReportColumn[] = []
  private filters: Record<string, unknown> = {}
  private dateRange?: DateRange

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId
  }

  /**
   * 設定報表名稱
   */
  name(name: string): this {
    this.definition.name = name
    return this
  }

  /**
   * 設定報表類型
   */
  type(type: ReportDefinition['type']): this {
    this.definition.type = type
    return this
  }

  /**
   * 新增欄位
   */
  addColumn(column: ReportColumn): this {
    this.columns.push(column)
    return this
  }

  /**
   * 設定日期範圍
   */
  setDateRange(start: Date | string, end: Date | string): this {
    this.dateRange = { start, end }
    return this
  }

  /**
   * 新增過濾條件
   */
  filter(field: string, value: unknown): this {
    this.filters[field] = value
    return this
  }

  /**
   * 設定排序
   */
  sort(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.definition.sortBy = field
    this.definition.sortOrder = order
    return this
  }

  /**
   * 設定分組
   */
  groupBy(...fields: string[]): this {
    this.definition.groupBy = fields
    return this
  }

  // ==================== 預定義報表 ====================

  /**
   * 旅遊團報表
   */
  async buildTourReport(): Promise<GeneratedReport> {
    this.columns = [
      { key: 'code', label: '團號', type: 'string' },
      { key: 'name', label: '團名', type: 'string' },
      { key: 'departure_date', label: '出發日期', type: 'date' },
      { key: 'return_date', label: '回程日期', type: 'date' },
      { key: 'status', label: '狀態', type: 'string' },
      { key: 'current_participants', label: '人數', type: 'number' },
      { key: 'total_revenue', label: '總營收', type: 'currency' },
      { key: 'total_cost', label: '總成本', type: 'currency' },
      { key: 'profit', label: '利潤', type: 'currency' },
    ]

    let query = supabase
      .from('tours')
      .select(
        'id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_deleted, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, tour_leader_id, controller_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by'
      )
      .eq('workspace_id', this.workspaceId)
      .limit(500)

    if (this.dateRange) {
      query = query
        .gte('departure_date', this.formatDate(this.dateRange.start))
        .lte('departure_date', this.formatDate(this.dateRange.end))
    }

    for (const [field, value] of Object.entries(this.filters)) {
      query = query.eq(field, value as string | number | boolean)
    }

    if (this.definition.sortBy) {
      query = query.order(this.definition.sortBy, {
        ascending: this.definition.sortOrder === 'asc',
      })
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to build tour report', { error })
      throw error
    }

    const rows = (data || []) as ReportRow[]
    const summary = {
      totalTours: rows.length,
      totalRevenue: rows.reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0),
      totalCost: rows.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0),
      totalParticipants: rows.reduce((sum, r) => sum + (Number(r.current_participants) || 0), 0),
    }

    return this.createReport(rows, summary)
  }

  /**
   * 訂單報表
   */
  async buildOrderReport(): Promise<GeneratedReport> {
    this.columns = [
      { key: 'code', label: '訂單編號', type: 'string' },
      { key: 'customer_name', label: '客戶名稱', type: 'string' },
      { key: 'tour_name', label: '團名', type: 'string' },
      { key: 'total_amount', label: '訂單金額', type: 'currency' },
      { key: 'paid_amount', label: '已付金額', type: 'currency' },
      { key: 'payment_status', label: '付款狀態', type: 'string' },
      { key: 'status', label: '訂單狀態', type: 'string' },
      { key: 'created_at', label: '建立日期', type: 'date' },
    ]

    let query = supabase
      .from('orders')
      .select(
        'id, code, order_number, tour_id, tour_name, customer_id, status, total_amount, paid_amount, remaining_amount, payment_status, contact_person, contact_phone, contact_email, sales_person, assistant, member_count, adult_count, notes, identity_options, is_active, workspace_id, created_at, created_by, updated_at, updated_by'
      )
      .eq('workspace_id', this.workspaceId)
      .limit(500)

    if (this.dateRange) {
      query = query
        .gte('created_at', this.formatDate(this.dateRange.start))
        .lte('created_at', this.formatDate(this.dateRange.end))
    }

    for (const [field, value] of Object.entries(this.filters)) {
      query = query.eq(field, value as string | number | boolean)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to build order report', { error })
      throw error
    }

    const rows = (data || []) as ReportRow[]
    const summary = {
      totalOrders: rows.length,
      totalAmount: rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0),
      paidAmount: rows.reduce((sum, r) => sum + (Number(r.paid_amount) || 0), 0),
    }

    return this.createReport(rows, summary)
  }

  /**
   * 財務報表
   */
  async buildFinancialReport(): Promise<GeneratedReport> {
    this.columns = [
      { key: 'date', label: '日期', type: 'date' },
      { key: 'type', label: '類型', type: 'string' },
      { key: 'description', label: '說明', type: 'string' },
      { key: 'debit', label: '借方', type: 'currency' },
      { key: 'credit', label: '貸方', type: 'currency' },
      { key: 'balance', label: '餘額', type: 'currency' },
    ]

    // [Planned] 財務報表需整合傳票 (vouchers) 資料
    // 待傳票模組完成後實作完整財務報表

    return this.createReport([], {})
  }

  // ==================== 匯出功能 ====================

  /**
   * 匯出為 CSV
   */
  toCSV(report: GeneratedReport): string {
    const headers = report.columns.map(c => c.label).join(',')
    const rows = report.rows.map(row =>
      report.columns
        .map(col => {
          const value = row[col.key]
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return String(value ?? '')
        })
        .join(',')
    )

    return [headers, ...rows].join('\n')
  }

  /**
   * 匯出為 JSON
   */
  toJSON(report: GeneratedReport): string {
    return JSON.stringify(report, null, 2)
  }

  // ==================== Helper Methods ====================

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date.split('T')[0]
    return date.toISOString().split('T')[0]
  }

  private createReport(rows: ReportRow[], summary: Record<string, number>): GeneratedReport {
    return {
      definition: this.definition as ReportDefinition,
      columns: this.columns,
      rows,
      summary,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * 重置 builder
   */
  reset(): this {
    this.definition = {}
    this.columns = []
    this.filters = {}
    this.dateRange = undefined
    return this
  }
}
