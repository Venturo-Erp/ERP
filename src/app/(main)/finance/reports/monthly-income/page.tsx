'use client'

import { useState, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { ContentContainer } from '@/components/layout/content-container'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { ChevronLeft, ChevronRight, TrendingUp, Receipt as ReceiptIcon, Users } from 'lucide-react'
import { useReceipts } from '@/data'
import type { Receipt } from '@/types/receipt.types'
import { RECEIPT_PAYMENT_METHOD_LABELS } from '@/types/receipt.types'
import { MONTHLY_INCOME_LABELS } from './constants/labels'

// 取得當前年月
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
}

// 取得月份的第一天和最後一天
function getMonthRange(yearMonth: string): { startDate: string; endDate: string } {
  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
  return { startDate, endDate }
}

// 格式化月份顯示
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}${MONTHLY_INCOME_LABELS.YEAR_SUFFIX}${parseInt(month)}${MONTHLY_INCOME_LABELS.MONTH_SUFFIX}`
}

// 月份選擇器
function MonthSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const handlePrev = () => {
    const [year, month] = value.split('-').map(Number)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    onChange(`${prevYear}-${prevMonth.toString().padStart(2, '0')}`)
  }

  const handleNext = () => {
    const [year, month] = value.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    onChange(`${nextYear}-${nextMonth.toString().padStart(2, '0')}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous" onClick={handlePrev}>
        <ChevronLeft size={16} />
      </Button>
      <span className="min-w-[120px] text-center font-medium text-morandi-primary">
        {formatYearMonth(value)}
      </span>
      <Button variant="outline" size="icon" aria-label="Next" onClick={handleNext}>
        <ChevronRight size={16} />
      </Button>
    </div>
  )
}

// 統計卡片
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

export default function MonthlyIncomeReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth())
  const { items: receipts, loading } = useReceipts()

  // 篩選該月份的數據
  const { startDate, endDate } = getMonthRange(selectedMonth)

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const receiptDate = r.receipt_date || r.created_at?.split('T')[0]
      return receiptDate && receiptDate >= startDate && receiptDate <= endDate
    })
  }, [receipts, startDate, endDate])

  // 計算統計數據
  const stats = useMemo(() => {
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.receipt_amount || r.amount || 0), 0)
    // 按付款方式分組統計
    const byPaymentMethod = filteredReceipts.reduce(
      (acc, r) => {
        const method = r.payment_method || 'other'
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count += 1
        acc[method].amount += r.receipt_amount || r.amount || 0
        return acc
      },
      {} as Record<string, { count: number; amount: number }>
    )

    return {
      receiptCount: filteredReceipts.length,
      totalAmount,
      byPaymentMethod,
    }
  }, [filteredReceipts])

  // 收款單表格欄位
  const columns: TableColumn<Receipt>[] = [
    {
      key: 'receipt_number',
      label: MONTHLY_INCOME_LABELS.COL_RECEIPT_CODE,
      width: '150',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'receipt_date',
      label: MONTHLY_INCOME_LABELS.COL_RECEIPT_DATE,
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'payment_method',
      label: MONTHLY_INCOME_LABELS.COL_PAYMENT_METHOD,
      width: '100',
      render: value => {
        const method = String(value || '')
        return (
          <span className="text-sm">{RECEIPT_PAYMENT_METHOD_LABELS[method] || method || '-'}</span>
        )
      },
    },
    {
      key: 'receipt_amount',
      label: MONTHLY_INCOME_LABELS.COL_AMOUNT,
      width: '120',
      render: (value, row) => <CurrencyCell amount={Number(value) || Number(row.amount) || 0} variant="income" />,
    },
    {
      key: 'handler_name',
      label: MONTHLY_INCOME_LABELS.COL_HANDLED_BY,
      width: '100',
      render: value => <span className="text-sm">{String(value || '-')}</span>,
    },
    {
      key: 'notes',
      label: MONTHLY_INCOME_LABELS.COL_NOTES,
      width: '150',
      render: value => <span className="text-sm truncate">{String(value || '-')}</span>,
    },
  ]

  return (
    <ContentPageLayout
      title={MONTHLY_INCOME_LABELS.LABEL_120}
      breadcrumb={[
        { label: MONTHLY_INCOME_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: MONTHLY_INCOME_LABELS.BREADCRUMB_FINANCE, href: '/finance' },
        { label: MONTHLY_INCOME_LABELS.BREADCRUMB_REPORTS, href: '/finance/reports' },
        { label: MONTHLY_INCOME_LABELS.LABEL_120, href: '/finance/reports/monthly-income' },
      ]}
      headerActions={<MonthSelector value={selectedMonth} onChange={setSelectedMonth} />}
      className="space-y-6"
    >
      {/* 統計卡片 */}
      <ContentContainer>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title={MONTHLY_INCOME_LABELS.LABEL_6326}
            value={stats.receiptCount}
            icon={ReceiptIcon}
            iconColor="text-morandi-green"
          />
          <StatCard
            title={MONTHLY_INCOME_LABELS.TOTAL_2019}
            value={stats.totalAmount}
            icon={TrendingUp}
            iconColor="text-morandi-green"
            isCurrency
          />
          <StatCard
            title={MONTHLY_INCOME_LABELS.LABEL_4193}
            value={Object.keys(stats.byPaymentMethod).length}
            icon={Users}
            iconColor="text-morandi-gold"
          />
        </div>
      </ContentContainer>

      {/* 付款方式統計 */}
      {Object.keys(stats.byPaymentMethod).length > 0 && (
        <ContentContainer>
          <h3 className="text-lg font-semibold text-morandi-primary mb-4">
            {MONTHLY_INCOME_LABELS.LABEL_4586}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
              <div key={method} className="p-4 bg-morandi-container/30 rounded-lg">
                <p className="text-sm text-morandi-secondary">
                  {RECEIPT_PAYMENT_METHOD_LABELS[method] || method}
                </p>
                <p className="text-lg font-semibold text-morandi-primary">
                  {data.count}
                  {MONTHLY_INCOME_LABELS.COUNT_SUFFIX}
                </p>
                <CurrencyCell amount={data.amount} variant="income" className="text-sm" />
              </div>
            ))}
          </div>
        </ContentContainer>
      )}

      {/* 收款單列表 */}
      <ContentContainer>
        <h3 className="text-lg font-semibold text-morandi-primary mb-4">
          {MONTHLY_INCOME_LABELS.LABEL_9606}
        </h3>
        <EnhancedTable
          columns={columns}
          data={filteredReceipts}
          loading={loading}
          emptyMessage={MONTHLY_INCOME_LABELS.EMPTY_MESSAGE}
        />
      </ContentContainer>
    </ContentPageLayout>
  )
}
