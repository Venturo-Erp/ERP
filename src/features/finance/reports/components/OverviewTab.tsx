'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useReceipts } from '@/data/entities/receipts'
import { usePaymentRequests } from '@/data/entities/payment-requests'
import { useDisbursementOrders } from '@/data/entities/disbursement-orders'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { DateRange } from './DateRangeSelector'

interface TransactionRow {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  status: string
  source: 'receipt' | 'payment_request'
}

interface OverviewTabProps {
  dateRange: DateRange
}

export function OverviewTab({ dateRange }: OverviewTabProps) {
  const { items: receipts, loading: receiptsLoading } = useReceipts()
  const { items: paymentRequests, loading: prLoading } = usePaymentRequests()
  const { items: disbursementOrders, loading: doLoading } = useDisbursementOrders()

  const isLoading = receiptsLoading || prLoading || doLoading

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
    const rangeDisbursements = disbursementOrders.filter(d => {
      const dt = (d.disbursement_date || d.created_at || '')?.split('T')[0] || ''
      return dt >= startDate && dt <= endDate
    })

    const totalIncome = rangeReceipts.reduce(
      (sum, r) => sum + (r.actual_amount || r.receipt_amount || 0),
      0
    )
    const totalExpense = rangePayments
      .filter(pr => pr.status === 'approved' || pr.status === 'paid' || pr.status === 'billed' || pr.status === 'confirmed')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)
    const pendingReceipts = rangeReceipts.filter(r => r.status === '0').length
    const pendingDisbursements = rangeDisbursements.filter(d => d.status === 'pending').length

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, pendingReceipts, pendingDisbursements }
  }, [receipts, paymentRequests, disbursementOrders, dateRange])

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
        amount: r.actual_amount || r.receipt_amount || 0,
        status: r.status === '1' ? '已確認' : '待確認',
        source: 'receipt',
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
        amount: pr.amount || 0,
        status: pr.status === 'paid' ? '已付款' : pr.status === 'billed' ? '已出帳' : '待處理',
        source: 'payment_request',
      })
    })

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return transactions.slice(0, 50)
  }, [receipts, paymentRequests, dateRange])

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">收入</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-morandi-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-green">
              {isLoading ? '...' : formatCurrency(stats.totalIncome)}
            </div>
            {stats.pendingReceipts > 0 && (
              <p className="text-xs text-morandi-gold mt-1">{stats.pendingReceipts} 筆待確認</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">支出</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-morandi-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-red">
              {isLoading ? '...' : formatCurrency(stats.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">餘額</CardTitle>
            <Wallet className="h-4 w-4 text-morandi-gold" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}>
              {isLoading ? '...' : formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">待處理出納</CardTitle>
            <AlertCircle className="h-4 w-4 text-morandi-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.pendingDisbursements}
            </div>
            <p className="text-xs text-morandi-secondary mt-1">筆出納單待出帳</p>
          </CardContent>
        </Card>
      </div>

      {/* 近期交易 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            交易明細
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-morandi-secondary">載入中...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">此區間無交易記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">日期</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">類型</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">說明</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-morandi-secondary">金額</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-morandi-secondary">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(tx => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-morandi-container/50 transition-colors">
                      <td className="py-3 px-2 text-sm">
                        {tx.date ? format(new Date(tx.date), 'MM/dd', { locale: zhTW }) : '-'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={tx.type === 'income' ? 'default' : 'outline'}
                          className={
                            tx.type === 'income'
                              ? 'bg-morandi-green/20 text-morandi-green border-0'
                              : 'bg-morandi-red/10 text-morandi-red border-0'
                          }
                        >
                          {tx.type === 'income' ? '收入' : '支出'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm max-w-[300px] truncate">{tx.description}</td>
                      <td className={`py-3 px-2 text-right font-medium text-sm ${tx.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
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
