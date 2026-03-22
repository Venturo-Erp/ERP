'use client'
/**
 * LinkDocumentsToTourDialog - 快速報價單管理對話框
 *
 * 注意：團體報價單和行程表已移至專屬分頁（TourQuoteTab、TourItineraryTab）
 * 此對話框現在只用於管理快速報價單（可建立多份比價）
 */

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Calculator, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { useQuotes, useOrdersSlim, createQuote, updateQuote, deleteQuote } from '@/data'
import { DEFAULT_CATEGORIES } from '@/features/quotes/constants'
import type { Tour, Quote } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { stripHtml } from '@/lib/utils/string-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TOURS_LABELS } from './constants/labels'
import { LINK_DOCUMENTS_LABELS } from '../constants/labels'

/**
 * 生成團號為基礎的報價單編號
 * - 團體報價單: {團號}-Q{2位數} → DAD260213A-Q01
 * - 快速報價單: {團號}-QQ{2位數} → DAD260213A-QQ01
 */
async function generateTourBasedQuoteCode(
  tourId: string,
  tourCode: string,
  quoteType: 'standard' | 'quick'
): Promise<string> {
  const prefix = quoteType === 'quick' ? 'QQ' : 'Q'
  const codePattern = `${tourCode}-${prefix}%`

  // 查詢該團現有的同類型報價單編號
  const { data: existingQuotes } = await supabase
    .from('quotes')
    .select('code')
    .eq('tour_id', tourId)
    .like('code', codePattern)
    .order('code', { ascending: false })
    .limit(1)

  let nextNumber = 1
  if (existingQuotes && existingQuotes.length > 0 && existingQuotes[0]?.code) {
    // 從 "DAD260213A-Q01" 提取數字部分
    const match = existingQuotes[0].code.match(/-(?:QQ|Q)(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  return `${tourCode}-${prefix}${String(nextNumber).padStart(2, '0')}`
}

interface LinkDocumentsToTourDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

export function LinkDocumentsToTourDialog({
  isOpen,
  onClose,
  tour,
}: LinkDocumentsToTourDialogProps) {
  const router = useRouter()

  // 報價單
  const { items: quotes, loading: loadingQuotes } = useQuotes()

  // 訂單（用於取得業務人員）
  const { items: orders } = useOrdersSlim()

  // 報價單狀態
  const [isCreatingQuickQuote, setIsCreatingQuickQuote] = useState(false)
  const [isDeletingQuote, setIsDeletingQuote] = useState(false)

  // 取得該團的第一筆訂單資訊（用於報價單預填客戶資訊）
  const firstTourOrder = useMemo(() => {
    return orders.find(o => o.tour_id === tour.id) || null
  }, [orders, tour.id])

  const tourSalesPerson = firstTourOrder?.sales_person || null

  // 已連結的快速報價單
  const linkedQuickQuotes = useMemo(() => {
    return quotes.filter(q => {
      const item = q as Quote & { _deleted?: boolean }
      return q.tour_id === tour.id && !item._deleted && q.quote_type === 'quick'
    })
  }, [quotes, tour.id])

  // 建立快速報價單並跳轉到編輯頁面
  const handleCreateQuickQuote = async () => {
    try {
      setIsCreatingQuickQuote(true)

      // 生成團號為基礎的編號: {團號}-QQ{2位數}
      const quoteCode = tour.code
        ? await generateTourBasedQuoteCode(tour.id, tour.code, 'quick')
        : undefined

      const createData = {
        name: tour.name,
        quote_type: 'quick' as const,
        status: 'draft' as const,
        tour_id: tour.id,
        // 客戶資訊：優先從訂單取得，否則用團名
        customer_name: firstTourOrder?.contact_person || tour.name,
        contact_phone: firstTourOrder?.contact_phone || '',
        tour_code: tour.code || '',
        issue_date: new Date().toISOString().split('T')[0],
        group_size: tour.max_participants || 20,
        // 從訂單取得業務人員
        handler_name: tourSalesPerson || undefined,
        // 使用團號為基礎的編號
        ...(quoteCode ? { code: quoteCode } : {}),
      }

      const newQuote = await createQuote(createData as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        onClose()
        // 快速報價單使用專屬路由
        router.push(`/quotes/quick/${newQuote.id}`)
      }
    } catch (error) {
      logger.error('建立快速報價單失敗:', error)
      toast.error(LINK_DOCUMENTS_LABELS.CREATE_QUICK_QUOTE_FAILED)
    } finally {
      setIsCreatingQuickQuote(false)
    }
  }

  const handleDeleteQuote = async (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation()
    if (
      !confirm(
        `${TOURS_LABELS.CONFIRM_DELETE_PREFIX}${quote.name}${TOURS_LABELS.CONFIRM_DELETE_SUFFIX}`
      )
    )
      return
    try {
      setIsDeletingQuote(true)
      await deleteQuote(quote.id)
      toast.success(LINK_DOCUMENTS_LABELS.QUOTE_DELETED)
    } catch (error) {
      logger.error('刪除報價單失敗:', error)
      toast.error(LINK_DOCUMENTS_LABELS.DELETE_QUOTE_FAILED)
    } finally {
      setIsDeletingQuote(false)
    }
  }

  const handleViewQuote = (quote: Quote) => {
    onClose()
    router.push(`/quotes/quick/${quote.id}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()} modal={true}>
      <DialogContent level={1} className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{TOURS_LABELS.LABEL_7445}</DialogTitle>
          <DialogDescription>
            {TOURS_LABELS.QUICK_QUOTE_COMPARE_PREFIX}
            {tour.name}
            {TOURS_LABELS.QUICK_QUOTE_COMPARE_SUFFIX}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-hidden">
          {/* ========== 快速報價單 ========== */}
          <div className="flex flex-col p-4 rounded-lg border border-morandi-container bg-card overflow-hidden h-full">
            <div className="flex items-center justify-between pb-2 border-b border-morandi-container/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-morandi-primary" />
                <span className="font-medium text-sm text-morandi-primary">
                  {TOURS_LABELS.QUICK_QUOTE}
                </span>
              </div>
              <button
                onClick={handleCreateQuickQuote}
                disabled={isCreatingQuickQuote}
                className="p-1 text-morandi-primary hover:bg-morandi-primary/10 rounded transition-colors disabled:opacity-50"
                title={TOURS_LABELS.ADD_1598}
              >
                {isCreatingQuickQuote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex-1 overflow-auto mt-2 space-y-1">
              {linkedQuickQuotes.length > 0 ? (
                linkedQuickQuotes.map(quote => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-morandi-primary/5 text-xs"
                  >
                    <button
                      onClick={() => handleViewQuote(quote)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-morandi-primary truncate">
                        {stripHtml(quote.name) || TOURS_LABELS.UNNAMED}
                      </div>
                      <div className="text-morandi-gold font-medium text-[10px]">
                        {quote.total_amount
                          ? `$${quote.total_amount.toLocaleString()}`
                          : TOURS_LABELS.NOT_QUOTED}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleViewQuote(quote)}
                        className="p-1 text-morandi-secondary hover:text-morandi-primary rounded"
                        title={TOURS_LABELS.LABEL_2903}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => handleDeleteQuote(e, quote)}
                        disabled={isDeletingQuote}
                        className="p-1 text-morandi-red/60 hover:text-morandi-red rounded disabled:opacity-50"
                        title={TOURS_LABELS.DELETE}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-morandi-secondary text-center py-4">
                  {TOURS_LABELS.LABEL_3885}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
