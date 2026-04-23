'use client'

import { Card } from '@/components/ui/card'
import { FileText, BookOpen, BarChart3, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'

const quickLinks = [
  {
    href: '/accounting/vouchers',
    icon: FileText,
    title: '傳票管理',
    description: '查看和管理會計傳票',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
  },
  {
    href: '/accounting/accounts',
    icon: BookOpen,
    title: '科目管理',
    description: '管理會計科目表',
    color: 'text-morandi-green',
    bg: 'bg-morandi-green/10',
  },
  {
    href: '/accounting/reports',
    icon: BarChart3,
    title: '會計報表',
    description: '總帳、試算表、損益表',
    color: 'text-morandi-secondary',
    bg: 'bg-morandi-container',
  },
  {
    href: '/accounting/checks',
    icon: TrendingUp,
    title: '票據管理',
    description: '管理支票和票據',
    color: 'text-status-warning',
    bg: 'bg-status-warning/10',
  },
  {
    href: '/accounting/period-closing',
    icon: Calendar,
    title: '期末結轉',
    description: '月結、季結、年結（含保留盈餘）',
    color: 'text-morandi-red',
    bg: 'bg-morandi-red/10',
  },
]

export default function AccountingPage() {
  // 期初設定走 /accounting/opening-balances（尚未建、列在技術債）
  // 原本進入此頁會自動觸發 /api/accounting/initialize 塞預設科目、
  // 跟「明確啟用會計」的 vision 衝突、2026-04-23 拔掉。
  return (
    <ContentPageLayout title="會計系統">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${link.bg}`}>
                  <link.icon className={`w-6 h-6 ${link.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{link.title}</h3>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">本月傳票數</div>
          <div className="text-2xl font-bold">-</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">未兌現支票</div>
          <div className="text-2xl font-bold">-</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">本月淨利</div>
          <div className="text-2xl font-bold">-</div>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
