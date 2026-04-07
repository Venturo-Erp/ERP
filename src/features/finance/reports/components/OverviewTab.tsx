'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell } from '@/components/table-cells'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Plane,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useReceipts } from '@/data/entities/receipts'
import { usePaymentRequests } from '@/data/entities/payment-requests'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { DateRange } from './DateRangeSelector'

import type { DetailGranularity } from '@/app/(main)/finance/reports/page'

interface TransactionRow {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  category: 'tour' | 'company'
  amount: number
  status: string
  tourCode?: string
  supplierName?: string
}

interface GroupedRow {
  id: string
  label: string
  income: number
  expense: number
  net: number
  count: number
}

interface OverviewTabProps {
  dateRange: DateRange
  granularity: DetailGranularity
}

function StatCard({
  label,
  amount,
  icon: Icon,
  iconColor,
  amountColor,
  loading,
}: {
  label: string
  amount: number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  amountColor: string
  loading: boolean
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-morandi-secondary uppercase tracking-wide">{label}</span>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className={`text-xl font-bold ${amountColor}`}>
          {loading ? '...' : formatCurrency(amount)}
        </div>
      </CardContent>
    </Card>
  )
}

export function OverviewTab({ dateRange, granularity }: OverviewTabProps) {
  const { items: receipts, loading: receiptsLoading } = useReceipts()
  const { items: paymentRequests, loading: prLoading } = usePaymentRequests()

  const isLoading = receiptsLoading || prLoading

  const stats = useMemo(() => {
    const { startDate, endDate } = dateRange

    const rangeReceipts = receipts.filter(r => {
      const d = (r.receipt_date || r.created_at)?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })
    const rangePayments = paymentRequests.filter(pr => {
      const d = (pr.request_date || pr.created_at || '')?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })

    const tourIncome = rangeReceipts
      .filter(r => r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)
    const companyIncome = rangeReceipts
      .filter(r => !r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)

    const confirmedPayments = rangePayments.filter(
      pr => pr.status === 'approved' || pr.status === 'paid' || pr.status === 'billed' || pr.status === 'confirmed'
    )
    const tourExpense = confirmedPayments
      .filter(pr => pr.request_category === 'tour')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)
    const companyExpense = confirmedPayments
      .filter(pr => pr.request_category === 'company')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)

    const totalIncome = tourIncome + companyIncome
    const totalExpense = tourExpense + companyExpense

    return { tourIncome, companyIncome, totalIncome, tourExpense, companyExpense, totalExpense, balance: totalIncome - totalExpense }
  }, [receipts, paymentRequests, dateRange])

  // 按筆明細
  const transactions = useMemo(() => {
    const { startDate, endDate } = dateRange
    const rows: TransactionRow[] = []

    receipts.forEach(r => {
      const d = (r.receipt_date || r.created_at)?.split('T')[0] || ''
      if (d < startDate || d > endDate) return
      rows.push({
        id: r.id,
        date: r.receipt_date || r.created_at,
        description: `${r.receipt_number} ${r.tour_name || r.order_number || ''}`.trim(),
        type: 'income',
        category: r.tour_id ? 'tour' : 'company',
        amount: r.actual_amount || r.receipt_amount || 0,
        status: r.status === '1' ? '已確認' : '待確認',
        tourCode: (r as unknown as Record<string, unknown>).tour_code as string || '',
        supplierName: '',
      })
    })

    paymentRequests.forEach(pr => {
      const d = (pr.request_date || pr.created_at || '')?.split('T')[0] || ''
      if (d < startDate || d > endDate) return
      rows.push({
        id: pr.id,
        date: pr.request_date || pr.created_at || '',
        description: `${pr.code || pr.request_number || ''} ${pr.supplier_name || pr.tour_name || ''}`.trim(),
        type: 'expense',
        category: pr.request_category === 'company' ? 'company' : 'tour',
        amount: pr.amount || 0,
        status: pr.status === 'paid' ? '已付款' : pr.status === 'billed' ? '已出帳' : '待處理',
        tourCode: pr.tour_code || '',
        supplierName: pr.supplier_name || '',
      })
    })

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return rows
  }, [receipts, paymentRequests, dateRange])

  // 分組彙總
  const groupedRows = useMemo((): GroupedRow[] => {
    if (granularity === 'item') return []

    const groups = new Map<string, GroupedRow>()

    for (const tx of transactions) {
      let key = ''
      let label = ''

      if (granularity === 'day') {
        const d = tx.date?.split('T')[0] || ''
        key = d
        label = d ? format(new Date(d), 'MM/dd (EEE)', { locale: zhTW }) : '-'
      } else if (granularity === 'tour') {
        key = tx.tourCode || (tx.category === 'company' ? '__company__' : '__no_tour__')
        label = tx.tourCode || (tx.category === 'company' ? '公司' : '未指定團號')
      } else if (granularity === 'supplier') {
        key = tx.supplierName || (tx.type === 'income' ? '__income__' : '__no_supplier__')
        label = tx.supplierName || (tx.type === 'income' ? '收款' : '未指定供應商')
      }

      if (!groups.has(key)) {
        groups.set(key, { id: key, label, income: 0, expense: 0, net: 0, count: 0 })
      }
      const g = groups.get(key)!
      if (tx.type === 'income') g.income += tx.amount
      else g.expense += tx.amount
      g.net = g.income - g.expense
      g.count += 1
    }

    const result = Array.from(groups.values())

    if (granularity === 'day') {
      result.sort((a, b) => b.id.localeCompare(a.id))
    } else {
      result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    }

    return result
  }, [transactions, granularity])

  // 按筆表格欄位
  const itemColumns: TableColumn<TransactionRow>[] = [
    {
      key: 'date',
      label: '日期',
      width: '80',
      render: value => <span className="text-sm">{value ? format(new Date(value as string), 'MM/dd', { locale: zhTW }) : '-'}</span>,
    },
    {
      key: 'type',
      label: '類型',
      width: '70',
      render: value => (
        <Badge variant="outline" className={value === 'income' ? 'bg-morandi-green/10 text-morandi-green border-morandi-green/20 text-xs' : 'bg-morandi-red/10 text-morandi-red border-morandi-red/20 text-xs'}>
          {value === 'income' ? '收入' : '支出'}
        </Badge>
      ),
    },
    {
      key: 'category',
      label: '分類',
      width: '60',
      render: value => <span className="text-xs text-morandi-secondary">{value === 'tour' ? '團體' : '公司'}</span>,
    },
    {
      key: 'description',
      label: '說明',
      render: value => <span className="text-sm truncate max-w-[280px] block">{String(value)}</span>,
    },
    {
      key: 'amount',
      label: '金額',
      width: '120',
      render: (value, row) => (
        <span className={`font-medium text-sm ${row.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'}`}>
          {row.type === 'income' ? '+' : '-'}{formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '80',
      render: value => <Badge variant="outline" className="text-xs">{String(value)}</Badge>,
    },
  ]

  // 分組表格欄位
  const groupColumns: TableColumn<GroupedRow>[] = [
    {
      key: 'label',
      label: granularity === 'day' ? '日期' : granularity === 'tour' ? '團號' : '供應商',
      render: value => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'income',
      label: '收入',
      width: '130',
      render: value => <CurrencyCell amount={Number(value)} variant="income" />,
    },
    {
      key: 'expense',
      label: '支出',
      width: '130',
      render: value => <CurrencyCell amount={Number(value)} variant="expense" />,
    },
    {
      key: 'net',
      label: '淨額',
      width: '130',
      render: value => {
        const n = Number(value)
        return <CurrencyCell amount={n} variant={n >= 0 ? 'income' : 'expense'} className="font-medium" />
      },
    },
    {
      key: 'count',
      label: '筆數',
      width: '70',
      render: value => <span className="text-sm text-morandi-secondary">{String(value)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 收入列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownCircle className="h-4 w-4 text-morandi-green" />
          <h3 className="text-sm font-semibold text-morandi-primary">收入</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="團體收入" amount={stats.tourIncome} icon={Plane} iconColor="text-morandi-green/60" amountColor="text-morandi-green" loading={isLoading} />
          <StatCard label="公司收入" amount={stats.companyIncome} icon={Building2} iconColor="text-morandi-green/60" amountColor="text-morandi-green" loading={isLoading} />
          <StatCard label="收入合計" amount={stats.totalIncome} icon={TrendingUp} iconColor="text-morandi-green" amountColor="text-morandi-green" loading={isLoading} />
        </div>
      </div>

      {/* 支出列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpCircle className="h-4 w-4 text-morandi-red" />
          <h3 className="text-sm font-semibold text-morandi-primary">支出</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="團體支出" amount={stats.tourExpense} icon={Plane} iconColor="text-morandi-red/60" amountColor="text-morandi-red" loading={isLoading} />
          <StatCard label="公司支出" amount={stats.companyExpense} icon={Building2} iconColor="text-morandi-red/60" amountColor="text-morandi-red" loading={isLoading} />
          <StatCard label="支出合計" amount={stats.totalExpense} icon={ArrowUpCircle} iconColor="text-morandi-red" amountColor="text-morandi-red" loading={isLoading} />
        </div>
      </div>

      {/* 淨額 */}
      <div className="flex justify-end">
        <Card className="border-2 border-morandi-gold/30 w-full md:w-1/3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-morandi-secondary uppercase tracking-wide">淨額</span>
            </div>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}>
              {isLoading ? '...' : formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 明細區 */}
      <Card>
        <div className="px-4 pt-4 pb-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-morandi-primary">
            <FileText className="h-4 w-4" />
            交易明細
          </h3>
        </div>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="text-center py-8 text-morandi-secondary">載入中...</div>
          ) : granularity === 'item' ? (
            transactions.length === 0 ? (
              <div className="text-center py-8 text-morandi-secondary">此區間無交易記錄</div>
            ) : (
              <EnhancedTable columns={itemColumns} data={transactions.slice(0, 100)} emptyMessage="此區間無交易記錄" />
            )
          ) : groupedRows.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">此區間無交易記錄</div>
          ) : (
            <EnhancedTable columns={groupColumns} data={groupedRows} emptyMessage="此區間無交易記錄" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
