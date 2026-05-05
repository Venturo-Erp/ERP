'use client'

/**
 * TourClosingSections — 結案專屬區塊（嵌進總覽分頁）
 *
 * 設計：
 * - 把舊 `tour-closing-tab.tsx` 裡 closing-only 的部分（利潤計算表 + 獎金明細 + 結案狀況）
 *   抽出來、獨立成可嵌入「總覽」分頁的 sections
 * - 上層在 TourTabs 用 workspace feature 開關（`tours.closing`）決定要不要 mount
 *   → 沒開的 workspace 不會 fetch 這些資料、不會看到這 3 段
 * - 「總覽」原本的 TourOverview / TourReceipts / TourCosts 不重複、留在外面
 */

import { useMemo, useState, useCallback } from 'react'
import { mutate as globalMutate } from 'swr'
import { Loader2, Unlock, FileDown, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import { ProfitTab } from './ProfitTab'
import { BonusSettingsDialog } from './BonusSettingsDialog'
import { ClosingReportDialog } from './ClosingReportDialog'
import {
  useReceipts,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
  updateTour,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import { generateBonusPaymentRequest } from '../services/bonus-payment.service'
import { invalidatePaymentRequests, invalidateTourBonusSettings } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { BonusSettingType } from '@/types/bonus.types'
import type { PrintTourClosingPreviewProps } from './PrintTourClosingPreview'

interface TourClosingSectionsProps {
  tour: Tour
}

export function TourClosingSections({ tour }: TourClosingSectionsProps) {
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const { items: allReceipts } = useReceipts()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { get: getEmployee } = useEmployeeDictionary()
  const { user } = useAuthStore()

  const orders = useMemo(
    () => (allOrders ?? []).filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderIds]
  )

  const paymentRequests = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
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

  const isClosed = tour.status === TOUR_STATUS.CLOSED
  const statusInfo = isClosed
    ? { label: '已結團', color: 'bg-morandi-green/20 text-morandi-green' }
    : { label: '進行中', color: 'bg-morandi-gold/20 text-morandi-gold' }

  const handleToggleClosingStatus = useCallback(async () => {
    const nextStatus = isClosed ? TOUR_STATUS.RETURNED : TOUR_STATUS.CLOSED
    setStatusUpdating(true)
    try {
      await updateTour(tour.id, {
        status: nextStatus,
        ...(nextStatus === TOUR_STATUS.CLOSED
          ? { closing_date: new Date().toISOString() }
          : { closing_date: null }),
      })
      // updateTour 只動「tours 列表」SWR cache、團詳情頁用另一條 key (`tour-${id}`)
      // 不手動 invalidate 這條、畫面會看不到狀態更新（重新開啟按鈕「沒反應」的 root cause）
      await globalMutate(`tour-${tour.id}`)
      toast.success(nextStatus === TOUR_STATUS.CLOSED ? '已標記為結團' : '已重新開啟團')
    } catch (err) {
      logger.error('更新結案狀態失敗', err)
      toast.error('狀態更新失敗')
    } finally {
      setStatusUpdating(false)
    }
  }, [isClosed, tour.id])

  // 結案報告資料（給 ClosingReportDialog 用）
  const reportData: PrintTourClosingPreviewProps = useMemo(() => {
    const adaptedReceipts = receipts.map(r => ({
      ...r,
      receipt_number: r.receipt_number ?? '',
      allocation_mode: 'single' as const,
      payment_items: [],
      total_amount: Number(r.receipt_amount) || 0,
      status: r.status === 'confirmed' ? ('received' as const) : ('pending' as const),
      created_by: r.created_by ?? '',
      updated_at: r.updated_at ?? '',
      created_at: r.created_at ?? '',
    }))

    const profitResult = calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: paymentRequests.map(pr => ({ amount: pr.amount ?? 0 })),
      settings: bonusSettings,
      memberCount,
      employeeDict,
    })

    return {
      tour,
      receipts: receipts.map(r => ({
        receipt_number: r.receipt_number,
        receipt_date: r.receipt_date,
        receipt_amount: Number(r.receipt_amount) || 0,
        amount: Number(r.receipt_amount) || 0,
        payment_method: r.payment_method,
      })),
      costs: paymentRequests,
      profitResult,
      preparedBy: user?.name ?? undefined,
    }
  }, [receipts, paymentRequests, bonusSettings, memberCount, employeeDict, tour, user])

  const handleConfirmCloseFromReport = useCallback(async () => {
    try {
      // === Step 1: 自動生成所有「獎金類」請款單（OP / 業務 / 團隊）===
      // 行政費 + 營收稅已經在 calc service 內按順序扣完了、得到 net_profit
      // 這邊只把 amount > 0 且還沒生過請款單的獎金 setting 一次跑完
      const today = new Date().toISOString().slice(0, 10)
      const tourCode = tour.code || ''
      const tourName = tour.name || ''
      const profitResult = reportData.profitResult

      const bonusesToIssue = [
        ...profitResult.employee_bonuses,
        ...profitResult.team_bonuses,
      ].filter(b => b.amount > 0 && !b.setting.payment_request_id)

      if (bonusesToIssue.length > 0) {
        // 預先撈這個 workspace 的所有 SAL- code、當 code generator 的初始 buffer
        // 之後每筆生成 service 內部會 append 進 buffer、避免序號重複
        const { data: existingBNS } = await supabase
          .from('payment_requests')
          .select('code')
          .eq('workspace_id', tour.workspace_id ?? '')
          .like('code', 'BNS-%')
        const codeBuffer: { code?: string }[] = (existingBNS ?? []) as { code?: string }[]

        // 順序生（不可 Promise.all、不然多筆同 batch 會搶到相同序號）
        for (const b of bonusesToIssue) {
          await generateBonusPaymentRequest({
            setting: b.setting,
            amount: b.amount,
            disbursementDate: today,
            payeeName:
              b.employee_name ||
              (b.setting.type === BonusSettingType.TEAM_BONUS ? '團隊獎金' : '獎金'),
            tourCode,
            tourName,
            codeBuffer,
          })
        }
      }

      // === Step 2: 鎖定團（標記結團 + 寫 closing_date）===
      await updateTour(tour.id, {
        status: TOUR_STATUS.CLOSED,
        closing_date: new Date().toISOString(),
      })

      // === Step 3: invalidate 所有相關 cache、UI 即時更新 ===
      await Promise.all([
        globalMutate(`tour-${tour.id}`),
        invalidateTourBonusSettings(),
        invalidatePaymentRequests(),
      ])

      const issuedMsg =
        bonusesToIssue.length > 0
          ? `、已生成 ${bonusesToIssue.length} 張獎金請款單`
          : ''
      toast.success(`已列印並標記為結團${issuedMsg}`)
    } catch (err) {
      logger.error('結團失敗', err)
      toast.error('結團失敗、請再試一次')
      throw err
    }
  }, [tour.id, tour.code, tour.name, reportData])

  return (
    <>
      {/* 利潤計算表 + 獎金明細 */}
      <ProfitTab tour={tour} />

      {/* 結案狀況 */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-morandi-primary">結案狀態</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft-gold" onClick={() => setBonusDialogOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            編輯獎金設定
          </Button>
          <Button variant="soft-gold" onClick={() => setReportDialogOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            {isClosed ? '檢視結案報告' : '生成結案報告'}
          </Button>
          {isClosed && (
            <Button
              variant="outline"
              onClick={handleToggleClosingStatus}
              disabled={statusUpdating}
            >
              {statusUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              重新開啟
            </Button>
          )}
        </div>
      </div>

      <BonusSettingsDialog
        open={bonusDialogOpen}
        onOpenChange={setBonusDialogOpen}
        tour={tour}
      />

      <ClosingReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        data={reportData}
        onConfirmClose={handleConfirmCloseFromReport}
        alreadyClosed={isClosed}
      />
    </>
  )
}
