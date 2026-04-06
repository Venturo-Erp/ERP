'use client'

/**
 * TourQuoteTabV2 - 整合報價分頁
 *
 * 左邊版本選單：
 * - ⭐ 主報價單（標準報價，與行程表連動）
 * - 快速報價單列表
 *
 * 右邊內容：
 * - 主報價單：嵌入 QuoteDetailEmbed
 * - 快速報價單：跳轉到詳情頁（或嵌入）
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, FileText, Plus, Star, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { Tour } from '@/stores/types'
import type { Quote } from '@/stores/types'
import { createQuote } from '@/data'
import { DEFAULT_CATEGORIES } from '@/features/quotes/constants'
import { QuoteDetailEmbed } from '@/features/quotes/components/QuoteDetailEmbed'
import { QuickQuoteDetail } from '@/features/quotes/components/QuickQuoteDetail'

interface TourQuoteTabV2Props {
  tour: Tour
}

export function TourQuoteTabV2({ tour }: TourQuoteTabV2Props) {
  const router = useRouter()
  const user = useAuthStore(state => state.user)

  // 主報價單狀態
  const [mainQuoteId, setMainQuoteId] = useState<string | null>(null)
  const [loadingMain, setLoadingMain] = useState(true)
  const [creatingMain, setCreatingMain] = useState(false)

  // 快速報價單列表
  const [quickQuotes, setQuickQuotes] = useState<Quote[]>([])
  const [loadingQuick, setLoadingQuick] = useState(true)
  const [creatingQuick, setCreatingQuick] = useState(false)

  // 當前選中的版本
  const [selectedVersion, setSelectedVersion] = useState<'main' | string>('main')

  // ========== 載入主報價單 ==========
  useEffect(() => {
    const loadMainQuote = async () => {
      setLoadingMain(true)
      try {
        if (tour.quote_id) {
          setMainQuoteId(tour.quote_id)
          setLoadingMain(false)
          return
        }

        const { data, error } = await supabase
          .from('quotes')
          .select('id')
          .eq('tour_id', tour.id)
          .or('quote_type.is.null,quote_type.eq.standard')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        setMainQuoteId(data?.id || null)
      } catch (err) {
        logger.error('載入主報價單失敗', err)
      } finally {
        setLoadingMain(false)
      }
    }

    loadMainQuote()
  }, [tour.id, tour.quote_id])

  // ========== 載入快速報價單列表 ==========
  const loadQuickQuotes = useCallback(async () => {
    setLoadingQuick(true)
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'id, tour_id, version, status, quick_quote_items, cost_structure, total_cost, profit_margin, notes, workspace_id, created_at, created_by, updated_at'
        ) // 載入完整資料給 QuickQuoteDetail 使用
        .eq('tour_id', tour.id)
        .eq('quote_type', 'quick')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuickQuotes((data as unknown as Quote[]) || [])
    } catch (err) {
      logger.error('載入快速報價單失敗', err)
    } finally {
      setLoadingQuick(false)
    }
  }, [tour.id])

  useEffect(() => {
    loadQuickQuotes()
  }, [loadQuickQuotes])

  // ========== 建立主報價單 ==========
  const handleCreateMainQuote = async () => {
    try {
      setCreatingMain(true)

      // 查詢現有報價單最大編號，生成遞增編號
      let quoteCode: string | undefined = undefined
      if (tour.code) {
        const supabase = (await import('@/lib/supabase/client')).createSupabaseBrowserClient()
        const { data: existingQuotes } = await supabase
          .from('quotes')
          .select('code')
          .like('code', `${tour.code}-Q%`)
          .order('code', { ascending: false })
          .limit(1)

        let nextNum = 1
        if (existingQuotes && existingQuotes.length > 0 && existingQuotes[0].code) {
          // 從 KIX261223A-Q05 提取 05
          const match = existingQuotes[0].code.match(/-Q(\d+)$/)
          if (match) {
            nextNum = parseInt(match[1], 10) + 1
          }
        }
        quoteCode = `${tour.code}-Q${String(nextNum).padStart(2, '0')}`
      }

      const newQuote = await createQuote({
        name: tour.name,
        quote_type: 'standard',
        status: 'draft',
        tour_id: tour.id,
        categories: DEFAULT_CATEGORIES,
        group_size: tour.max_participants || 20,
        customer_name: tour.name,
        tour_code: tour.code || '',
        issue_date: new Date().toISOString().split('T')[0],
        ...(quoteCode ? { code: quoteCode } : {}),
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        setMainQuoteId(newQuote.id)
        toast.success('主報價單已建立')
      }
    } catch (error) {
      logger.error('建立主報價單失敗', error)
      toast.error('建立主報價單失敗')
    } finally {
      setCreatingMain(false)
    }
  }

  // 自動建立主報價單
  useEffect(() => {
    if (!loadingMain && !mainQuoteId && !creatingMain) {
      handleCreateMainQuote()
    }
  }, [loadingMain, mainQuoteId, creatingMain])

  // ========== 新增快速報價單 ==========
  const handleAddQuickQuote = async () => {
    if (creatingQuick) return
    setCreatingQuick(true)
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
        quick_quote_items: [{ id: crypto.randomUUID(), description: '', quantity: 1, cost: 0, unit_price: 0, amount: 0, notes: '' }],
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        await loadQuickQuotes()
        setSelectedVersion(newQuote.id)
        toast.success('快速報價單已建立')
      }
    } catch (err) {
      logger.error('建立快速報價單失敗', err)
      toast.error('建立快速報價單失敗')
    } finally {
      setCreatingQuick(false)
    }
  }

  // ========== 渲染 ==========
  const isLoading = loadingMain || loadingQuick

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-morandi-gold" />
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* 左邊版本選單 - 卡片樣式 */}
      <div className="w-40 shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {/* 主報價單 */}
        <button
          onClick={() => setSelectedVersion('main')}
          className={cn(
            'flex items-center gap-2 px-3 py-3 text-sm border-b border-border/30 transition-colors',
            selectedVersion === 'main'
              ? 'bg-morandi-gold/10 border-l-2 border-l-morandi-gold text-morandi-primary font-medium'
              : 'hover:bg-morandi-container/30 text-morandi-secondary'
          )}
        >
          <Star
            size={14}
            className={
              selectedVersion === 'main'
                ? 'text-morandi-gold fill-morandi-gold'
                : 'text-morandi-secondary'
            }
          />
          <span>主報價單</span>
        </button>

        {/* 快速報價列表 */}
        <div className="flex-1 overflow-y-auto">
          {quickQuotes.map((quote, index) => (
            <button
              key={quote.id}
              onClick={() => setSelectedVersion(quote.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-border/20 transition-colors',
                selectedVersion === quote.id
                  ? 'bg-morandi-gold/10 border-l-2 border-l-morandi-gold text-morandi-primary'
                  : 'hover:bg-morandi-container/30 text-morandi-secondary'
              )}
            >
              <Receipt size={12} className="shrink-0" />
              <div className="min-w-0 text-left">
                <div className="truncate text-xs">
                  {quote.customer_name || `快速報價 ${index + 1}`}
                </div>
                <div className="text-[10px] opacity-60">{quote.issue_date || ''}</div>
              </div>
            </button>
          ))}
        </div>

        {/* 新增按鈕 */}
        <button
          onClick={handleAddQuickQuote}
          disabled={creatingQuick}
          className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/30 border-t border-border/40 transition-colors"
        >
          <Plus size={12} />
          <span>新增快速報價</span>
        </button>
      </div>

      {/* 右邊內容區 */}
      <div className="flex-1 overflow-y-auto">
        {selectedVersion === 'main' ? (
          // 主報價單
          mainQuoteId ? (
            <QuoteDetailEmbed quoteId={mainQuoteId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">建立主報價單中...</p>
            </div>
          )
        ) : (
          // 快速報價單 - 直接嵌入顯示
          (() => {
            const selectedQuote = quickQuotes.find(q => q.id === selectedVersion)
            if (!selectedQuote) {
              return (
                <div className="flex flex-col items-center justify-center h-full">
                  <FileText size={48} className="text-morandi-secondary/30 mb-4" />
                  <p className="text-sm text-morandi-secondary">找不到報價單</p>
                </div>
              )
            }
            return (
              <QuickQuoteDetail
                key={selectedQuote.id} // 強制重新渲染
                quote={selectedQuote}
                embedded={true} // 嵌入模式：隱藏 header，按鈕移到底部
                onUpdate={async data => {
                  // 更新快速報價單
                  const { error } = await supabase
                    .from('quotes')
                    .update(data as never)
                    .eq('id', selectedQuote.id)
                  if (error) throw error
                  // 重新載入
                  await loadQuickQuotes()
                  return selectedQuote
                }}
              />
            )
          })()
        )}
      </div>
    </div>
  )
}
