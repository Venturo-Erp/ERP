'use client'
/**
 * QuickQuoteDetail - 快速報價單詳細頁面
 */

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Save, Printer, Edit2, X, Download, Loader2 } from 'lucide-react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Quote, QuickQuoteItem } from '@/stores/types'
import type { Quote as PrintableQuote } from '@/types/quote.types'
import { PrintableQuickQuote } from './PrintableQuickQuote'
import { useQuickQuoteDetail } from '../hooks/useQuickQuoteDetail'
import { QuickQuoteHeader, QuickQuoteItemsTable, QuickQuoteSummary } from './quick-quote'
import { QUICK_QUOTE_DETAIL_LABELS } from '../constants/labels'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import { confirm as confirmDialog } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'

interface QuickQuoteDetailProps {
  quote: Quote
  onUpdate: (data: Partial<Quote>) => Promise<void> | Promise<Quote>
  viewModeToggle?: React.ReactNode
  /** 嵌入模式：隱藏頂部 header，按鈕移到底部 */
  embedded?: boolean
}

export const QuickQuoteDetail: React.FC<QuickQuoteDetailProps> = ({
  quote,
  onUpdate,
  viewModeToggle,
  embedded = false,
}) => {
  const router = useRouter()

  // 使用自定義 hook 管理所有狀態和邏輯
  const {
    isEditing,
    setIsEditing,
    isSaving,
    showPrintPreview,
    setShowPrintPreview,
    formData,
    setFormField,
    items,
    setItems,
    totalAmount,
    totalCost,
    totalProfit,
    balanceAmount,
    addItem,
    removeItem,
    updateItem,
    reorderItems,
    handleSave,
  } = useQuickQuoteDetail({ quote, onUpdate })

  // 核心表項目（SWR 共享 cache；tour_id 為 null 時不 fetch）
  const { items: tourItems, loading: isLoadingItems } = useTourItineraryItemsByTour(
    quote.tour_id || null
  )

  // 從行程載入項目（成本 fallback：confirmed → quoted → estimated → 0）
  const handleLoadFromTour = useCallback(() => {
    if (!quote.tour_id) {
      toast.error('此報價單沒有關聯旅遊團')
      return
    }
    if (!tourItems || tourItems.length === 0) {
      toast.info('沒有找到行程項目')
      return
    }

    const newItems: QuickQuoteItem[] = tourItems.map(item => ({
      id: nanoid(),
      description: `Day${item.day_number ?? '?'} ${item.category}: ${item.title || item.resource_name || ''}`,
      cost: item.confirmed_cost ?? item.quoted_cost ?? item.estimated_cost ?? 0,
      unit_price: 0,
      quantity: item.quantity || 1,
      amount: 0,
      notes: '',
    }))

    const existingDescriptions = new Set(items.map(i => i.description))
    const itemsToAdd = newItems.filter(i => !existingDescriptions.has(i.description))

    if (itemsToAdd.length === 0) {
      toast.info('所有項目都已存在')
    } else {
      setItems(prev => [...prev, ...itemsToAdd])
      setIsEditing(true)
      toast.success(`已載入 ${itemsToAdd.length} 個項目`)
    }
  }, [quote.tour_id, tourItems, items, setItems, setIsEditing])

  // 返回（編輯中先 confirm）
  const handleBack = useCallback(async () => {
    if (isEditing) {
      const ok = await confirmDialog('尚未儲存，確定離開？目前的編輯內容將會遺失。', {
        type: 'warning',
        confirmText: '離開',
        cancelText: '繼續編輯',
      })
      if (!ok) return
    }
    if (quote.tour_code) {
      router.push(`/tours/${quote.tour_code}?tab=quick-quote`)
    } else {
      router.push('/tours')  // 無團號時導去團列表、/quotes 已廢棄
    }
  }, [isEditing, quote.tour_code, router])

  // 列印
  const handlePrint = async () => {
    window.print()
    setShowPrintPreview(false)
  }

  // 操作按鈕（在 header 或底部使用）
  const ActionButtons = () => (
    <div className="flex items-center gap-2">
      {viewModeToggle}

      {/* 列印按鈕（任何模式都顯示） */}
      <Button onClick={() => setShowPrintPreview(true)} variant="outline" className="gap-2">
        <Printer className="h-4 w-4" />
        {QUICK_QUOTE_DETAIL_LABELS.PRINT}
      </Button>

      {/* 非編輯模式 */}
      {!isEditing && (
        <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
          <Edit2 size={16} />
          {QUICK_QUOTE_DETAIL_LABELS.EDIT}
        </Button>
      )}

      {/* 編輯模式 */}
      {isEditing && (
        <>
          {quote.tour_id && (
            <Button
              onClick={handleLoadFromTour}
              variant="outline"
              className="gap-2"
              disabled={isLoadingItems}
            >
              {isLoadingItems ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              載入行程項目
            </Button>
          )}
          <Button onClick={() => setIsEditing(false)} variant="outline" className="gap-2">
            <X size={16} />
            {QUICK_QUOTE_DETAIL_LABELS.CANCEL}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? QUICK_QUOTE_DETAIL_LABELS.儲存中 : QUICK_QUOTE_DETAIL_LABELS.儲存}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* 非嵌入模式才顯示 header */}
      {!embedded && (
        <ResponsiveHeader
          title={`快速報價單 ${quote.code || ''}`}
          showBackButton={true}
          onBack={handleBack}
          actions={<ActionButtons />}
        />
      )}

      <div
        className={cn(
          'w-full space-y-4 overflow-x-auto',
          // 嵌入模式時與主報價單對齊（只留 pb-6）；獨立頁面時保留四周 p-3
          embedded ? 'pb-6' : 'p-3'
        )}
      >
        {/* 客戶資訊（嵌入模式時按鈕整合在這裡） */}
        <QuickQuoteHeader
          formData={formData}
          isEditing={isEditing}
          onFieldChange={setFormField}
          actions={embedded ? <ActionButtons /> : undefined}
        />

        {/* 收費明細表 */}
        <QuickQuoteItemsTable
          items={items}
          isEditing={isEditing}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onReorderItems={reorderItems}
        />

        {/* 費用說明 & 金額統計 */}
        <QuickQuoteSummary
          totalCost={totalCost}
          totalAmount={totalAmount}
          totalProfit={totalProfit}
          receivedAmount={formData.received_amount}
          balanceAmount={balanceAmount}
          isEditing={isEditing}
          expenseDescription={formData.expense_description}
          onReceivedAmountChange={value => setFormField('received_amount', value)}
          onExpenseDescriptionChange={value => setFormField('expense_description', value)}
        />

        {/* 列印預覽對話框 */}
        <PrintableQuickQuote
          quote={
            {
              ...quote,
              ...formData,
            } as unknown as PrintableQuote
          }
          items={items}
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          onPrint={handlePrint}
        />
      </div>
    </>
  )
}
