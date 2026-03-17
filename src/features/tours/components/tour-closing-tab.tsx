'use client'

/**
 * TourClosingTab - 結案頁籤
 *
 * 從核心表 tour_itinerary_items 讀取資料，按類別分組顯示成本對照，
 * 底部彙總估價 vs 實際成本差異，並可生成結案報告 PDF。
 */

import { useMemo, useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import { generateTourClosingPDF } from '@/lib/pdf/tour-closing-pdf'
import type { TourClosingPDFData } from '@/lib/pdf/tour-closing-pdf'
import type { Tour } from '@/stores/types'
import type { TourItineraryItem } from '../types/tour-itinerary-item.types'
import { ProfitTab } from './ProfitTab'
import { BonusSettingTab } from './BonusSettingTab'
import {
  useReceiptOrders,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import { useAuthStore } from '@/stores'

// === 類別標籤 ===
const CATEGORY_LABELS: Record<string, string> = {
  transport: '交通',
  'group-transport': '團體交通',
  accommodation: '住宿',
  meals: '餐食',
  activities: '活動',
  others: '其他',
  guide: '導遊',
}

interface TourClosingTabProps {
  tour: Tour
}

interface CategoryGroup {
  category: string
  label: string
  items: TourItineraryItem[]
  estimatedTotal: number
  actualTotal: number
}

function getEstimatedCost(item: TourItineraryItem): number {
  return item.estimated_cost ?? item.unit_price ?? item.total_cost ?? 0
}

function getActualCost(item: TourItineraryItem): number | null {
  if (item.confirmed_cost != null) return item.confirmed_cost
  if (item.actual_expense != null) return item.actual_expense
  return null
}

export function TourClosingTab({ tour }: TourClosingTabProps) {
  const { items, loading } = useTourItineraryItemsByTour(tour.id)
  const [pdfLoading, setPdfLoading] = useState(false)

  // 同 ProfitTab 的資料取法
  const { items: allReceipts } = useReceiptOrders()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { get: getEmployee } = useEmployeeDictionary()
  const { user } = useAuthStore()

  const orders = useMemo(
    () => allOrders?.filter(o => o.tour_id === tour.id) ?? [],
    [allOrders, tour.id]
  )

  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  const receipts = useMemo(
    () => (allReceipts ?? []).filter(r => r.order_id && orderIds.has(r.order_id)),
    [allReceipts, orderIds]
  )

  const paymentRequests = useMemo(
    () => (allPaymentRequests ?? []).filter(pr => pr.tour_id === tour.id),
    [allPaymentRequests, tour.id]
  )

  const bonusSettings = useMemo(
    () => (allBonusSettings ?? []).filter(s => s.tour_id === tour.id),
    [allBonusSettings, tour.id]
  )

  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  const employeeDict = useMemo(() => {
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  const normalExpenses = useMemo(
    () => paymentRequests.filter(pr => {
      const rt = (pr.request_type || '').toLowerCase()
      return !rt.includes('bonus') && !rt.includes('獎金')
    }),
    [paymentRequests]
  )

  // 按 category 分組
  const groups = useMemo<CategoryGroup[]>(() => {
    if (!items.length) return []

    const map = new Map<string, TourItineraryItem[]>()
    for (const item of items) {
      const cat = item.category ?? 'others'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }

    return Array.from(map.entries()).map(([category, catItems]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      items: catItems,
      estimatedTotal: catItems.reduce((sum, it) => sum + getEstimatedCost(it), 0),
      actualTotal: catItems.reduce((sum, it) => sum + (getActualCost(it) ?? getEstimatedCost(it)), 0),
    }))
  }, [items])

  // 彙總
  const summary = useMemo(() => {
    const estimatedTotal = groups.reduce((s, g) => s + g.estimatedTotal, 0)
    const actualTotal = groups.reduce((s, g) => s + g.actualTotal, 0)
    const diff = actualTotal - estimatedTotal
    const participantCount = tour.current_participants ?? tour.max_participants ?? 0
    const perPerson = participantCount > 0 ? actualTotal / participantCount : null
    return { estimatedTotal, actualTotal, diff, participantCount, perPerson }
  }, [groups, tour.current_participants, tour.max_participants])

  // PDF 生成
  const handleGeneratePDF = async () => {
    setPdfLoading(true)
    try {
      const adaptedReceipts = receipts.map(r => ({
        ...r,
        receipt_number: r.code ?? '',
        allocation_mode: 'single' as const,
        payment_items: [],
        total_amount: Number(r.amount) || 0,
        status: 'received' as const,
        created_by: '',
        updated_at: r.updated_at ?? '',
        created_at: r.created_at ?? '',
      }))

      const profitResult = calculateFullProfit({
        receipts: adaptedReceipts,
        expenses: normalExpenses.map(pr => ({ amount: pr.amount ?? 0 })),
        settings: bonusSettings,
        memberCount,
        employeeDict,
      })

      const pdfData: TourClosingPDFData = {
        tour,
        orders: orders.map(o => ({
          code: o.code,
          contact_person: o.contact_person,
          member_count: o.member_count,
          total_amount: o.total_amount,
        })),
        receipts: receipts.map(r => ({
          receipt_number: r.code,
          receipt_date: r.receipt_date,
          receipt_amount: Number(r.amount) || 0,
          amount: Number(r.amount) || 0,
          payment_method: r.payment_method,
        })),
        costs: paymentRequests,
        profitResult,
        preparedBy: user?.name ?? undefined,
      }

      await generateTourClosingPDF(pdfData)
      toast.success('結案報告 PDF 已生成')
    } catch (err) {
      logger.error('PDF generation failed', err)
      toast.error('PDF 生成失敗')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 成本對照表 */}
      <div className="border rounded-lg">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">成本對照（核心表）</h3>
        </div>

        {groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            尚無行程項目資料
          </div>
        ) : (
          <div className="divide-y">
            {groups.map(group => (
              <div key={group.category}>
                <div className="px-4 py-2 bg-muted/10 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">項目</th>
                      <th className="px-4 py-2 text-right font-medium">估價成本</th>
                      <th className="px-4 py-2 text-right font-medium">實際成本</th>
                      <th className="px-4 py-2 text-right font-medium">差異</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(item => {
                      const est = getEstimatedCost(item)
                      const act = getActualCost(item)
                      const diff = act != null ? act - est : null
                      return (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2">
                            {item.title ?? '-'}
                            {item.sub_category && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.sub_category})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {formatCurrency(est)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {act != null ? formatCurrency(act) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-right font-mono tabular-nums ${
                            diff != null && diff > 0 ? 'text-red-600' : diff != null && diff < 0 ? 'text-green-600' : ''
                          }`}>
                            {diff != null ? (
                              `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* 彙總 */}
        {groups.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 space-y-1">
            <div className="flex justify-between text-sm">
              <span>估價總成本</span>
              <span className="font-mono tabular-nums font-medium">
                {formatCurrency(summary.estimatedTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>實際總成本</span>
              <span className="font-mono tabular-nums font-medium">
                {formatCurrency(summary.actualTotal)}
              </span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${
              summary.diff > 0 ? 'text-red-600' : summary.diff < 0 ? 'text-green-600' : ''
            }`}>
              <span>差異</span>
              <span className="font-mono tabular-nums">
                {summary.diff > 0 ? '+' : ''}{formatCurrency(summary.diff)}
              </span>
            </div>
            {summary.perPerson != null && (
              <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t">
                <span>人均成本（{summary.participantCount} 人）</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(Math.round(summary.perPerson))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 利潤總覽 + 獎金 */}
      <ProfitTab tour={tour} />
      <BonusSettingTab tour={tour} />

      {/* PDF 按鈕 */}
      <div className="flex justify-end">
        <Button onClick={handleGeneratePDF} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          生成結案報告 PDF
        </Button>
      </div>
    </div>
  )
}
