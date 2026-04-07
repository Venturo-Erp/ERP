'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface TransactionRow {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  category: 'tour' | 'company'
  amount: number
  status: string
}

interface OverviewTabProps {
  dateRange: DateRange
}

function StatCard({
  label,
  amount,
  icon: Icon,
  iconColor,
  amountColor,
  loading,
  sub,
}: {
  label: string
  amount: number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  amountColor: string
  loading: boolean
  sub?: string
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
        {sub && <p className="text-xs text-morandi-secondary mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function OverviewTab({ dateRange }: OverviewTabProps) {
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

    // 收入：有 tour_id = 團體，沒有 = 公司
    const tourIncome = rangeReceipts
      .filter(r => r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)
    const companyIncome = rangeReceipts
      .filter(r => !r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)

    // 支出：用 request_category 區分
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

    return {
      tourIncome,
      companyIncome,
      totalIncome,
      tourExpense,
      companyExpense,
      totalExpense,
      balance: totalIncome - totalExpense,
    }
  }, [receipts, paymentRequests, dateRange])

  const recentTransactions = useMemo(() => {
    const { startDate, endDate } = dateRange
    const transactions: TransactionRow[] = []

    receipts.forEach(r => {
      const d = (r.receipt_date || r.created_at)?.split('T')[0] || ''
      if (d < startDate || d > endDate) return
      transactions.push({
        id: r.id,
        date: r.receipt_date || r.created_at,
        description: `${r.receipt_number} ${r.tour_name || r.order_number || ''}`.trim(),
        type: 'income',
        category: r.tour_id ? 'tour' : 'company',
        amount: r.actual_amount || r.receipt_amount || 0,
        status: r.status === '1' ? '已確認' : '待確認',
      })
    })

    paymentRequests.forEach(pr => {
      const d = (pr.request_date || pr.created_at || '')?.split('T')[0] || ''
      if (d < startDate || d > endDate) return
      transactions.push({
        id: pr.id,
        date: pr.request_date || pr.created_at || '',
        description: `${pr.code || pr.request_number || ''} ${pr.supplier_name || pr.tour_name || ''}`.trim(),
        type: 'expense',
        category: pr.request_category === 'company' ? 'company' : 'tour',
        amount: pr.amount || 0,
        status: pr.status === 'paid' ? '已付款' : pr.status === 'billed' ? '已出帳' : '待處理',
      })
    })

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return transactions.slice(0, 50)
  }, [receipts, paymentRequests, dateRange])

  return (
    <div className="space-y-6">
      {/* 收入列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownCircle className="h-4 w-4 text-morandi-green" />
          <h3 className="text-sm font-semibold text-morandi-primary">收入</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="團體收入"
            amount={stats.tourIncome}
            icon={Plane}
            iconColor="text-morandi-green/60"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
          <StatCard
            label="公司收入"
            amount={stats.companyIncome}
            icon={Building2}
            iconColor="text-morandi-green/60"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
          <StatCard
            label="收入合計"
            amount={stats.totalIncome}
            icon={TrendingUp}
            iconColor="text-morandi-green"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
        </div>
      </div>

      {/* 支出列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpCircle className="h-4 w-4 text-morandi-red" />
          <h3 className="text-sm font-semibold text-morandi-primary">支出</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="團體支出"
            amount={stats.tourExpense}
            icon={Plane}
            iconColor="text-morandi-red/60"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
          <StatCard
            label="公司支出"
            amount={stats.companyExpense}
            icon={Building2}
            iconColor="text-morandi-red/60"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
          <StatCard
            label="支出合計"
            amount={stats.totalExpense}
            icon={ArrowUpCircle}
            iconColor="text-morandi-red"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
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

      {/* 交易明細 */}
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
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">此區間無交易記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-xs font-medium text-morandi-secondary">日期</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-morandi-secondary">類型</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-morandi-secondary">分類</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-morandi-secondary">說明</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-morandi-secondary">金額</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-morandi-secondary">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(tx => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-morandi-container/50 transition-colors">
                      <td className="py-2.5 px-2 text-sm">
                        {tx.date ? format(new Date(tx.date), 'MM/dd', { locale: zhTW }) : '-'}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant="outline"
                          className={
                            tx.type === 'income'
                              ? 'bg-morandi-green/10 text-morandi-green border-morandi-green/20 text-xs'
                              : 'bg-morandi-red/10 text-morandi-red border-morandi-red/20 text-xs'
                          }
                        >
                          {tx.type === 'income' ? '收入' : '支出'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-xs text-morandi-secondary">
                          {tx.category === 'tour' ? '團體' : '公司'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-sm max-w-[280px] truncate">{tx.description}</td>
                      <td className={`py-2.5 px-2 text-right font-medium text-sm ${tx.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
