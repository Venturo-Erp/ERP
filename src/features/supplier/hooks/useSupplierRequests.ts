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
      .select('*')
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
