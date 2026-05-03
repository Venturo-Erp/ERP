'use client'

import { useRouter } from 'next/navigation'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { FileBarChart, Construction } from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="出勤月報"
        icon={FileBarChart}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '出勤月報', href: '/hr/reports' },
        ]}
        tabs={[
          { value: '/hr/payroll', label: '薪資管理' },
          { value: '/hr/deductions', label: '扣款與津貼' },
          { value: '/hr/reports', label: '出勤月報' },
        ]}
        activeTab="/hr/reports"
        onTabChange={href => router.push(href)}
      />

      <div className="rounded-xl border border-border/60 bg-card/50 p-12 text-center space-y-3">
        <Construction className="w-10 h-10 mx-auto text-morandi-muted" />
        <h2 className="text-lg font-semibold text-morandi-primary">Phase 2 上線</h2>
        <p className="text-sm text-morandi-secondary max-w-md mx-auto">
          月度出勤統計報表（出勤率 / 加班時數 / 異常分佈 / 部門比較）+ 勞檢緊急套件 PDF 一鍵產出。
        </p>
        <p className="text-xs text-morandi-muted">
          目前可在「出勤管理」查單月打卡明細、「薪資管理」看月度薪資批次。
        </p>
      </div>
    </div>
  )
}
