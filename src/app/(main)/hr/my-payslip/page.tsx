'use client'

import React, { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Receipt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CurrencyCell } from '@/components/table-cells'
import { logger } from '@/lib/utils/logger'

interface PayrollRecord {
  id: string
  payroll_period_id: string
  base_salary: number
  overtime_pay: number
  bonus: number
  meal_allowance: number
  transportation_allowance: number
  unpaid_leave_deduction: number
  late_deduction: number
  other_deductions: number
  gross_salary: number
  net_salary: number
  work_days: number
  overtime_hours: number
  paid_leave_days: number
  unpaid_leave_days: number
  allowance_details: Record<string, number> | null
  deduction_details: Record<string, number> | null
  year?: number
  month?: number
}

export default function MyPayslipPage() {
  const user = useAuthStore(state => state.user)
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        // 查已確認/已付的薪資期間
        const { data: periods } = await supabase
          .from('payroll_periods')
          .select('id, year, month, status')
          .eq('year', year)
          .in('status', ['confirmed', 'paid'])
          .order('month', { ascending: false })

        if (!periods?.length) { setRecords([]); return }

        const periodIds = periods.map(p => p.id)
        const periodMap = new Map(periods.map(p => [p.id, p]))

        const { data: payrolls } = await supabase
          .from('payroll_records')
          .select('*')
          .eq('employee_id', user.id)
          .in('payroll_period_id', periodIds)

        const mapped = (payrolls || []).map(r => {
          const period = periodMap.get(r.payroll_period_id)
          return {
            ...r,
            year: period?.year,
            month: period?.month,
            allowance_details: (typeof r.allowance_details === 'object' ? r.allowance_details : null) as Record<string, number> | null,
            deduction_details: (typeof r.deduction_details === 'object' ? r.deduction_details : null) as Record<string, number> | null,
          }
        })

        setRecords(mapped as PayrollRecord[])
      } catch (err) {
        logger.error('載入薪資條失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, year])

  return (
    <ContentPageLayout title="我的薪資條" icon={Receipt}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-morandi-secondary">年度</Label>
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 h-8 text-sm" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-morandi-muted">載入中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-morandi-muted">本年度尚無薪資紀錄</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* 左側：月份列表 */}
            <div className="space-y-2">
              {records.map(r => (
                <Card
                  key={r.id}
                  onClick={() => setSelectedRecord(r)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedRecord?.id === r.id ? 'border-morandi-gold bg-morandi-gold/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-morandi-primary">{r.year} 年 {r.month} 月</p>
                      <p className="text-xs text-morandi-muted mt-0.5">出勤 {r.work_days} 天 · 加班 {r.overtime_hours}h</p>
                    </div>
                    <CurrencyCell amount={r.net_salary} className="text-lg font-bold text-morandi-primary" />
                  </div>
                </Card>
              ))}
            </div>

            {/* 右側：薪資明細 */}
            {selectedRecord ? (
              <Card className="rounded-xl border border-border p-6 sticky top-4">
                <h3 className="text-base font-semibold text-morandi-primary mb-4">
                  {selectedRecord.year} 年 {selectedRecord.month} 月 薪資明細
                </h3>

                {/* 收入 */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-morandi-green border-b border-border/50 pb-1">收入</p>
                  <Row label="底薪" amount={selectedRecord.base_salary} />
                  <Row label="加班費" amount={selectedRecord.overtime_pay} />
                  <Row label="獎金" amount={selectedRecord.bonus} />
                  {/* 津貼明細（從 allowance_details 動態讀取） */}
                  {selectedRecord.allowance_details && Object.entries(selectedRecord.allowance_details).map(([name, amount]) => (
                    <Row key={name} label={name} amount={amount} />
                  ))}
                  {/* fallback: 如果沒有 allowance_details，顯示舊欄位 */}
                  {!selectedRecord.allowance_details && (
                    <>
                      <Row label="伙食津貼" amount={selectedRecord.meal_allowance} />
                      <Row label="交通津貼" amount={selectedRecord.transportation_allowance} />
                    </>
                  )}
                </div>

                {/* 扣款 */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-morandi-red border-b border-border/50 pb-1">扣款</p>
                  <Row label="無薪假扣除" amount={-selectedRecord.unpaid_leave_deduction} negative />
                  <Row label="遲到扣除" amount={-selectedRecord.late_deduction} negative />
                  {/* 法定扣款明細（從 deduction_details 動態讀取） */}
                  {selectedRecord.deduction_details && Object.entries(selectedRecord.deduction_details).map(([name, amount]) => (
                    <Row key={name} label={name} amount={-amount} negative />
                  ))}
                  {/* fallback: 如果沒有 deduction_details，顯示舊的其他扣除 */}
                  {!selectedRecord.deduction_details && (
                    <Row label="其他扣除" amount={-selectedRecord.other_deductions} negative />
                  )}
                </div>

                {/* 合計 */}
                <div className="border-t-2 border-morandi-primary/20 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-morandi-secondary">應發合計</span>
                    <CurrencyCell amount={selectedRecord.gross_salary} className="font-medium" />
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-semibold text-morandi-primary">實發金額</span>
                    <CurrencyCell amount={selectedRecord.net_salary} className="font-bold text-morandi-primary text-lg" />
                  </div>
                </div>

                {/* 出勤摘要 */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-morandi-secondary mb-2">出勤摘要</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-morandi-muted">出勤天數</span>
                      <span className="text-morandi-primary">{selectedRecord.work_days} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-morandi-muted">加班時數</span>
                      <span className="text-morandi-gold">{selectedRecord.overtime_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-morandi-muted">有薪假</span>
                      <span className="text-morandi-primary">{selectedRecord.paid_leave_days} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-morandi-muted">無薪假</span>
                      <span className="text-morandi-red">{selectedRecord.unpaid_leave_days} 天</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center text-morandi-muted text-sm rounded-xl border border-dashed border-border p-12">
                點選左側月份查看明細
              </div>
            )}
          </div>
        )}
      </div>
    </ContentPageLayout>
  )
}

function Row({ label, amount, negative }: { label: string; amount: number; negative?: boolean }) {
  if (!amount || amount === 0) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-morandi-secondary">{label}</span>
      <span className={negative ? 'text-morandi-red' : ''}>{negative && '-'}${Math.abs(amount).toLocaleString()}</span>
    </div>
  )
}
