'use client'

import { FINANCE_PAGE_LABELS } from './constants/labels'

import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { useAccountingStore } from '@/stores/accounting-store'
import type { Transaction } from '@/stores/accounting-store'
import { useReceipts } from '@/data'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { ModuleLoading } from '@/components/module-loading'

export default function FinancePage() {
  const {
    transactions,
    stats,
    isLoading,
    initialize,
    fetchTransactions,
    transactionsPage,
    transactionsPageSize,
    transactionsCount,
  } = useAccountingStore()
  const { items: receipts } = useReceipts()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Re-calculate stats that were in the original UI but not in the store's `stats` object
  const totalReceivable = stats.total_income
  const totalPayable = stats.total_expense
  const netProfit = totalReceivable - totalPayable
  // 計算待確認款項：status === 'pending' 的收款單金額總和
  const pendingPayments = useMemo(() => {
    return receipts
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.receipt_amount || 0), 0)
  }, [receipts])

  const transactionColumns: TableColumn<Transaction>[] = useMemo(
    () => [
      {
        key: 'type',
        label: FINANCE_PAGE_LABELS.COL_TYPE,
        sortable: true,
        render: (_value, transaction) => {
          const typeIcons: Record<string, React.ReactNode> = {
            income: <TrendingUp size={16} className="text-morandi-green" />,
            expense: <TrendingDown size={16} className="text-morandi-red" />,
            transfer: <DollarSign size={16} className="text-morandi-gold" />,
          }
          const typeLabels: Record<string, string> = {
            income: FINANCE_PAGE_LABELS.TYPE_INCOME,
            expense: FINANCE_PAGE_LABELS.TYPE_EXPENSE,
            transfer: FINANCE_PAGE_LABELS.TYPE_TRANSFER,
          }
          return (
            <div className="flex items-center space-x-2">
              {typeIcons[transaction.type]}
              <span className="text-sm">{typeLabels[transaction.type] || transaction.type}</span>
            </div>
          )
        },
      },
      {
        key: 'description',
        label: FINANCE_PAGE_LABELS.COL_DESCRIPTION,
        sortable: true,
        render: (_value, transaction) => (
          <span className="text-sm text-morandi-primary">{transaction.description}</span>
        ),
      },
      {
        key: 'amount',
        label: FINANCE_PAGE_LABELS.COL_AMOUNT,
        sortable: true,
        render: (_value, transaction) => (
          <CurrencyCell
            amount={transaction.amount}
            variant={transaction.type === 'income' ? 'income' : 'expense'}
            showSign
          />
        ),
      },
      {
        key: 'date',
        label: FINANCE_PAGE_LABELS.COL_DATE,
        sortable: true,
        render: (_value, transaction) => <DateCell date={transaction.date} showIcon={false} />,
      },
    ],
    []
  )

  const financeModules = [
    {
      title: FINANCE_PAGE_LABELS.MODULE_FINANCE_TITLE,
      description: FINANCE_PAGE_LABELS.MODULE_FINANCE_DESC,
      icon: CreditCard,
      href: '/finance/payments',
      stats: FINANCE_PAGE_LABELS.MODULE_FINANCE_STATS(transactionsCount),
      color: 'text-morandi-green',
      bgColor: 'bg-morandi-green/10',
    },
    {
      title: FINANCE_PAGE_LABELS.MODULE_TREASURY_TITLE,
      description: FINANCE_PAGE_LABELS.MODULE_TREASURY_DESC,
      icon: Wallet,
      href: '/finance/treasury',
      stats: FINANCE_PAGE_LABELS.MODULE_TREASURY_STATS,
      color: 'text-morandi-gold',
      bgColor: 'bg-morandi-gold/10',
    },
    {
      title: FINANCE_PAGE_LABELS.MODULE_REPORTS_TITLE,
      description: FINANCE_PAGE_LABELS.MODULE_REPORTS_DESC,
      icon: BarChart3,
      href: '/finance/reports',
      stats: FINANCE_PAGE_LABELS.MODULE_REPORTS_STATS,
      color: 'text-morandi-primary',
      bgColor: 'bg-morandi-primary/10',
    },
  ]

  const totalPages = Math.ceil(transactionsCount / transactionsPageSize)

  if (isLoading && transactions.length === 0) {
    return <ModuleLoading />
  }

  return (
    <ContentPageLayout
      title={FINANCE_PAGE_LABELS.MANAGE_8421}
      contentClassName="flex-1 overflow-auto"
    >
      <div className="space-y-6">
        {/* 財務總覽 - Enhanced UI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-morandi-green/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-morandi-secondary mb-1">
                  {FINANCE_PAGE_LABELS.TOTAL_INCOME}
                </p>
                <div className="text-2xl font-bold">
                  <CurrencyCell amount={totalReceivable} variant="income" />
                </div>
              </div>
              <TrendingUp size={24} className="text-morandi-green" />
            </div>
          </Card>

          <Card className="p-4 bg-morandi-red/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-morandi-secondary mb-1">
                  {FINANCE_PAGE_LABELS.TOTAL_EXPENSE}
                </p>
                <div className="text-2xl font-bold">
                  <CurrencyCell amount={totalPayable} variant="expense" />
                </div>
              </div>
              <TrendingDown size={24} className="text-morandi-red" />
            </div>
          </Card>

          <Card className="p-4 bg-morandi-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-morandi-secondary mb-1">
                  {FINANCE_PAGE_LABELS.NET_PROFIT}
                </p>
                <div className="text-2xl font-bold">
                  <CurrencyCell
                    amount={netProfit}
                    variant={netProfit >= 0 ? 'default' : 'expense'}
                  />
                </div>
              </div>
              <DollarSign size={24} className={'text-morandi-primary'} />
            </div>
          </Card>

          <Card className="p-4 bg-morandi-gold/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-morandi-secondary mb-1">
                  {FINANCE_PAGE_LABELS.PENDING_ITEMS}
                </p>
                <div className="text-2xl font-bold text-morandi-gold">
                  <CurrencyCell amount={pendingPayments} />
                </div>
              </div>
              <AlertTriangle size={24} className="text-morandi-gold" />
            </div>
          </Card>
        </div>

        {/* 功能模組 - Restored */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {financeModules.map((module, index) => (
            <Link key={index} href={module.href}>
              <Card className="p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-lg ${module.bgColor} mr-3`}>
                        <module.icon size={24} className={module.color} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-morandi-primary">{module.title}</h4>
                        <p className="text-sm text-morandi-secondary">{module.description}</p>
                      </div>
                    </div>
                    <div className="text-sm text-morandi-secondary">{module.stats}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* 交易紀錄 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-morandi-primary">
            {FINANCE_PAGE_LABELS.TRANSACTION_RECORDS}
          </h3>
          <EnhancedTable columns={transactionColumns as TableColumn[]} data={transactions} />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-morandi-secondary">
              {FINANCE_PAGE_LABELS.PAGINATION_SUMMARY(
                transactionsCount,
                transactionsPage,
                totalPages
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchTransactions(transactionsPage - 1)}
                disabled={transactionsPage <= 1 || isLoading}
              >
                {FINANCE_PAGE_LABELS.LABEL_5163}
              </Button>
              <Button
                onClick={() => fetchTransactions(transactionsPage + 1)}
                disabled={transactionsPage >= totalPages || isLoading}
              >
                {FINANCE_PAGE_LABELS.LABEL_9383}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
