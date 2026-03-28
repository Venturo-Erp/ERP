'use client'

import { Card } from '@/components/ui/card'
import { FileText, BookOpen, BarChart3, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const quickLinks = [
  {
    href: '/accounting/vouchers',
    icon: FileText,
    title: '傳票管理',
    description: '查看和管理會計傳票',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    href: '/accounting/accounts',
    icon: BookOpen,
    title: '科目管理',
    description: '管理會計科目表',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    href: '/accounting/reports',
    icon: BarChart3,
    title: '會計報表',
    description: '總帳、試算表、損益表',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    href: '/accounting/checks',
    icon: TrendingUp,
    title: '票據管理',
    description: '管理支票和票據',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    href: '/accounting/period-closing',
    icon: Calendar,
    title: '期末結轉',
    description: '月結、季結、年結（含保留盈餘）',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
]

export default function AccountingPage() {
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    // 自動檢查並初始化科目表
    const checkAndInitialize = async () => {
      try {
        // 檢查科目表是否為空
        const { data: accounts, error } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .limit(1)

        if (error) {
          console.error('檢查科目表失敗:', error)
          return
        }

        // 如果科目表為空，自動初始化
        if (!accounts || accounts.length === 0) {
          setIsInitializing(true)

          const response = await fetch('/api/accounting/initialize', {
            method: 'POST',
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '初始化失敗')
          }

          const result = await response.json()
          // 初始化完成

          setIsInitializing(false)
        }
      } catch (error) {
        console.error('自動初始化失敗:', error)
        setIsInitializing(false)
      }
    }

    checkAndInitialize()
  }, [])

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
