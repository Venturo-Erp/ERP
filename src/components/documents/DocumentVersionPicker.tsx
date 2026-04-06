'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Calculator,
  Loader2,
  ExternalLink,
  Lock,
  Eye,
  Copy,
  FilePlus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyCell } from '@/components/table-cells'
import { useQuotes, createQuote, updateQuote, deleteQuote } from '@/data'
import { generateCode } from '@/stores/utils/code-generator'
import { DEFAULT_CATEGORIES } from '@/features/quotes/constants'
import type { Tour, Quote } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DOCUMENTS_LABELS } from './constants/labels'

// 取得報價單顯示名稱
function getQuoteDisplayName(quote: Quote): string {
  return quote.customer_name || quote.name || '未命名報價單'
}

// 判斷是否為已確認版本
function isConfirmedQuote(quote: Quote): boolean {
  return (
    quote.confirmation_status === 'customer_confirmed' ||
    quote.confirmation_status === 'staff_confirmed' ||
    quote.confirmation_status === 'closed' ||
    quote.status === 'approved'
  )
}

// 取得確認狀態文字
function getConfirmStatusText(quote: Quote): string {
  if (quote.confirmation_status === 'customer_confirmed') return '客戶已確認'
  if (quote.confirmation_status === 'staff_confirmed') return '內部已確認'
  if (quote.confirmation_status === 'closed') return '已結案'
  if (quote.status === 'approved') return '已核准'
  return ''
}

interface DocumentVersionPickerProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  /** 模式：manage=報價單管理, confirm=確認出團 */
  mode?: 'manage' | 'confirm'
  /** 確認鎖定回調（mode=confirm 時使用） */
  onConfirmLock?: () => void
  /** 當前正在編輯的報價單 ID（用於「另存」功能） */
  currentQuoteId?: string
}

export function DocumentVersionPicker({
  isOpen,
  onClose,
  tour,
  mode = 'manage',
  onConfirmLock,
  currentQuoteId,
}: DocumentVersionPickerProps) {
  const router = useRouter()
  const { items: quotes, loading } = useQuotes()
  const [isCreatingStandard, setIsCreatingStandard] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 編輯時自動聚焦
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // 已關聯此旅遊團的報價單 - 分開標準和快速
  // 過濾掉沒有實際內容的報價單（沒有金額且沒有項目）
  // 同時檢查：1) quote.tour_id === tour.id, 2) tour.quote_id === quote.id, 3) tour.locked_quote_id === quote.id
  const tourQuoteId = (tour as { quote_id?: string | null }).quote_id
  const tourLockedQuoteId = (tour as { locked_quote_id?: string | null }).locked_quote_id

  const linkedQuotes = quotes.filter(q => {
    // 檢查是否關聯到這個團（任一方向都算）
    const isLinked =
      q.tour_id === tour.id ||
      (tourQuoteId && q.id === tourQuoteId) ||
      (tourLockedQuoteId && q.id === tourLockedQuoteId)

    if (!isLinked) return false
    if ((q as { _deleted?: boolean })._deleted) return false

    // 快速報價單直接顯示（它們沒有 categories 結構）
    if (q.quote_type === 'quick') return true

    // 有金額就顯示
    if (q.total_amount && q.total_amount > 0) return true

    // 有分類項目就顯示
    const categories = q.categories as Array<{ items?: unknown[] }> | null
    if (categories && categories.some(cat => cat.items && cat.items.length > 0)) return true

    // 已確認的報價單一定要顯示
    if (q.confirmation_status || q.status === 'approved') return true

    return false
  })

  // 取得當前正在編輯的報價單
  const currentQuote = currentQuoteId ? quotes.find(q => q.id === currentQuoteId) : null

  // 另存當前報價單為新版本
  const [isSavingAs, setIsSavingAs] = useState(false)
  const handleSaveAsNew = async () => {
    if (!currentQuote) return
    try {
      setIsSavingAs(true)
      const code = generateCode('TP', {}, quotes)
      const originalName = currentQuote.customer_name || currentQuote.name || '未命名'

      const newQuote = await createQuote({
        code,
        name: currentQuote.name,
        customer_name: `${originalName} (副本)`,
        quote_type: 'standard',
        status: 'draft',
        tour_id: tour.id,
        categories: currentQuote.categories,
        group_size: currentQuote.group_size,
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        onClose()
        router.push(`/quotes/${newQuote.id}`)
      }
    } catch (error) {
      logger.error('另存報價單失敗:', error)
    } finally {
      setIsSavingAs(false)
    }
  }

  // 建立新報價單
  const handleCreateStandard = async () => {
    try {
      setIsCreatingStandard(true)

      const code = generateCode('TP', {}, quotes)

      const newQuote = await createQuote({
        code,
        name: tour.name,
        customer_name: '未命名報價單',
        quote_type: 'standard',
        status: 'draft',
        tour_id: tour.id,
        categories: DEFAULT_CATEGORIES,
        group_size: tour.max_participants || 20,
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        onClose()
        router.push(`/quotes/${newQuote.id}`)
      } else {
        logger.error('建立報價單失敗: 未取得報價單 ID', newQuote)
        alert('建立報價單失敗，請稍後再試')
      }
    } catch (error) {
      logger.error('建立報價單失敗:', error)
      const message = error instanceof Error ? error.message : '建立報價單失敗'
      alert(message)
    } finally {
      setIsCreatingStandard(false)
    }
  }

  // 點擊項目跳轉
  const handleItemClick = (quote: Quote) => {
    onClose()
    // 根據報價單類型跳轉到對應路由
    if (quote.quote_type === 'quick') {
      router.push(`/quotes/quick/${quote.id}`)
    } else {
      router.push(`/quotes/${quote.id}`)
    }
  }

  // 預覽報價單
  const handlePreview = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation()
    setPreviewQuote(quote)
  }

  // 刪除報價單
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const handleDelete = async (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation()
    const confirmed = await confirm(`確定要刪除「${getQuoteDisplayName(quote)}」嗎？`, {
      title: '刪除報價單',
      type: 'error',
    })
    if (!confirmed) return

    try {
      setDeletingId(quote.id)
      await deleteQuote(quote.id)
    } catch (error) {
      logger.error('刪除報價單失敗:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // 複製報價單（另存新檔）
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const handleCopy = async (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation()
    try {
      setCopyingId(quote.id)
      const code = generateCode('TP', {}, quotes)
      const originalName = quote.customer_name || quote.name || '未命名'

      const newQuote = await createQuote({
        code,
        name: quote.name,
        customer_name: `${originalName} (副本)`,
        quote_type: 'standard',
        status: 'draft',
        tour_id: tour.id,
        categories: quote.categories,
        group_size: quote.group_size,
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        onClose()
        router.push(`/quotes/${newQuote.id}`)
      }
    } catch (error) {
      logger.error('複製報價單失敗:', error)
    } finally {
      setCopyingId(null)
    }
  }

  // 開始 inline 改名
  const handleStartRename = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation()
    setEditingId(quote.id)
    setEditingName(quote.customer_name || quote.name || '')
  }

  // 儲存改名
  const handleSaveRename = async (quote: Quote) => {
    if (!editingName.trim()) {
      setEditingId(null)
      return
    }

    try {
      await updateQuote(quote.id, { customer_name: editingName.trim() })
    } catch (error) {
      logger.error('更新名稱失敗:', error)
    }

    setEditingId(null)
  }

  // 按 Enter 或 Escape
  const handleKeyDown = (e: React.KeyboardEvent, quote: Quote) => {
    if (e.key === 'Enter') {
      handleSaveRename(quote)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  // 渲染報價單項目
  const renderQuoteItem = (quote: Quote, index: number) => {
    const isLocked = isConfirmedQuote(quote)

    return (
      <div
        key={quote.id}
        onClick={() => handleItemClick(quote)}
        className={cn(
          'group flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer',
          'border border-border/50 hover:border-morandi-gold/50 hover:bg-morandi-gold/5',
          isLocked && 'bg-morandi-green/5 border-morandi-green/30'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 序號 */}
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-morandi-container/50 text-xs text-morandi-secondary shrink-0">
            {index + 1}
          </span>

          {/* 鎖定標記 */}
          {isLocked && (
            <div className="flex items-center gap-1 shrink-0">
              <Lock size={14} className="text-morandi-green" />
              <span className="text-xs text-morandi-green">{getConfirmStatusText(quote)}</span>
            </div>
          )}

          {/* 名稱 */}
          {editingId === quote.id ? (
            <input
              ref={inputRef}
              type="text"
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={() => handleSaveRename(quote)}
              onKeyDown={e => handleKeyDown(e, quote)}
              onClick={e => e.stopPropagation()}
              className="flex-1 text-sm bg-card border border-morandi-gold rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-morandi-gold"
            />
          ) : (
            <span className="text-sm text-morandi-primary truncate">
              {getQuoteDisplayName(quote)}
            </span>
          )}

          {/* 金額 */}
          {quote.total_amount ? (
            <span className="text-xs text-morandi-secondary shrink-0 ml-auto mr-2">
              <CurrencyCell
                amount={quote.total_amount}
                className="text-xs text-morandi-secondary"
              />
            </span>
          ) : null}
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center gap-1">
          {/* 預覽 */}
          <button
            onClick={e => handlePreview(e, quote)}
            className="p-1.5 hover:bg-morandi-container rounded-lg transition-colors"
            title={DOCUMENTS_LABELS.PREVIEW}
          >
            <Eye size={15} className="text-morandi-secondary" />
          </button>

          {/* 改名 */}
          <button
            onClick={e => handleStartRename(e, quote)}
            className="p-1.5 hover:bg-morandi-container rounded-lg transition-colors"
            title={DOCUMENTS_LABELS.LABEL_725}
          >
            <Pencil size={15} className="text-morandi-secondary" />
          </button>

          {/* 複製（另存新檔） */}
          <button
            onClick={e => handleCopy(e, quote)}
            disabled={copyingId === quote.id}
            className="p-1.5 hover:bg-morandi-container rounded-lg transition-colors"
            title={DOCUMENTS_LABELS.COPYING_2582}
          >
            {copyingId === quote.id ? (
              <Loader2 size={15} className="animate-spin text-morandi-secondary" />
            ) : (
              <Copy size={15} className="text-morandi-secondary" />
            )}
          </button>

          {/* 刪除 */}
          <button
            onClick={e => handleDelete(e, quote)}
            disabled={deletingId === quote.id || isLocked}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isLocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-morandi-red/10'
            )}
            title={isLocked ? '已確認的報價單無法刪除' : '刪除報價單'}
          >
            {deletingId === quote.id ? (
              <Loader2 size={15} className="animate-spin text-morandi-red" />
            ) : (
              <Trash2 size={15} className="text-morandi-red" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // 預覽 Dialog 內容
  const renderPreviewContent = () => {
    if (!previewQuote) return null

    const categories = previewQuote.categories as Array<{
      name: string
      total?: number
      items?: Array<{ name: string; unit_price?: number; total?: number; quantity?: number }>
    }> | null

    return (
      <div className="space-y-4">
        {/* 基本資訊 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-morandi-secondary">{DOCUMENTS_LABELS.LABEL_7626}</span>
              <span
                className={cn(
                  'ml-1 font-medium',
                  isConfirmedQuote(previewQuote) ? 'text-morandi-green' : 'text-morandi-secondary'
                )}
              >
                {isConfirmedQuote(previewQuote) ? getConfirmStatusText(previewQuote) : '草稿'}
              </span>
            </div>
            <div>
              <span className="text-morandi-secondary">{DOCUMENTS_LABELS.LABEL_8361}</span>
              <span className="text-morandi-primary ml-1">{previewQuote.group_size || '-'} 人</span>
            </div>
          </div>
          <div>
            <span className="text-morandi-secondary">{DOCUMENTS_LABELS.TOTAL_6651}</span>
            <span className="text-morandi-gold font-medium ml-1">
              {previewQuote.total_amount ? (
                <CurrencyCell amount={previewQuote.total_amount} />
              ) : (
                '-'
              )}
            </span>
          </div>
        </div>

        {/* 分割線 */}
        <div className="mx-0">
          <div className="border-t border-border" />
        </div>

        {/* 成本細項表格 */}
        {categories && categories.length > 0 ? (
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-morandi-secondary">
                  <th className="text-left py-1.5 font-medium">{DOCUMENTS_LABELS.LABEL_2257}</th>
                  <th className="text-left py-1.5 font-medium">{DOCUMENTS_LABELS.LABEL_7325}</th>
                  <th className="text-right py-1.5 font-medium">{DOCUMENTS_LABELS.AMOUNT}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {categories.flatMap(
                  (cat, catIdx) =>
                    cat.items?.map((item, itemIdx) => (
                      <tr key={`${catIdx}-${itemIdx}`}>
                        <td className="py-1.5 text-morandi-secondary">
                          {itemIdx === 0 ? cat.name : ''}
                        </td>
                        <td className="py-1.5 text-morandi-primary">
                          {item.name}
                          {(item.quantity || 1) > 1 && (
                            <span className="text-morandi-muted ml-1">x{item.quantity}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right">
                          <CurrencyCell
                            amount={item.total || (item.unit_price || 0) * (item.quantity || 1)}
                          />
                        </td>
                      </tr>
                    )) || []
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-morandi-gold/30 bg-morandi-gold/5">
                  <td colSpan={2} className="py-2 font-medium text-morandi-primary">
                    {DOCUMENTS_LABELS.TOTAL_2585}
                  </td>
                  <td className="py-2 text-right">
                    <CurrencyCell
                      amount={categories.reduce((sum, cat) => {
                        // 如果分類有 total 就用，否則計算 items
                        if (cat.total) return sum + cat.total
                        return (
                          sum +
                          (cat.items?.reduce((catSum, item) => {
                            return (
                              catSum + (item.total || (item.unit_price || 0) * (item.quantity || 1))
                            )
                          }, 0) || 0)
                        )
                      }, 0)}
                      className="font-bold text-morandi-gold"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-sm text-morandi-secondary text-center py-4">
            {DOCUMENTS_LABELS.EMPTY_6815}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* 主對話框：使用 level={2}（作為 TourDetailDialog 的子 Dialog） */}
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent
          level={2}
          className="h-[70vh] max-h-[800px] max-w-[500px] flex flex-col overflow-hidden"
        >
          {/* 標題區 */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-morandi-gold" />
              <span>{DOCUMENTS_LABELS.LABEL_4601}</span>
              <span className="text-sm text-morandi-secondary font-normal">- {tour.code}</span>
            </DialogTitle>
          </DialogHeader>

          {/* 主要內容區 */}
          <div className="flex-1 overflow-hidden">
            {/* 報價單列表 */}
            <div className="flex flex-col min-h-0 overflow-hidden border border-border rounded-lg h-full">
              <div className="flex-shrink-0 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-morandi-primary" />
                  <span className="text-sm font-medium text-morandi-primary">
                    {DOCUMENTS_LABELS.LABEL_5683}
                  </span>
                </div>
                <p className="text-xs text-morandi-secondary mt-1">{DOCUMENTS_LABELS.LABEL_1674}</p>
              </div>

              {/* 分割線留白 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-morandi-secondary" />
                  </div>
                ) : linkedQuotes.length === 0 ? (
                  <div className="text-center py-8 text-sm text-morandi-secondary">
                    {DOCUMENTS_LABELS.EMPTY_7127}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedQuotes.map((quote, index) => renderQuoteItem(quote, index))}
                  </div>
                )}
              </div>

              {/* 分割線留白 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              <div className="flex-shrink-0 p-4">
                {mode === 'confirm' ? (
                  <button
                    onClick={() => {
                      onConfirmLock?.()
                      onClose()
                    }}
                    disabled={linkedQuotes.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-morandi-green hover:bg-morandi-green/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={16} />
                    {DOCUMENTS_LABELS.CONFIRM_2046}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateStandard}
                      disabled={isCreatingStandard}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-morandi-gold hover:bg-morandi-gold-hover rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isCreatingStandard ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      新增
                    </button>
                    {currentQuote && (
                      <button
                        onClick={() => handleSaveAsNew()}
                        disabled={isSavingAs}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-morandi-gold border border-morandi-gold hover:bg-morandi-gold/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSavingAs ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FilePlus size={16} />
                        )}
                        另存
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 預覽 Dialog（第三層：TourDetailDialog → DocumentVersionPicker → Preview） */}
      <Dialog open={!!previewQuote} onOpenChange={open => !open && setPreviewQuote(null)}>
        <DialogContent level={3} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-morandi-gold" />
              {DOCUMENTS_LABELS.PREVIEW_5379}
            </DialogTitle>
          </DialogHeader>

          <div>{renderPreviewContent()}</div>

          {/* 底部按鈕 */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={() => setPreviewQuote(null)}
              className="flex-1 py-2.5 text-sm font-medium text-morandi-secondary border border-border rounded-lg hover:bg-morandi-container/50 transition-colors"
            >
              {DOCUMENTS_LABELS.CLOSE}
            </button>
            <button
              onClick={() => {
                if (previewQuote) {
                  onClose()
                  setPreviewQuote(null)
                  // 根據報價單類型跳轉到對應路由
                  if (previewQuote.quote_type === 'quick') {
                    router.push(`/quotes/quick/${previewQuote.id}`)
                  } else {
                    router.push(`/quotes/${previewQuote.id}`)
                  }
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-morandi-gold hover:bg-morandi-gold-hover rounded-lg transition-colors"
            >
              <ExternalLink size={16} />
              {DOCUMENTS_LABELS.EDIT_4265}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
