'use client'

import { useMemo } from 'react'
import { ContentContainer } from '@/components/layout/content-container'
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { TrendingUp, Receipt as ReceiptIcon, Users } from 'lucide-react'
import { useReceipts } from '@/data'
import type { Receipt } from '@/types/receipt.types'
import { RECEIPT_PAYMENT_METHOD_LABELS } from '@/types/receipt.types'
import type { DateRange } from './DateRangeSelector'

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isCurrency = false,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  isCurrency?: boolean
}) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-morandi-secondary mb-1">{title}</p>
          {isCurrency ? (
            <CurrencyCell amount={value} variant="income" className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold text-morandi-primary">{value}</p>
          )}
        </div>
        <Icon size={24} className={iconColor} />
      </div>
    </Card>
  )
}

interface IncomeTabProps {
  dateRange: DateRange
}

export function IncomeTab({ dateRange }: IncomeTabProps) {
  const { items: receipts, loading } = useReceipts()

  const filteredReceipts = useMemo(() => {
    const { startDate, endDate } = dateRange
    return receipts.filter(r => {
      const d = (r.receipt_date || r.created_at?.split('T')[0]) || ''
      return d >= startDate && d <= endDate
    })
  }, [receipts, dateRange])

  const stats = useMemo(() => {
    const totalAmount = filteredReceipts.reduce(
      (sum, r) => sum + (r.receipt_amount || r.amount || 0),
      0
    )
    const byPaymentMethod = filteredReceipts.reduce(
      (acc, r) => {
        const method = r.payment_method || 'other'
        if (!acc[method]) acc[method] = { count: 0, amount: 0 }
        acc[method].count += 1
        acc[method].amount += r.receipt_amount || r.amount || 0
        return acc
      },
      {} as Record<string, { count: number; amount: number }>
    )
    return { receiptCount: filteredReceipts.length, totalAmount, byPaymentMethod }
  }, [filteredReceipts])

  const columns: TableColumn<Receipt>[] = [
    {
      key: 'receipt_number',
      label: '收款單號',
      width: '150',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'receipt_date',
      label: '收款日期',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'payment_method',
      label: '付款方式',
      width: '100',
      render: value => {
        const method = String(value || '')
        return <span className="text-sm">{RECEIPT_PAYMENT_METHOD_LABELS[method] || method || '-'}</span>
      },
    },
    {
      key: 'receipt_amount',
      label: '金額',
      width: '120',
      render: (value, row) => <CurrencyCell amount={Number(value) || Number(row.amount) || 0} variant="income" />,
    },
    {
      key: 'handler_name',
      label: '經手人',
      width: '100',
      render: value => <span className="text-sm">{String(value || '-')}</span>,
    },
    {
      key: 'notes',
      label: '備註',
      width: '150',
      render: value => <span className="text-sm truncate">{String(value || '-')}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <ContentContainer>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="收款單數" value={stats.receiptCount} icon={ReceiptIcon} iconColor="text-morandi-green" />
          <StatCard title="收款總金額" value={stats.totalAmount} icon={TrendingUp} iconColor="text-morandi-green" isCurrency />
          <StatCard title="付款方式數" value={Object.keys(stats.byPaymentMethod).length} icon={Users} iconColor="text-morandi-gold" />
        </div>
      </ContentContainer>

      {Object.keys(stats.byPaymentMethod).length > 0 && (
        <ContentContainer>
          <h3 className="text-lg font-semibold text-morandi-primary mb-4">依付款方式統計</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
              <div key={method} className="p-4 bg-morandi-container/30 rounded-lg">
                <p className="text-sm text-morandi-secondary">{RECEIPT_PAYMENT_METHOD_LABELS[method] || method}</p>
                <p className="text-lg font-semibold text-morandi-primary">{data.count} 筆</p>
                <CurrencyCell amount={data.amount} variant="income" className="text-sm" />
              </div>
            ))}
          </div>
        </ContentContainer>
      )}

      <ContentContainer>
        <h3 className="text-lg font-semibold text-morandi-primary mb-4">收款單明細</h3>
        <EnhancedTable columns={columns} data={filteredReceipts} loading={loading} emptyMessage="此區間沒有收款單" />
      </ContentContainer>
    </div>
  )
}
