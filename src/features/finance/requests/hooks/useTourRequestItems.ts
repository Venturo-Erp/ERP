// @ts-nocheck
'use client'

/**
 * useTourRequestItems - 查詢旅遊團有供應商的需求單
 *
 * 用於請款單整合：有 supplier_id 的需求單 = 需要付款
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TOUR_REQUEST_ITEMS_LABELS } from '../../constants/labels'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/supabase/types'

type TourRequest = Database['public']['Tables']['tour_requests']['Row']

export interface TourRequestItem {
  id: string
  category: string
  title: string
  supplierName: string
  supplierId: string
  estimatedCost: number
  finalCost: number | null
  serviceDate: string | null
  serviceDateEnd: string | null
  status: string | null
  // 用於 UI
  selected: boolean
  amount: number // 用戶輸入的請款金額
}

interface UseTourRequestItemsReturn {
  items: TourRequestItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * 將需求單轉換為請款項目格式
 */
function transformToRequestItem(request: TourRequest): TourRequestItem | null {
  // 沒有供應商的不顯示
  if (!request.supplier_id) return null

  return {
    id: request.id,
    category: request.category,
    title: request.title,
    supplierName: request.supplier_name || TOUR_REQUEST_ITEMS_LABELS.UNKNOWN_SUPPLIER,
    supplierId: request.supplier_id,
    estimatedCost: request.estimated_cost || 0,
    finalCost: request.final_cost,
    serviceDate: request.service_date,
    serviceDateEnd: request.service_date_end,
    status: request.status,
    // UI 預設值
    selected: false,
    amount: request.final_cost || request.estimated_cost || 0,
  }
}

/**
 * 查詢旅遊團有供應商的需求單
 */
export function useTourRequestItems(tourId: string | null): UseTourRequestItemsReturn {
  const [items, setItems] = useState<TourRequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!tourId) {
      setItems([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('tour_requests')
        .select('*')
        .eq('tour_id', tourId)
        .not('supplier_id', 'is', null) // 有供應商才顯示
        .order('category')
        .limit(500)

      if (fetchError) {
        throw fetchError
      }

      const transformedItems = (data || [])
        .map(transformToRequestItem)
        .filter((item): item is TourRequestItem => item !== null)

      setItems(transformedItems)
    } catch (err) {
      const message = err instanceof Error ? err.message : TOUR_REQUEST_ITEMS_LABELS.LOAD_FAILED
      logger.error('載入需求單失敗:', err)
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tourId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  }
}

