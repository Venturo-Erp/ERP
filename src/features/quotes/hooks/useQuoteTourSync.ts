/**
 * Hook for syncing quotes with tour URL parameters
 * Handles auto-opening dialog when coming from tours page
 */

'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Quote } from '@/stores/types'
import { Tour } from '@/types/tour.types'

interface UseTourSyncParams {
  quotes: Quote[]
  tours: Tour[]
  isAddDialogOpen: boolean
  onOpenDialog: (tourId: string) => void
  onNavigateToQuote: (quoteId: string) => void
}

export const useQuoteTourSync = ({
  quotes,
  tours,
  isAddDialogOpen,
  onOpenDialog,
  onNavigateToQuote,
}: UseTourSyncParams) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const processedTourIdRef = useRef<string | null>(null)

  useEffect(() => {
    const tourId = searchParams.get('tour_id')

    // 只在有 tour_id 且對話框未開啟且尚未處理過時檢查
    if (tourId && !isAddDialogOpen && tours.length > 0 && processedTourIdRef.current !== tourId) {
      processedTourIdRef.current = tourId

      // 檢查該團是否已有報價單
      const existingQuote = quotes.find(q => q.tour_id === tourId)

      if (!existingQuote) {
        // 沒有報價單，開啟對話框
        const tour = tours.find(t => t.id === tourId)
        if (tour) {
          onOpenDialog(tourId)
        }
      } else {
        // 已有報價單，直接跳轉
        onNavigateToQuote(existingQuote.id)
      }
    }

    // 當 URL 沒有 tour_id 時，重置追蹤
    if (!tourId) {
      processedTourIdRef.current = null
    }
  }, [searchParams, quotes, tours, router, isAddDialogOpen, onOpenDialog, onNavigateToQuote])

  const clearTourParam = () => {
    if (searchParams.get('tour_id')) {
      router.replace('/tours')  // /quotes 已廢棄、整合進團詳情 tab
    }
  }

  return { clearTourParam }
}
