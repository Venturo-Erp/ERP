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
import type { TourRequest } from '@/data/entities/tour-requests'

export interface TourRequestItem {
  id: string
  category: string
  title: string
  supplierName: string
  supplierId: string
  estimatedCost: number
  quotedCost: number | null // 供應商報價（覆蓋式管理）
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
    quotedCost: request.quoted_cost, // 供應商報價（覆蓋式管理）
    serviceDate: request.service_date,
    serviceDateEnd: request.service_date_end,
    status: request.status,
    // UI 預設值
    selected: false,
    amount: request.quoted_cost || request.estimated_cost || 0,
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
        .select('id, code, tour_id, workspace_id, request_type, status, supplier_name, supplier_id, supplier_contact, supplier_response, items, note, sent_at, sent_to, sent_via, replied_at, replied_by, accepted_at, accepted_by, confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason, closed_at, closed_by, close_note, package_status, selected_tier, covered_item_ids, recipient_workspace_id, target_workspace_id, source_type, source_id, request_scope, assigned_employee_id, assigned_employee_name, line_group_id, line_group_name, hidden, created_at, created_by, updated_at, updated_by')
        .eq('tour_id', tourId)
        .not('supplier_id', 'is', null) // 有供應商才顯示
        .order('category')
        .limit(500)

      if (fetchError) {
        throw fetchError
      }

      const transformedItems = ((data || []) as unknown as TourRequest[])
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
