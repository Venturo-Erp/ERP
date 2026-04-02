'use client'

/**
 * useSupplierRequests - 供應商收到的需求單
 *
 * 查詢發送給當前供應商 workspace 的需求單
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import type { TourRequest } from '@/data/entities/tour-requests'

export type SupplierRequest = TourRequest

export function useSupplierRequests() {
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id

  const fetcher = async (): Promise<SupplierRequest[]> => {
    if (!workspaceId) return []

    // 查詢發送給此 workspace 的需求單
    const { data, error } = await supabase
      .from('tour_requests')
      .select('id, code, tour_id, workspace_id, request_type, status, supplier_name, supplier_id, supplier_contact, supplier_response, items, note, sent_at, sent_to, sent_via, replied_at, replied_by, accepted_at, accepted_by, confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason, closed_at, closed_by, close_note, package_status, selected_tier, covered_item_ids, recipient_workspace_id, target_workspace_id, source_type, source_id, request_scope, assigned_employee_id, assigned_employee_name, line_group_id, line_group_name, hidden, created_at, created_by, updated_at, updated_by')
      .eq('recipient_workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      throw error
    }

    return (data || []) as unknown as SupplierRequest[]
  }

  const {
    data: requests = [],
    error,
    isLoading,
    mutate,
  } = useSWR(workspaceId ? ['supplier-requests', workspaceId] : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  // 計算統計
  const pendingCount = requests.filter(r => r.response_status === 'pending').length
  const respondedCount = requests.filter(r => r.response_status === 'responded').length
  const acceptedCount = requests.filter(r => r.response_status === 'accepted').length

  return {
    requests,
    isLoading,
    error,
    refetch: mutate,
    // 統計
    pendingCount,
    respondedCount,
    acceptedCount,
    totalCount: requests.length,
  }
}
