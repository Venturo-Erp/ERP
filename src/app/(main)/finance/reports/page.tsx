'use client'

import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { ActionCell } from '@/components/table-cells'
import { 
  FileDown, 
  TrendingUp, 
  AlertCircle, 
  Wallet, 
  BarChart3,
  ExternalLink 
} from 'lucide-react'

interface ReportItem {
  id: string
  name: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

const reports: ReportItem[] = [
  {
    id: '1',
    name: '月請款報表',
    description: '依月份檢視所有請款單及出納單明細',
    href: '/finance/reports/monthly-disbursement',
    icon: FileDown,
    iconColor: 'text-morandi-gold',
  },
  {
    id: '2',
    name: '月收款報表',
    description: '依月份檢視收款明細與統計',
    href: '/finance/reports/monthly-income',
    icon: TrendingUp,
    iconColor: 'text-morandi-green',
  },
  {
    id: '3',
    name: '未結團旅遊團',
    description: '顯示已出發但尚未結團的旅遊團列表',
    href: '/finance/reports/unclosed-tours',
    icon: AlertCircle,
    iconColor: 'text-morandi-red',
  },
  {
    id: '4',
    name: '未收款訂單',
    description: '顯示有尾款尚未收取的訂單',
    href: '/finance/reports/unpaid-orders',
    icon: Wallet,
    iconColor: 'text-morandi-red',
  },
  {
    id: '5',
    name: '旅遊團損益表',
    description: '依團別檢視收支與利潤分析',
    href: '/finance/reports/tour-pnl',
    icon: BarChart3,
    iconColor: 'text-morandi-blue',
  },
]

export default function ReportsPage() {
  const columns: TableColumn<ReportItem>[] = [
    {
      key: 'name',
      label: '報表名稱',
      render: (_, row) => {
        const Icon = row.icon
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-morandi-container`}>
              <Icon className={`w-4 h-4 ${row.iconColor}`} />
            </div>
            <span className="font-medium text-morandi-primary">{row.name}</span>
          </div>
        )
      },
    },
    {
      key: 'description',
      label: '說明',
      render: value => (
        <span className="text-sm text-morandi-secondary">{String(value)}</span>
      ),
    },
  ]

  const renderActions = (report: ReportItem) => (
    <ActionCell
      actions={[
        {
          icon: ExternalLink,
          label: '開啟報表',
          onClick: () => {
            window.location.href = report.href
          },
        },
      ]}
    />
  )

  return (
    <ContentPageLayout
      title="財務報表"
      icon={BarChart3}
    >
      <div className="p-4">
        <EnhancedTable
          columns={columns}
          data={reports}
          actions={renderActions}
          onRowClick={(report) => {
            window.location.href = report.href
          }}
          bordered
        />
      </div>
    </ContentPageLayout>
  )
}
