'use client'

import { useRouter } from 'next/navigation'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Wallet, Construction } from 'lucide-react'

export default function DeductionsPage() {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="扣款與津貼"
        icon={Wallet}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '扣款津貼', href: '/hr/deductions' },
        ]}
        tabs={[
          { value: '/hr/payroll', label: '薪資管理' },
          { value: '/hr/deductions', label: '扣款與津貼' },
          { value: '/hr/reports', label: '出勤月報' },
        ]}
        activeTab="/hr/deductions"
        onTabChange={href => router.push(href)}
      />

      <div className="rounded-xl border border-border/60 bg-card/50 p-12 text-center space-y-3">
        <Construction className="w-10 h-10 mx-auto text-morandi-muted" />
        <h2 className="text-lg font-semibold text-morandi-primary">Phase 2 上線</h2>
        <p className="text-sm text-morandi-secondary max-w-md mx-auto">
          租戶自訂扣款項目（公會費 / 借支 / 罰款）與津貼項目（伙食 / 交通 / 加班補助）的設定介面。
        </p>
        <p className="text-xs text-morandi-muted">
          目前可在「員工管理 → 編輯員工 → 薪資設定」設定全勤獎金與其他津貼合計。
        </p>
      </div>
    </div>
  )
}
