/**
 * useTourRequests - 查詢團的需求單與報價
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export interface TourRequest {
  id: string
  tour_id: string
  workspace_id: string
  request_type: string
  request_scope?: string // 'full_package' | 'individual_item'
  supplier_name: string | null
  supplier_contact: string | null
  status: string

  // 發送資訊
  sent_at: string | null
  sent_via: string | null
  sent_to: string | null

  // 報價回覆
  supplier_response: any | null
  replied_at: string | null
  replied_by: string | null

  // 成交狀態
  accepted_at: string | null
  accepted_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  selected_tier: number | null

  // LINE 資訊
  line_group_id: string | null
  line_group_name: string | null

  // 整包狀態
  package_status: string | null
  covered_item_ids: string[] | null

  // 備註
  note: string | null

  created_at: string
  updated_at: string
}

async function fetchTourRequests(tourId: string): Promise<TourRequest[]> {
  const { data, error } = await supabase
    .from('tour_requests')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as unknown as TourRequest[]
}

export function useTourRequests(tourId: string) {
  const { data, error, mutate } = useSWR(tourId ? `tour-requests-${tourId}` : null, () =>
    fetchTourRequests(tourId)
  )

  return {
    requests: data || [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}

/**
 * 篩選出待處理的報價（已回覆但未成交/拒絕）
 */
export function usePendingQuotes(tourId: string) {
  const { requests, loading, error, refresh } = useTourRequests(tourId)

  const pendingQuotes = requests.filter(
    req => req.supplier_response && !req.accepted_at && !req.rejected_at
  )

  return {
    pendingQuotes,
    loading,
    error,
    refresh,
  }
}

/**
 * 篩選出已成交的報價
 */
export function useAcceptedQuotes(tourId: string) {
  const { requests, loading, error, refresh } = useTourRequests(tourId)

  const acceptedQuotes = requests.filter(req => req.accepted_at)

  return {
    acceptedQuotes,
    loading,
    error,
    refresh,
  }
}

/**
 * 篩選出未成交的報價
 */
export function useRejectedQuotes(tourId: string) {
  const { requests, loading, error, refresh } = useTourRequests(tourId)

  const rejectedQuotes = requests.filter(req => req.rejected_at)

  return {
    rejectedQuotes,
    loading,
    error,
    refresh,
  }
}
