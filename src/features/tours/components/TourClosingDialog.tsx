'use client'

import React, { useState, useMemo } from 'react'
import { X, Check, Calculator, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
// confirmation uses nested Dialog
import { Tour } from '@/stores/types'
import {
  usePaymentRequests,
  useOrdersSlim,
  useReceipts,
  useTourBonusSettings,
  updateTour,
  createPaymentRequest as createPaymentRequestApi,
} from '@/data'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { formatCurrency } from '@/lib/utils/format-currency'
import { generateTourClosingPDF } from '@/lib/pdf/tour-closing-pdf'
import { calculateFullProfit } from '@/features/tours/services/profit-calculation.service'
import { supabase } from '@/lib/supabase/client'
import { TOURS_LABELS } from './constants/labels'
import { TOUR_CLOSING_LABELS, TOUR_SERVICE_LABELS } from '../constants/labels'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface TourClosingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tour: Tour
  onSuccess?: () => void
}

export function TourClosingDialog({ open, onOpenChange, tour, onSuccess }: TourClosingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // 獎金比例設定
  const [salesBonusPercent, setSalesBonusPercent] = useState(5) // 業務獎金 %
  const [opBonusPercent, setOpBonusPercent] = useState(3) // OP 獎金 %

  // 使用 @/data hooks（SWR 自動載入）
  const { items: paymentRequests } = usePaymentRequests()
  const { items: orders } = useOrdersSlim()
  const { items: allReceipts } = useReceipts()
  const { items: bonusSettings } = useTourBonusSettings()

  // 計算團的總收入（從訂單）
  const tourOrders = useMemo(() => {
    return orders.filter(o => o.tour_id === tour.id)
  }, [orders, tour.id])

  const totalRevenue = useMemo(() => {
    return tourOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  }, [tourOrders])

  // 取得團的成本請款單（排除獎金類型）
  const tourCosts = useMemo(() => {
    return paymentRequests.filter(
      pr =>
        pr.tour_id === tour.id &&
        pr.request_type !== TOUR_CLOSING_LABELS.SALES_BONUS &&
        pr.request_type !== TOUR_CLOSING_LABELS.OP_BONUS
    )
  }, [paymentRequests, tour.id])

  // 取得團的收款單
  const tourReceipts = useMemo(() => {
    return allReceipts.filter(r => r.tour_id === tour.id)
  }, [allReceipts, tour.id])

  // 取得此團的獎金設定
  const tourBonusSettingsFiltered = useMemo(() => {
    return bonusSettings.filter(s => s.tour_id === tour.id)
  }, [bonusSettings, tour.id])

  // 取得團的獎金請款單
  const tourBonuses = useMemo(() => {
    return paymentRequests.filter(
      pr =>
        pr.tour_id === tour.id &&
        (pr.request_type === TOUR_CLOSING_LABELS.SALES_BONUS ||
          pr.request_type === TOUR_CLOSING_LABELS.OP_BONUS)
    )
  }, [paymentRequests, tour.id])

  // 計算總成本
  const totalCost = useMemo(() => {
    return tourCosts.reduce((sum, pr) => sum + (pr.amount || 0), 0)
  }, [tourCosts])

  // 計算獎金
  const salesBonus = useMemo(() => {
    return Math.round(totalRevenue * (salesBonusPercent / 100))
  }, [totalRevenue, salesBonusPercent])

  const opBonus = useMemo(() => {
    return Math.round(totalRevenue * (opBonusPercent / 100))
  }, [totalRevenue, opBonusPercent])

  const totalBonus = salesBonus + opBonus

  // 處理結案
  const handleClose = async () => {
    if (!tour.id) return

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()

      // 1. 產生業務獎金請款單
      if (salesBonus > 0) {
        await createPaymentRequestApi({
          code: `${tour.code}-B01`,
          request_number: `${tour.code}-B01`,
          tour_id: tour.id,
          tour_code: tour.code,
          tour_name: tour.name || tour.location || '',
          request_date: now.split('T')[0],
          request_type: TOUR_CLOSING_LABELS.SALES_BONUS,
          amount: salesBonus,
          status: 'pending',
          notes: TOUR_CLOSING_LABELS.SALES_BONUS_DESC(tour.code, salesBonusPercent),
        })
      }

      // 2. 產生 OP 獎金請款單
      if (opBonus > 0) {
        await createPaymentRequestApi({
          code: `${tour.code}-B02`,
          request_number: `${tour.code}-B02`,
          tour_id: tour.id,
          tour_code: tour.code,
          tour_name: tour.name || tour.location || '',
          request_date: now.split('T')[0],
          request_type: TOUR_CLOSING_LABELS.OP_BONUS,
          amount: opBonus,
          status: 'pending',
          notes: TOUR_CLOSING_LABELS.OP_BONUS_DESC(tour.code, opBonusPercent),
        })
      }

      // 3. 更新團狀態為結案（status=closed 唯一真相、closing_status 欄位停用）
      await updateTour(tour.id, {
        status: TOUR_STATUS.CLOSED,
        closing_date: now,
        updated_at: now,
      })

      // 4. 封存旅遊團頻道
      try {
        const { error: channelError } = await supabase
          .from('channels')
          .update({
            is_archived: true,
            archived_at: now,
            updated_at: now,
          })
          .eq('tour_id', tour.id)

        if (channelError) {
          logger.warn('封存旅遊團頻道失敗:', channelError)
        } else {
          logger.log(`旅遊團 ${tour.code} 頻道已封存`)
        }
      } catch (error) {
        // 封存頻道失敗不應阻止結案流程
        logger.warn('封存頻道時發生錯誤:', error)
      }

      toast.success(TOUR_CLOSING_LABELS.CLOSING_SUCCESS)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('結案失敗:', error)
      toast.error(TOUR_CLOSING_LABELS.CLOSING_FAILED)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 列印報表
  const handlePrintReport = async () => {
    setIsPrinting(true)
    try {
      // 計算團員總人數
      const memberCount = tourOrders.reduce((sum, o) => sum + (o.member_count || 0), 0)

      // 使用利潤計算引擎
      const profitResult = calculateFullProfit({
        receipts: tourReceipts,
        expenses: tourCosts,
        settings: tourBonusSettingsFiltered,
        memberCount,
      })

      await generateTourClosingPDF({
        tour,
        orders: tourOrders,
        receipts: tourReceipts,
        costs: tourCosts,
        profitResult,
      })
      toast.success(TOUR_CLOSING_LABELS.REPORT_GENERATED)
    } catch (error) {
      logger.error('生成報表失敗:', error)
      toast.error(TOUR_CLOSING_LABELS.REPORT_FAILED)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={20} className="text-morandi-gold" />
            {TOURS_LABELS.CLOSING_TITLE_PREFIX}
            {tour.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 團資訊摘要 */}
          <div className="p-4 bg-morandi-container/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-morandi-secondary">{TOURS_LABELS.LABEL_4272}</span>
              <span className="font-medium">{tour.name || tour.location}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-morandi-secondary">{TOURS_LABELS.LABEL_6293}</span>
              <span className="font-medium">
                {tourOrders.length}
                {TOURS_LABELS.UNIT_COUNT}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-morandi-secondary">{TOURS_LABELS.TOTAL_7262}</span>
              <span className="font-medium text-morandi-green">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-morandi-secondary">{TOURS_LABELS.TOTAL_2585}</span>
              <span className="font-medium text-morandi-red">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="text-morandi-secondary">{TOURS_LABELS.LABEL_6713}</span>
              <span
                className={`font-bold ${totalRevenue - totalCost >= 0 ? 'text-morandi-gold' : 'text-morandi-red'}`}
              >
                {formatCurrency(totalRevenue - totalCost)}
              </span>
            </div>
          </div>

          {/* 獎金設定 */}
          <div className="space-y-4">
            <h3 className="font-medium text-morandi-primary">{TOURS_LABELS.SETTINGS_6548}</h3>

            {/* 業務獎金 */}
            <div className="flex items-center gap-4">
              <Label className="w-24 text-sm">{TOURS_LABELS.LABEL_6960}</Label>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={salesBonusPercent}
                  onChange={e => setSalesBonusPercent(Number(e.target.value))}
                  className="w-20 text-center"
                />
                <span className="text-morandi-secondary">%</span>
                <span className="text-morandi-secondary mx-2">=</span>
                <span className="font-medium text-morandi-gold">{formatCurrency(salesBonus)}</span>
              </div>
            </div>

            {/* OP 獎金 */}
            <div className="flex items-center gap-4">
              <Label className="w-24 text-sm">{TOURS_LABELS.OP_BONUS}</Label>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={opBonusPercent}
                  onChange={e => setOpBonusPercent(Number(e.target.value))}
                  className="w-20 text-center"
                />
                <span className="text-morandi-secondary">%</span>
                <span className="text-morandi-secondary mx-2">=</span>
                <span className="font-medium text-morandi-gold">{formatCurrency(opBonus)}</span>
              </div>
            </div>

            {/* 總計 */}
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <Label className="w-24 text-sm font-medium">{TOURS_LABELS.TOTAL_6305}</Label>
              <span className="text-lg font-bold text-morandi-gold">
                {formatCurrency(totalBonus)}
              </span>
            </div>
          </div>

          {/* 說明 */}
          <div className="p-3 bg-status-warning-bg border border-status-warning rounded-lg">
            <p className="text-sm text-status-warning">{TOURS_LABELS.LABEL_1342}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handlePrintReport}
            disabled={isPrinting}
            className="gap-2"
          >
            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {isPrinting ? TOURS_LABELS.PRINTING : TOURS_LABELS.PRINT_REPORT}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {TOURS_LABELS.CANCEL}
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={isSubmitting}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
          >
            <Check size={16} />
            {isSubmitting ? TOURS_LABELS.PROCESSING : TOURS_LABELS.CONFIRM_CLOSE}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 二次確認 Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent level={3} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{TOURS_LABELS.CONFIRM_CLOSE}</DialogTitle>
            <DialogDescription>{TOURS_LABELS.CONFIRM_CLOSE_WARNING}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              {TOURS_LABELS.CANCEL}
            </Button>
            <Button
              onClick={() => {
                setShowConfirmation(false)
                handleClose()
              }}
              className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
            >
              {TOURS_LABELS.CONFIRM_CLOSE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
