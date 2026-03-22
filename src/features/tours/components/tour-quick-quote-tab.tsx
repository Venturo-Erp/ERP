'use client'

/**
 * TourQuickQuoteTab - 團詳情頁快速報價單分頁
 *
 * 列出該團所有快速報價單，可新增、查看
 * 新增時直接建立空白報價單並跳到詳細頁
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { CurrencyCell } from '@/components/table-cells'
import { useAuthStore } from '@/stores'
import type { Tour } from '@/stores/types'
import type { Quote } from '@/stores/types'
import { createQuote } from '@/data'
import { COMP_TOURS_LABELS } from '../constants/labels'

interface TourQuickQuoteTabProps {
  tour: Tour
}

const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  proposed: '已提案',
  confirmed: '已確認',
  revised: '修改中',
  cancelled: '已取消',
}

const gridCols = '1fr 1fr 120px 120px 80px 100px'

export function TourQuickQuoteTab({ tour }: TourQuickQuoteTabProps) {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // 載入該團所有快速報價單
  const loadQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, customer_name, issue_date, total_amount, received_amount, status, created_at')
        .eq('tour_id', tour.id)
        .eq('quote_type', 'quick')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotes((data as Quote[]) || [])
    } catch (err) {
      logger.error('載入快速報價單失敗', err)
    } finally {
      setLoading(false)
    }
  }, [tour.id])

  useEffect(() => {
    loadQuotes()
  }, [loadQuotes])

  // 直接建立空白報價單並跳到詳細頁
  const handleAdd = useCallback(async () => {
    if (creating) return
    setCreating(true)
    try {
      const newQuote = await createQuote({
        quote_type: 'quick',
        tour_id: tour.id,
        tour_code: tour.code || '',
        customer_name: '',
        handler_name: user?.display_name || user?.chinese_name || '',
        issue_date: getTodayString(),
        total_amount: 0,
        received_amount: 0,
        status: 'draft',
        is_active: true,
        is_pinned: false,
        workspace_id: user?.workspace_id || '',
        created_by: user?.id,
        created_by_name: user?.display_name || user?.chinese_name || '',
        quick_quote_items: [],
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        router.push(`/quotes/quick/${newQuote.id}`)
      }
    } catch (err) {
      logger.error('建立快速報價單失敗', err)
    } finally {
      setCreating(false)
    }
  }, [creating, tour.id, tour.code, user, router])

  return (
    <div className="flex flex-col w-full h-full overflow-hidden border border-border rounded-xl bg-card">
      {/* 表頭 */}
      <div className="bg-gradient-to-r from-morandi-container/40 via-morandi-gold/10 to-morandi-container/40 border-b border-border/60 rounded-t-xl">
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="text-left py-2.5 px-4 text-xs relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-morandi-gold/30"></div>
            <span className="font-medium text-morandi-secondary">客戶名稱</span>
          </div>
          <div className="text-left py-2.5 px-4 text-xs relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-morandi-gold/30"></div>
            <span className="font-medium text-morandi-secondary">開單日期</span>
          </div>
          <div className="text-right py-2.5 px-4 text-xs relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-morandi-gold/30"></div>
            <span className="font-medium text-morandi-secondary">應收金額</span>
          </div>
          <div className="text-right py-2.5 px-4 text-xs relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-morandi-gold/30"></div>
            <span className="font-medium text-morandi-secondary">已收金額</span>
          </div>
          <div className="text-left py-2.5 px-4 text-xs relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-morandi-gold/30"></div>
            <span className="font-medium text-morandi-secondary">狀態</span>
          </div>
          <div className="py-1 px-4 flex items-center justify-end">
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleAdd}
              disabled={creating}
            >
              <Plus size={12} className="mr-1" />
              新增
            </Button>
          </div>
        </div>
      </div>

      {/* 表格內容 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
            <p className="text-sm">載入中...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="text-sm">尚無快速報價單</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleAdd}
              disabled={creating}
            >
              <Plus size={14} className="mr-1" />
              {COMP_TOURS_LABELS.新增快速報價}
            </Button>
          </div>
        ) : (
          quotes.map(quote => (
            <div
              key={quote.id}
              className="grid transition-colors border-b border-border/50 cursor-pointer hover:bg-morandi-container/10"
              style={{ gridTemplateColumns: gridCols }}
              onClick={() => router.push(`/quotes/quick/${quote.id}`)}
            >
              <div className="py-2 px-4">
                <span className="text-xs font-medium text-morandi-primary">
                  {quote.customer_name || '未命名'}
                </span>
              </div>
              <div className="py-2 px-4">
                <span className="text-xs text-morandi-primary">{quote.issue_date || '-'}</span>
              </div>
              <div className="py-2 px-4 text-right">
                <CurrencyCell amount={quote.total_amount || 0} />
              </div>
              <div className="py-2 px-4 text-right">
                <CurrencyCell amount={quote.received_amount || 0} variant="income" />
              </div>
              <div className="py-2 px-4">
                <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-container/50 text-morandi-secondary">
                  {STATUS_MAP[quote.status] || quote.status}
                </span>
              </div>
              <div className="py-2 px-4" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
