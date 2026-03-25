'use client'

import { useState } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { TrendingUp, Users, Receipt, FileDown, CreditCard } from 'lucide-react'
import { useCompanyIncome } from '@/features/finance/reports/hooks/useCompanyIncome'
import { useAuthStore } from '@/stores'
import { formatCurrency } from '@/lib/utils/format'

/**
 * 公司收款報表頁面
 * 
 * 顯示：
 * 1. 統計卡片（公司收入、團體收入、收款筆數）
 * 2. 依會計科目分類表格
 * 3. 依收款方式分類表格
 * 4. 匯出 Excel 功能
 */
export default function CompanyIncomePage() {
  const { user } = useAuthStore()
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getLastDayOfMonth())

  const { stats, bySubject, byPaymentMethod, isLoading } = useCompanyIncome(
    user?.workspace_id || '',
    startDate,
    endDate
  )

  const handleExport = () => {
    // TODO: 匯出 Excel（使用 xlsx 库）
    // const XLSX = require('xlsx')
    // const ws = XLSX.utils.json_to_sheet(bySubject || [])
    // const wb = XLSX.utils.book_new()
    // XLSX.utils.book_append_sheet(wb, ws, '公司收款報表')
    // XLSX.writeFile(wb, `公司收款報表_${startDate}_${endDate}.xlsx`)
    alert('匯出功能開發中...')
  }

  return (
    <ContentPageLayout
      title="📊 公司收款報表"
      description="查看公司收入統計、會計科目分類、收款方式分析"
      headerActions={
        <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          匯出 Excel
        </Button>
      }
    >
      {/* 篩選區 */}
      <Card className="p-4 mb-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">開始日期</label>
            <DatePicker value={startDate} onChange={date => setStartDate(date || '')} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">結束日期</label>
            <DatePicker value={endDate} onChange={date => setEndDate(date || '')} />
          </div>
          <Button variant="secondary" size="sm" onClick={() => {
            setStartDate(getFirstDayOfMonth())
            setEndDate(getLastDayOfMonth())
          }}>
            本月
          </Button>
        </div>
      </Card>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-morandi-gold/10">
              <TrendingUp className="h-6 w-6 text-morandi-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">公司收入</p>
              <p className="text-2xl font-bold text-morandi-gold">
                {formatCurrency(stats?.companyIncome || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">團體收入</p>
              <p className="text-2xl font-bold text-blue-500">
                {formatCurrency(stats?.tourIncome || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/10">
              <Receipt className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">收款筆數</p>
              <p className="text-2xl font-bold text-green-500">{stats?.totalReceipts || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 依會計科目分類表格 */}
      <Card className="mb-6">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">依會計科目分類</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">科目代碼</th>
                <th className="text-left p-3 font-medium">科目名稱</th>
                <th className="text-left p-3 font-medium">類型</th>
                <th className="text-right p-3 font-medium">收款筆數</th>
                <th className="text-right p-3 font-medium">總金額</th>
                <th className="text-left p-3 font-medium">日期範圍</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    載入中...
                  </td>
                </tr>
              ) : bySubject && bySubject.length > 0 ? (
                bySubject.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-sm">{row.subject_code}</td>
                    <td className="p-3">{row.subject_name}</td>
                    <td className="p-3 text-sm text-muted-foreground">{row.subject_type}</td>
                    <td className="p-3 text-right">{row.count}</td>
                    <td className="p-3 text-right font-bold text-morandi-gold">
                      {formatCurrency(row.total_amount)}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {row.min_date} ~ {row.max_date}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    查無資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 依收款方式分類表格 */}
      <Card>
        <div className="p-4 border-b flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">依收款方式分類</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">收款方式代碼</th>
                <th className="text-left p-3 font-medium">收款方式</th>
                <th className="text-right p-3 font-medium">收款筆數</th>
                <th className="text-right p-3 font-medium">總金額</th>
                <th className="text-left p-3 font-medium">日期範圍</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    載入中...
                  </td>
                </tr>
              ) : byPaymentMethod && byPaymentMethod.length > 0 ? (
                byPaymentMethod.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-sm">{row.payment_method_code}</td>
                    <td className="p-3 font-medium">{row.payment_method_name}</td>
                    <td className="p-3 text-right">{row.count}</td>
                    <td className="p-3 text-right font-bold text-morandi-gold">
                      {formatCurrency(row.total_amount)}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {row.min_date} ~ {row.max_date}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    查無資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentPageLayout>
  )
}

function getFirstDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

function getLastDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
}
