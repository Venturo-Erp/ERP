/**
 * QuoteComparisonCard - 多廠商報價比較卡片
 *
 * 顯示同一個項目的多個廠商報價，讓業務選擇得標廠商
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check, X, Star } from 'lucide-react'

interface QuoteOption {
  requestId: string
  supplierName: string
  quotedCost: number | null
  status: string
  suppliedAt?: string | null
  note?: string | null
}

interface QuoteComparisonCardProps {
  itemTitle: string
  quotes: QuoteOption[]
  onSelect: () => void
}

export function QuoteComparisonCard({ itemTitle, quotes, onSelect }: QuoteComparisonCardProps) {
  const [selecting, setSelecting] = useState(false)
  const [showReasonInput, setShowReasonInput] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  // 找出最低報價
  const validQuotes = quotes.filter(q => q.quotedCost !== null && q.quotedCost > 0)
  const lowestQuote =
    validQuotes.length > 0 ? Math.min(...validQuotes.map(q => q.quotedCost!)) : null

  const handleSelect = async (requestId: string) => {
    if (!reason.trim()) {
      toast.error('請填寫選擇原因（例如：服務較好、價格便宜）')
      return
    }

    setSelecting(true)
    const supabase = createSupabaseBrowserClient()

    try {
      // 1. 標記選中的為 selected
      await supabase
        .from('tour_requests')
        .update({
          status: 'selected',
          note: reason.trim(),
        })
        .eq('id', requestId)

      // 2. 標記其他的為 rejected
      const otherIds = quotes.filter(q => q.requestId !== requestId).map(q => q.requestId)
      if (otherIds.length > 0) {
        await supabase.from('tour_requests').update({ status: 'rejected' }).in('id', otherIds)
      }

      // 3. 覆蓋核心表的 unit_price（選中的報價）
      const selectedQuote = quotes.find(q => q.requestId === requestId)
      if (selectedQuote && selectedQuote.quotedCost) {
        // 從 tour_requests 取得 source_id（關聯 tour_itinerary_items.id）
        const { data: request } = await supabase
          .from('tour_requests')
          .select('source_id')
          .eq('id', requestId)
          .single()

        if (request?.source_id) {
          // 更新核心表 unit_price（覆蓋）
          await supabase
            .from('tour_itinerary_items')
            .update({
              unit_price: selectedQuote.quotedCost,
              quoted_cost: selectedQuote.quotedCost,
              supplier_name: selectedQuote.supplierName,
            })
            .eq('id', request.source_id)
        }
      }

      toast.success(`已選擇「${selectedQuote?.supplierName}」`)
      setShowReasonInput(null)
      setReason('')
      onSelect()
    } catch (error) {
      toast.error('選擇失敗：' + String(error))
    } finally {
      setSelecting(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setSelecting(true)
    const supabase = createSupabaseBrowserClient()

    try {
      await supabase.from('tour_requests').update({ status: 'rejected' }).eq('id', requestId)

      toast.success('已拒絕')
      onSelect()
    } catch (error) {
      toast.error('拒絕失敗：' + String(error))
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="bg-white border border-morandi-gold/30 rounded-lg p-4 space-y-3">
      <div className="font-semibold text-morandi-primary">
        {itemTitle}{' '}
        <span className="text-sm text-muted-foreground">（{quotes.length} 家報價）</span>
      </div>

      <div className="space-y-2">
        {quotes.map(quote => {
          const isLowest = quote.quotedCost === lowestQuote && lowestQuote !== null
          const isSelected = quote.status === 'selected'
          const isRejected = quote.status === 'rejected'

          return (
            <div
              key={quote.requestId}
              className={`border rounded-lg p-3 ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : isRejected
                    ? 'border-border bg-morandi-container opacity-60'
                    : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{quote.supplierName}</span>
                  {isLowest && !isRejected && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <Star size={12} />
                      最低
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check size={12} />
                      已選擇
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-xs bg-morandi-container text-morandi-secondary px-2 py-0.5 rounded">
                      已拒絕
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-morandi-primary">
                    {quote.quotedCost ? `$${quote.quotedCost.toLocaleString()}` : '未報價'}
                  </span>

                  {!isSelected && !isRejected && quote.quotedCost && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-green-600 text-green-700"
                        onClick={() => setShowReasonInput(quote.requestId)}
                        disabled={selecting}
                      >
                        選擇
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-border text-morandi-secondary"
                        onClick={() => handleReject(quote.requestId)}
                        disabled={selecting}
                      >
                        拒絕
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 選擇原因輸入框 */}
              {showReasonInput === quote.requestId && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <Input
                    placeholder="選擇原因（例如：服務較好、價格便宜）"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSelect(quote.requestId)}
                      disabled={selecting || !reason.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {selecting ? '處理中...' : '確認選擇'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowReasonInput(null)
                        setReason('')
                      }}
                      disabled={selecting}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {/* 已選擇的原因 */}
              {isSelected && quote.note && (
                <div className="mt-2 text-sm text-green-700">選擇原因：{quote.note}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
