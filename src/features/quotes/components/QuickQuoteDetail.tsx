'use client'
/**
 * QuickQuoteDetail - 快速報價單詳細頁面
 */

import React, { useState, useCallback } from 'react'
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
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/utils/logger'

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

  // 載入狀態
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // 從行程載入項目（成本從需求單回覆帶入）
  const handleLoadFromTour = useCallback(async () => {
    if (!quote.tour_id) {
      toast.error('此報價單沒有關聯旅遊團')
      return
    }

    setIsLoadingItems(true)
    try {
      // 1. 取得核心表項目
      const { data: coreItems, error: coreError } = await supabase
        .from('tour_itinerary_items')
        .select('id, day_number, category, title, resource_name, confirmed_cost, quantity')
        .eq('tour_id', quote.tour_id)
        .order('day_number', { ascending: true })
        .order('category', { ascending: true })

      if (coreError) throw coreError

      if (!coreItems || coreItems.length === 0) {
        toast.info('沒有找到行程項目')
        setIsLoadingItems(false)
        return
      }

      // 2. 轉換成 QuickQuoteItem 格式
      const newItems: QuickQuoteItem[] = coreItems.map(item => ({
        id: nanoid(),
        description: `Day${item.day_number} ${item.category}: ${item.title || item.resource_name || ''}`,
        cost: item.confirmed_cost || 0,
        unit_price: 0, // 單價由使用者自己填
        quantity: item.quantity || 1,
        amount: 0,
        notes: '',
      }))

      // 3. 合併到現有項目（避免重複）
      const existingDescriptions = new Set(items.map(i => i.description))
      const itemsToAdd = newItems.filter(i => !existingDescriptions.has(i.description))

      if (itemsToAdd.length === 0) {
        toast.info('所有項目都已存在')
      } else {
        // 合併現有項目和新項目
        setItems(prev => [...prev, ...itemsToAdd])
        setIsEditing(true)
        toast.success(`已載入 ${itemsToAdd.length} 個項目`)
      }
    } catch (error) {
      logger.error('載入失敗:', error)
      toast.error('載入行程項目失敗')
    } finally {
      setIsLoadingItems(false)
    }
  }, [quote.tour_id, items, setItems, setIsEditing])

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
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
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
          onBack={() => {
            if (quote.tour_code) {
              router.push(`/tours/${quote.tour_code}?tab=quick-quote`)
            } else {
              router.push('/quotes')
            }
          }}
          actions={<ActionButtons />}
        />
      )}

      <div className="w-full p-3 space-y-4 overflow-x-auto">
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
