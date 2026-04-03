'use client'
/**
 * SupplierFinancePage - 供應商財務報表
 *
 * 顯示營收統計、請款記錄
 */

import React, { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { formatCurrency } from '@/lib/utils/format-currency'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { SUPPLIER_LABELS } from './constants/labels'

interface FinanceSummary {
  totalRevenue: number
  pendingPayment: number
  completedPayment: number
  taskCount: number
}

interface PaymentRecord {
  id: string
  tour_code: string
  tour_name: string
  service_date: string
  amount: number
  status: 'pending' | 'paid'
  paid_at: string | null
}

export function SupplierFinancePage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')
  const [summary, setSummary] = useState<FinanceSummary>({
    totalRevenue: 0,
    pendingPayment: 0,
    completedPayment: 0,
    taskCount: 0,
  })
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  // 計算日期範圍
  const dateRange = useMemo(() => {
    const now = new Date()
    switch (selectedPeriod) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }, [selectedPeriod])

  // 載入財務資料
  useEffect(() => {
    const loadData = async () => {
      if (!user?.workspace_id) return
      setIsLoading(true)

      try {
        // 載入已確認的需求回覆（有金額的）
        const { data: responsesData } = await supabase
          .from('supplier_request_responses')
          .select(
            `
            id,
            response_type,
            quoted_price,
            created_at,
            tour_requests (
              id,
              code,
              tour_id,
              service_date,
              tours (
                code,
                name
              )
            )
          `
          )
          .eq('supplier_id', user.workspace_id)
          .eq('response_type', 'accepted')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())

        // 計算統計
        let totalRevenue = 0
        const pendingPayment = 0
        const completedPayment = 0
        const paymentRecords: PaymentRecord[] = []

        ;(responsesData || []).forEach(r => {
          const amount = r.quoted_price || 0
          const req = r.tour_requests as unknown as {
            id: string
            code: string
            service_date: string
            tours: { code: string; name: string }
          }

          totalRevenue += amount

          paymentRecords.push({
            id: r.id,
            tour_code: req?.tours?.code || '-',
            tour_name: req?.tours?.name || '-',
            service_date: req?.service_date || '',
            amount,
            status: 'pending',
            paid_at: null,
          })
        })

        setSummary({
          totalRevenue,
          pendingPayment,
          completedPayment,
          taskCount: responsesData?.length || 0,
        })

        setPayments(paymentRecords)
      } catch (error) {
        logger.error('載入財務資料失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.workspace_id, dateRange])

  return (
    <ContentPageLayout title={SUPPLIER_LABELS.LABEL_8192} icon={LineChart} className="space-y-6">
      {/* 期間選擇 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-morandi-secondary" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">{SUPPLIER_LABELS.LABEL_4658}</SelectItem>
              <SelectItem value="last_month">{SUPPLIER_LABELS.LABEL_4990}</SelectItem>
              <SelectItem value="last_3_months">{SUPPLIER_LABELS.LABEL_9090}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-morandi-secondary">
            {format(dateRange.start, 'yyyy/MM/dd')} - {format(dateRange.end, 'yyyy/MM/dd')}
          </span>
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {SUPPLIER_LABELS.EXPORT_5502}
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {SUPPLIER_LABELS.TOTAL_1389}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-morandi-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-morandi-secondary mt-1">
              {SUPPLIER_LABELS.TASK_COUNT(summary.taskCount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {SUPPLIER_LABELS.LABEL_2454}
            </CardTitle>
            <Clock className="h-4 w-4 text-morandi-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-blue">
              {formatCurrency(summary.pendingPayment)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {SUPPLIER_LABELS.LABEL_5100}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-morandi-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-green">
              {formatCurrency(summary.completedPayment)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {SUPPLIER_LABELS.LABEL_7764}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-morandi-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalRevenue > 0
                ? Math.round((summary.completedPayment / summary.totalRevenue) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 請款明細 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {SUPPLIER_LABELS.LABEL_9799}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-morandi-secondary">
              {SUPPLIER_LABELS.LOADING_6912}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">
              {SUPPLIER_LABELS.NOT_FOUND_6711}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      {SUPPLIER_LABELS.LABEL_6153}
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      {SUPPLIER_LABELS.LABEL_9750}
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      {SUPPLIER_LABELS.LABEL_4272}
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-morandi-secondary">
                      {SUPPLIER_LABELS.AMOUNT}
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-morandi-secondary">
                      {SUPPLIER_LABELS.STATUS}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 px-2">
                        {payment.service_date
                          ? format(new Date(payment.service_date), 'MM/dd (EEE)', { locale: zhTW })
                          : '-'}
                      </td>
                      <td className="py-3 px-2 font-mono text-sm">{payment.tour_code}</td>
                      <td className="py-3 px-2">{payment.tour_name}</td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={payment.status === 'paid' ? 'default' : 'outline'}>
                          {payment.status === 'paid'
                            ? SUPPLIER_LABELS.STATUS_PAID
                            : SUPPLIER_LABELS.STATUS_PENDING_CLAIM}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </ContentPageLayout>
  )
}
