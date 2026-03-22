'use client'

/**
 * TourQuoteTab - 旅遊團報價單分頁
 *
 * 一團只有一個標準報價單：
 * - 有報價單 → 嵌入完整編輯介面
 * - 沒有 → 簡潔的建立按鈕
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import { createQuote } from '@/data'
import { DEFAULT_CATEGORIES } from '@/features/quotes/constants'
import { QuoteDetailEmbed } from '@/features/quotes/components/QuoteDetailEmbed'
import { COMP_TOURS_LABELS } from '../constants/labels'

interface TourQuoteTabProps {
  tour: Tour
}

export function TourQuoteTab({ tour }: TourQuoteTabProps) {
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // 載入該團的報價單
  useEffect(() => {
    const loadQuote = async () => {
      setLoading(true)
      try {
        // 優先用 tour.quote_id
        if (tour.quote_id) {
          setQuoteId(tour.quote_id)
          setLoading(false)
          return
        }

        // 否則用 tour_id 查詢報價單
        const { data, error } = await supabase
          .from('quotes')
          .select('id')
          .eq('tour_id', tour.id)
          .or('quote_type.is.null,quote_type.eq.standard')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        setQuoteId(data?.id || null)
      } catch (err) {
        logger.error(COMP_TOURS_LABELS.載入報價單失敗, err)
      } finally {
        setLoading(false)
      }
    }

    loadQuote()
  }, [tour.id, tour.quote_id])

  // 建立報價單
  const handleCreateQuote = async () => {
    try {
      setCreating(true)

      const quoteCode = tour.code ? `${tour.code}-Q01` : undefined

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
        setQuoteId(newQuote.id)
        toast.success(COMP_TOURS_LABELS.報價單已建立)
      }
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.建立報價單失敗_2, error)
      toast.error(COMP_TOURS_LABELS.建立報價單失敗)
    } finally {
      setCreating(false)
    }
  }

  // 沒有報價單 → 自動建立
  useEffect(() => {
    if (!loading && !quoteId && !creating) {
      handleCreateQuote()
    }
  }, [loading, quoteId])

  if (loading || !quoteId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  return <QuoteDetailEmbed quoteId={quoteId} showHeader={true} />
}
