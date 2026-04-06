'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { FileDown, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell, CurrencyCell } from '@/components/table-cells'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TOUR_CLOSING_LABELS } from './constants/labels'

interface TourClosingReport {
  id: string
  code: string
  name: string
  departure_date: string
  return_date: string
  closing_date: string
  total_revenue: number
  total_cost: number
  gross_profit: number
  member_count: number
  misc_expense: number
  tax: number
  net_profit: number
  sales_bonuses: Array<{ employee_name: string; percentage: number; amount: number }>
  op_bonuses: Array<{ employee_name: string; percentage: number; amount: number }>
  team_bonus: number
}

export default function TourClosingReportPage() {
  const [reports, setReports] = useState<TourClosingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    loadClosedTours()
  }, [])

  const loadClosedTours = async () => {
    try {
      setLoading(true)

      // 取得當前 workspace
      const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single()

      if (!workspace) {
        toast.error(TOUR_CLOSING_LABELS.WORKSPACE_NOT_FOUND)
        return
      }

      // 取得所有已結團的旅遊團
      const { data: tours, error } = await supabase
        .from('tours')
        .select(
          'id, code, name, departure_date, return_date, status, workspace_id, archived, current_participants, max_participants, contract_archived_date'
        )
        .eq('workspace_id', workspace.id)
        .eq('archived', true)
        .order('return_date', { ascending: false })
        .limit(500)

      if (error) throw error
      if (!tours?.length) {
        setReports([])
        return
      }

      // ====== 批量查詢取代 N+1 ======
      const tourIds = tours.map(t => t.id)

      // 1. 批量取得所有訂單
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, tour_id, paid_amount')
        .in('tour_id', tourIds)

      // 建立 tour -> orders 映射
      const ordersByTour = new Map<
        string,
        Array<{ id: string; tour_id: string; paid_amount: number | null }>
      >()
      const allOrderIds: string[] = []

      allOrders?.forEach(order => {
        if (!order.tour_id) return // 過濾掉無效的 tour_id
        const tourOrders = ordersByTour.get(order.tour_id) || []
        tourOrders.push({ id: order.id, tour_id: order.tour_id, paid_amount: order.paid_amount })
        ordersByTour.set(order.tour_id, tourOrders)
        allOrderIds.push(order.id)
      })

      // 2. 平行批量查詢：成本、團員、獎金
      const paymentsByOrder = new Map<string, Array<{ amount: number | null }>>()
      const memberCountByOrder = new Map<string, number>()
      const bonusByOrder = new Map<
        string,
        Array<{ supplier_name: string | null; amount: number | null; notes: string | null }>
      >()

      if (allOrderIds.length > 0) {
        const [paymentsRes, membersRes, bonusRes] = await Promise.all([
          // 成本 (非 bonus)
          supabase
            .from('payment_requests')
            .select('order_id, amount')
            .in('order_id', allOrderIds)
            .eq('status', 'paid')
            .neq('request_type', 'bonus'),
          // 團員
          supabase.from('order_members').select('order_id').in('order_id', allOrderIds),
          // 獎金
          supabase
            .from('payment_requests')
            .select('order_id, supplier_name, amount, notes')
            .in('order_id', allOrderIds)
            .eq('request_type', 'bonus'),
        ])

        // 建立成本映射
        paymentsRes.data?.forEach(pr => {
          if (!pr.order_id) return
          const list = paymentsByOrder.get(pr.order_id) || []
          list.push({ amount: pr.amount })
          paymentsByOrder.set(pr.order_id, list)
        })

        // 建立團員數映射
        membersRes.data?.forEach(m => {
          if (!m.order_id) return
          const count = memberCountByOrder.get(m.order_id) || 0
          memberCountByOrder.set(m.order_id, count + 1)
        })

        // 建立獎金映射
        bonusRes.data?.forEach(b => {
          if (!b.order_id) return
          const list = bonusByOrder.get(b.order_id) || []
          list.push({ supplier_name: b.supplier_name, amount: b.amount, notes: b.notes })
          bonusByOrder.set(b.order_id, list)
        })
      }

      // ====== 在記憶體中計算報表 ======
      const reportsData = tours.map(tour => {
        const orders = ordersByTour.get(tour.id) || []
        const orderIds = orders.map(o => o.id)

        // 計算收入
        const totalRevenue = orders.reduce((sum, o) => sum + (o.paid_amount || 0), 0)

        // 計算成本
        let totalCost = 0
        orderIds.forEach(oid => {
          const payments = paymentsByOrder.get(oid) || []
          totalCost += payments.reduce((sum, pr) => sum + (pr.amount || 0), 0)
        })

        // 計算團員數
        let memberCount = 0
        orderIds.forEach(oid => {
          memberCount += memberCountByOrder.get(oid) || 0
        })

        // 計算利潤
        const grossProfit = totalRevenue - totalCost
        const miscExpense = memberCount * 10
        const tax = Math.round((grossProfit - miscExpense) * 0.12)
        const netProfit = grossProfit - miscExpense - tax

        // 處理獎金
        const salesBonuses: Array<{ employee_name: string; percentage: number; amount: number }> =
          []
        const opBonuses: Array<{ employee_name: string; percentage: number; amount: number }> = []
        let teamBonus = 0

        orderIds.forEach(oid => {
          const bonuses = bonusByOrder.get(oid) || []
          bonuses.forEach(bonus => {
            if (!bonus.supplier_name || bonus.amount === undefined) return

            const percentageMatch = bonus.notes?.match(/(\d+\.?\d*)%/)
            const percentage = percentageMatch ? parseFloat(percentageMatch[1]) : 0

            if (bonus.supplier_name === TOUR_CLOSING_LABELS.BONUS_SALES) {
              salesBonuses.push({
                employee_name:
                  bonus.notes?.replace(/業務業績\s*\d+\.?\d*%/, '').trim() ||
                  TOUR_CLOSING_LABELS.UNKNOWN_EMPLOYEE,
                percentage,
                amount: bonus.amount || 0,
              })
            } else if (bonus.supplier_name === TOUR_CLOSING_LABELS.BONUS_OP) {
              opBonuses.push({
                employee_name:
                  bonus.notes?.replace(/OP 獎金\s*\d+\.?\d*%/, '').trim() ||
                  TOUR_CLOSING_LABELS.UNKNOWN_EMPLOYEE,
                percentage,
                amount: bonus.amount || 0,
              })
            } else if (bonus.supplier_name === TOUR_CLOSING_LABELS.BONUS_TEAM) {
              teamBonus = bonus.amount || 0
            }
          })
        })

        return {
          id: tour.id,
          code: tour.code,
          name: tour.name,
          departure_date: tour.departure_date || '',
          return_date: tour.return_date || '',
          closing_date: tour.contract_archived_date || tour.return_date || '',
          total_revenue: totalRevenue,
          total_cost: totalCost,
          gross_profit: grossProfit,
          member_count: memberCount,
          misc_expense: miscExpense,
          tax,
          net_profit: netProfit,
          sales_bonuses: salesBonuses,
          op_bonuses: opBonuses,
          team_bonus: teamBonus,
        }
      })

      setReports(reportsData)
    } catch (error) {
      logger.error('載入結團報表失敗:', error)
      toast.error(TOUR_CLOSING_LABELS.LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }

  // 依月份篩選
  const filteredReports = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return reports

    return reports.filter(report => {
      const closingMonth = report.closing_date?.substring(0, 7) // YYYY-MM
      return closingMonth === selectedMonth
    })
  }, [reports, selectedMonth])

  // 產出 Excel 報表
  const exportToExcel = async (month?: string) => {
    const dataToExport = month
      ? reports.filter(r => r.closing_date?.substring(0, 7) === month)
      : filteredReports

    if (dataToExport.length === 0) {
      toast.error(TOUR_CLOSING_LABELS.NO_DATA_TO_EXPORT)
      return
    }

    // 動態載入 xlsx（避免污染首屏 bundle）
    const XLSX = await import('xlsx')

    // 準備 Excel 資料
    const excelData = dataToExport.map(report => ({
      [TOUR_CLOSING_LABELS.EXCEL_TOUR_CODE]: report.code,
      [TOUR_CLOSING_LABELS.EXCEL_TOUR_NAME]: report.name,
      [TOUR_CLOSING_LABELS.EXCEL_DEPARTURE]: report.departure_date,
      [TOUR_CLOSING_LABELS.EXCEL_RETURN]: report.return_date,
      [TOUR_CLOSING_LABELS.EXCEL_CLOSING]: report.closing_date,
      [TOUR_CLOSING_LABELS.EXCEL_SALES]:
        report.sales_bonuses.map(s => `${s.employee_name}(${s.percentage}%)`).join(', ') || '-',
      [TOUR_CLOSING_LABELS.EXCEL_OP]:
        report.op_bonuses.map(o => `${o.employee_name}(${o.percentage}%)`).join(', ') || '-',
      [TOUR_CLOSING_LABELS.EXCEL_ORDER_AMOUNT]: report.total_revenue,
      [TOUR_CLOSING_LABELS.EXCEL_COST]: report.total_cost,
      [TOUR_CLOSING_LABELS.EXCEL_ADMIN_FEE]: report.misc_expense,
      [TOUR_CLOSING_LABELS.EXCEL_TAX]: report.tax,
      [TOUR_CLOSING_LABELS.EXCEL_TEAM_BONUS]: report.team_bonus,
      [TOUR_CLOSING_LABELS.EXCEL_SALES_BONUS]: report.sales_bonuses.reduce(
        (sum: number, s: { amount: number }) => sum + s.amount,
        0
      ),
      [TOUR_CLOSING_LABELS.EXCEL_OP_BONUS]: report.op_bonuses.reduce(
        (sum: number, o: { amount: number }) => sum + o.amount,
        0
      ),
      [TOUR_CLOSING_LABELS.EXCEL_GROSS_PROFIT]: report.gross_profit,
      [TOUR_CLOSING_LABELS.EXCEL_NET_PROFIT]: report.net_profit,
    }))

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 設定欄位寬度
    ws['!cols'] = [
      { wch: 12 }, // 團號
      { wch: 30 }, // 團名
      { wch: 12 }, // 出發日
      { wch: 12 }, // 返回日
      { wch: 12 }, // 結團日
      { wch: 20 }, // 業務
      { wch: 20 }, // OP
      { wch: 12 }, // 訂單金額
      { wch: 12 }, // 成本
      { wch: 15 }, // 行政費
      { wch: 12 }, // 扣稅
      { wch: 12 }, // 團體獎金
      { wch: 12 }, // 業務獎金
      { wch: 12 }, // OP獎金
      { wch: 12 }, // 毛利
      { wch: 12 }, // 淨利
    ]

    // 建立工作簿
    const wb = XLSX.utils.book_new()
    const monthLabel = month || selectedMonth || '全部'
    XLSX.utils.book_append_sheet(wb, ws, monthLabel)

    // 匯出檔案
    const fileName = `${TOUR_CLOSING_LABELS.EXCEL_FILENAME_PREFIX}_${monthLabel}_${getTodayString()}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast.success(TOUR_CLOSING_LABELS.REPORT_EXPORTED)
  }

  // 取得可用的月份列表
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    reports.forEach(report => {
      if (report.closing_date) {
        months.add(report.closing_date.substring(0, 7))
      }
    })
    return Array.from(months).sort().reverse()
  }, [reports])

  const columns: TableColumn<TourClosingReport>[] = [
    {
      key: 'code',
      label: TOUR_CLOSING_LABELS.COL_TOUR_CODE,
      sortable: true,
      render: value => <span className="font-mono">{String(value || '')}</span>,
    },
    {
      key: 'name',
      label: TOUR_CLOSING_LABELS.COL_TOUR_NAME,
      sortable: true,
    },
    {
      key: 'departure_date',
      label: TOUR_CLOSING_LABELS.COL_DEPARTURE,
      sortable: true,
      render: (value: unknown) => <DateCell date={value as string} />,
    },
    {
      key: 'closing_date',
      label: TOUR_CLOSING_LABELS.COL_CLOSING,
      sortable: true,
      render: (value: unknown) => <DateCell date={value as string} />,
    },
    {
      key: 'total_revenue',
      label: TOUR_CLOSING_LABELS.COL_REVENUE,
      sortable: true,
      render: (value: unknown) => <CurrencyCell amount={Number(value)} variant="income" />,
    },
    {
      key: 'total_cost',
      label: TOUR_CLOSING_LABELS.COL_COST,
      sortable: true,
      render: (value: unknown) => <CurrencyCell amount={Number(value)} variant="expense" />,
    },
    {
      key: 'net_profit',
      label: TOUR_CLOSING_LABELS.COL_NET_PROFIT,
      sortable: true,
      render: (value: unknown) => (
        <CurrencyCell
          amount={Number(value)}
          variant={Number(value) >= 0 ? 'default' : 'expense'}
          className="font-bold"
        />
      ),
    },
  ]

  const renderActions = (report: TourClosingReport) => (
    <ActionCell
      actions={[
        {
          icon: FileDown,
          label: TOUR_CLOSING_LABELS.EXPORT_TOUR,
          onClick: () => {
            const month = report.closing_date?.substring(0, 7)
            if (month) {
              exportToExcel(month)
            }
          },
        },
      ]}
    />
  )

  return (
    <ListPageLayout
      title={TOUR_CLOSING_LABELS.LABEL_5942}
      icon={FileText}
      breadcrumb={[
        { label: TOUR_CLOSING_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: TOUR_CLOSING_LABELS.BREADCRUMB_REPORTS, href: '/reports' },
        { label: TOUR_CLOSING_LABELS.BREADCRUMB_TOUR_CLOSING, href: '/reports/tour-closing' },
      ]}
      data={filteredReports}
      columns={columns}
      searchFields={['code', 'name']}
      searchPlaceholder={TOUR_CLOSING_LABELS.SEARCH_PLACEHOLDER}
      renderActions={renderActions}
      bordered={true}
      headerActions={
        <div className="flex gap-3 items-center">
          {availableMonths.length > 0 && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={TOUR_CLOSING_LABELS.LABEL_2902} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{TOUR_CLOSING_LABELS.LABEL_2902}</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => exportToExcel()}
            className="bg-morandi-green hover:bg-morandi-green/90 text-white"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {TOUR_CLOSING_LABELS.EXPORT_7131}
          </Button>
        </div>
      }
    />
  )
}
