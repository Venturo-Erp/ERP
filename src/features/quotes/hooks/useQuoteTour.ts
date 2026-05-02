'use client'

import { formatDate } from '@/lib/utils/format-date'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { generateTourCode } from '@/stores/utils/code-generator'
import { getCurrentWorkspaceCode, getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import { useToursSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import type { ParticipantCounts, SellingPrices, CostCategory } from '../types'
import type { Quote, Tour } from '@/stores/types'
import type { CreateInput } from '@/stores/core/types'
import { QUOTE_HOOKS_LABELS } from '../constants/labels'

interface UseQuoteTourProps {
  quote: Quote | null | undefined
  updateQuote: (id: string, data: Partial<Quote>) => void
  addTour: (data: CreateInput<Tour>) => Promise<Tour | undefined>
  router: ReturnType<typeof useRouter>
  updatedCategories: CostCategory[]
  total_cost: number
  groupSize: number
  quoteName: string
  accommodationDays: number
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
}

export const useQuoteTour = ({
  quote,
  updateQuote,
  addTour,
  router,
  updatedCategories,
  total_cost,
  groupSize,
  quoteName,
  accommodationDays,
  participantCounts,
  sellingPrices,
}: UseQuoteTourProps) => {
  // 使用 @/data hooks（SWR 自動載入）
  const { items: existingTours } = useToursSlim()

  // 開旅遊團
  const handleCreateTour = useCallback(async () => {
    if (!quote) return

    // 更新報價單狀態為已核准
    updateQuote(quote.id, {
      status: 'approved',
    })

    // 創建旅遊團
    const departure_date = new Date()
    departure_date.setDate(departure_date.getDate() + 30) // 預設30天後出發
    const return_date = new Date(departure_date)
    return_date.setDate(return_date.getDate() + 5) // 預設5天行程

    // 使用報價單名稱作為地點（用戶可以在旅遊團頁面再修改）
    const location = quoteName || '待定'

    // 生成團號（使用預設地區代碼 'XX'）
    const workspaceCode = getCurrentWorkspaceCode()
    if (!workspaceCode) {
      throw new Error('無法取得 workspace code，請重新登入')
    }

    // 使用 SWR 快取的 tours 來避免編號衝突
    const tourCode = generateTourCode(
      workspaceCode,
      'XX', // 預設地區代碼，用戶可以後續修改
      departure_date.toISOString(),
      existingTours
    )

    const newTour = await addTour({
      name: quoteName,
      location: location,
      departure_date: formatDate(departure_date),
      return_date: formatDate(return_date),
      price: Math.round(total_cost / groupSize), // 每人單價
      status: 'draft',
      code: tourCode,
      contract_status: 'pending',
      total_revenue: 0,
      total_cost: total_cost,
      profit: 0,
    })

    // 更新報價單的 tour_id（葡萄串模型：quote 自己貼標籤、不需要 tour 反指）
    if (newTour?.id) {
      await updateQuote(quote.id, { tour_id: newTour.id })

      // 內部聊天頻道已於 2026-05-02 整套刪除（William 拍板）、報價轉團不再自動建頻道
    }

    // 跳轉到旅遊團管理頁面，並高亮新建的團
    router.push(`/tours?highlight=${newTour?.id}`)
  }, [
    quote,
    updatedCategories,
    total_cost,
    groupSize,
    accommodationDays,
    participantCounts,
    sellingPrices,
    updateQuote,
    quoteName,
    addTour,
    router,
    existingTours,
  ])

  return {
    handleCreateTour,
  }
}
