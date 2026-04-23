'use client'

/**
 * useToursPaginated - Server-side pagination and filtering for tours
 *
 * Key improvements over useTours-advanced:
 * - Server-side pagination using Supabase .range()
 * - Server-side filtering using Supabase query
 * - Server-side search using .ilike()
 * - Reduces data transfer by 90%+
 */

import { useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { Tour } from '@/stores/types'
import { generateTourCode as generateTourCodeUtil } from '@/stores/utils/code-generator'
import { getCurrentWorkspaceCode } from '@/lib/workspace-helpers'
import { generateUUID } from '@/lib/utils/uuid'
import type { Database } from '@/lib/supabase/types'
import { logger } from '@/lib/utils/logger'
import { deleteTour as deleteTourEntity } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { formatDate } from '@/lib/utils/format-date'
import { TOUR_SERVICE_LABELS, TOURS_ADVANCED_LABELS } from '../constants/labels'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

export interface UseToursPaginatedParams {
  page: number
  pageSize: number
  // 'all' | 'template' | 'proposal' | 'upcoming' | 'ongoing' | 'returned' | 'closed' | 'archived'
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UseToursPaginatedResult {
  tours: Tour[]
  totalCount: number
  loading: boolean
  error: string | null
  actions: {
    create: (tourData: Omit<Tour, 'id' | 'created_at' | 'updated_at'>) => Promise<Tour>
    update: (id: string, updates: Partial<Tour>) => Promise<Tour>
    delete: (id: string) => Promise<boolean>
    refresh: () => Promise<void>
    generateCode: (cityCode: string, date: Date) => Promise<string>
  }
}

// Build SWR key from params for proper cache invalidation
function buildSwrKey(params: UseToursPaginatedParams): string {
  return `tours-paginated-${JSON.stringify(params)}`
}

export function useToursPaginated(params: UseToursPaginatedParams): UseToursPaginatedResult {
  const { page, pageSize, status, search, sortOrder = 'desc' } = params
  const defaultSort =
    status === TOUR_STATUS.PROPOSAL || status === TOUR_STATUS.TEMPLATE
      ? 'created_at'
      : 'departure_date'
  const sortBy = params.sortBy || defaultSort

  // Auth check - 只用於寫入操作，讀取不需要等待 hydration
  const user = useAuthStore(state => state.user)

  // ✅ 優化：讀取操作不等待 auth hydration，讓 SWR 立即從快取顯示資料
  // RLS 已在資料庫層保護資料，前端不需要重複驗證
  const swrKey = buildSwrKey(params)

  const {
    data,
    error,
    isLoading,
    mutate: mutateSelf,
  } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Start building query
      let query = supabase
        .from('tours')
        .select(
          'id, code, name, location, country_id, airport_code, status, departure_date, return_date, price, selling_price_per_person, max_participants, current_participants, total_revenue, total_cost, profit, archived, is_active, quote_id, itinerary_id, controller_id, workspace_id, created_at, days_count',
          { count: 'exact' }
        )
        .eq('is_deleted', false) // 過濾已刪除的團
        .range(from, to) // ✅ Server-side pagination
        .order(sortBy, { ascending: sortOrder === 'asc' })

      // ✅ Server-side status filtering（過渡期：tour_type 欄位即將 DB migration 併進 status）
      // 「upcoming / ongoing / returned」顯示層可再用 departure_date / return_date 細分
      const todayStr = new Date().toISOString().split('T')[0]

      if (status === TOUR_STATUS.PROPOSAL) {
        query = query.eq('status', TOUR_STATUS.PROPOSAL).neq('archived', true)
      } else if (status === TOUR_STATUS.TEMPLATE) {
        query = query.eq('status', TOUR_STATUS.TEMPLATE).neq('archived', true)
      } else if (status === 'archived') {
        // 封存是獨立欄位、不是 status 值
        query = query.eq('archived', true)
      } else if (status === TOUR_STATUS.UPCOMING) {
        // 待出發：正式團、回程日未過
        query = query
          .gte('return_date', todayStr)
          .neq('archived', true)
          .not('code', 'like', 'VISA%')
          .not('code', 'like', 'ESIM%')
          .in('status', [TOUR_STATUS.UPCOMING, TOUR_STATUS.ONGOING])
      } else if (status === TOUR_STATUS.CLOSED) {
        // 已結團：回程日已過
        query = query
          .lt('return_date', todayStr)
          .neq('archived', true)
          .not('code', 'like', 'VISA%')
          .not('code', 'like', 'ESIM%')
          .in('status', [TOUR_STATUS.RETURNED, TOUR_STATUS.CLOSED])
      } else {
        // 'all' 或其他 tab：排除封存、工具團、提案/模板
        query = query
          .neq('archived', true)
          .not('code', 'like', 'VISA%')
          .not('code', 'like', 'ESIM%')
          .in('status', [
            TOUR_STATUS.UPCOMING,
            TOUR_STATUS.ONGOING,
            TOUR_STATUS.RETURNED,
            TOUR_STATUS.CLOSED,
          ])
      }

      // ✅ Server-side search
      if (search && search.trim()) {
        const searchTerm = search.trim()
        query = query.or(
          `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        )
      }

      const { data: tours, count, error: queryError } = await query

      if (queryError) {
        logger.error('❌ Error fetching paginated tours:', queryError.message)
        throw new Error(queryError.message)
      }

      return {
        tours: (tours || []) as Tour[],
        count: count || 0,
      }
    },
    {
      revalidateOnFocus: false, // Don't refetch on focus (reduces unnecessary requests)
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true, // Keep showing old data while loading new page
    }
  )

  // Invalidate all paginated queries (used after mutations)
  const invalidateAllPaginatedQueries = async () => {
    // Mutate the current query
    await mutateSelf()
    // Also mutate the legacy key for backwards compatibility
    await mutate('tours')
  }

  // Realtime 訂閱：tours 表有任何變更時自動刷新列表
  useEffect(() => {
    const channel = supabase
      .channel('realtime:tours-paginated')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, () => {
        mutateSelf()
        mutate('tours')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Create tour
  const createTour = async (
    tourData: Omit<Tour, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Tour> => {
    const now = new Date().toISOString()
    const newTour = {
      ...tourData,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    } as Tour

    try {
      const { error: insertError } = await supabase
        .from('tours')
        .insert(newTour as unknown as Database['public']['Tables']['tours']['Insert'])

      if (insertError) throw insertError

      await invalidateAllPaginatedQueries()
      return newTour
    } catch (err) {
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Update tour
  const updateTour = async (id: string, updates: Partial<Tour>): Promise<Tour> => {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 樂觀更新（非封存情況）
    if (!('archived' in updates)) {
      await mutateSelf(
        prev =>
          prev
            ? {
                ...prev,
                tours: prev.tours.map(t => (t.id === id ? { ...t, ...updatedData } : t)),
              }
            : prev,
        { revalidate: false }
      )
    }

    try {
      const { data: updated, error: updateError } = await supabase
        .from('tours')
        .update(updatedData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // 封存/解封時：立即從列表移除（不等 refetch）
      if ('archived' in updates) {
        await mutateSelf(
          prev =>
            prev
              ? {
                  ...prev,
                  tours: prev.tours.filter(t => t.id !== id),
                  count: prev.count - 1,
                }
              : prev,
          { revalidate: false }
        )
      }
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return updated as Tour
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Delete tour
  const deleteTour = async (id: string): Promise<boolean> => {
    // 樂觀更新：先從列表移除
    await mutateSelf(
      prev =>
        prev
          ? {
              ...prev,
              tours: prev.tours.filter(t => t.id !== id),
              count: prev.count - 1,
            }
          : prev,
      { revalidate: false }
    )

    try {
      await deleteTourEntity(id)
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return true
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Refresh
  const refresh = async () => {
    await invalidateAllPaginatedQueries()
  }

  // Generate tour code
  const generateTourCode = async (cityCode: string, date: Date): Promise<string> => {
    const workspaceCode = getCurrentWorkspaceCode()
    if (!workspaceCode) {
      throw new Error(TOUR_SERVICE_LABELS.CANNOT_GET_WORKSPACE)
    }

    // Get existing tour codes to avoid duplicates
    const { data: existingTours } = await supabase.from('tours').select('code')

    const code = generateTourCodeUtil(
      workspaceCode,
      cityCode.toUpperCase(),
      date.toISOString(),
      existingTours || []
    )

    // Check for duplicates and try next letter
    const exists = (existingTours || []).some(t => t.code === code)
    if (exists) {
      const dateStr = formatDate(date).replace(/-/g, '').slice(2)
      const lastChar = code.slice(-1)
      const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1)
      return `${cityCode}${dateStr}${nextChar}`
    }

    return code
  }

  // Loading state - 簡化：只看 SWR 的 isLoading
  const effectiveLoading = isLoading

  return {
    tours: data?.tours || [],
    totalCount: data?.count || 0,
    loading: effectiveLoading,
    error: error?.message || null,
    actions: {
      create: createTour,
      update: updateTour,
      delete: deleteTour,
      refresh,
      generateCode: generateTourCode,
    },
  }
}

/**
 * Hook for single tour details (with skip pattern)
 * Only fetches when tourId is provided
 */
export function useTourDetailsPaginated(tourId: string | null) {
  const {
    data: tour,
    error,
    isLoading,
    mutate: mutateTour,
  } = useSWR<Tour | null>(
    tourId ? `tour-detail-${tourId}` : null, // ✅ Skip pattern: null key = no fetch
    async () => {
      if (!tourId) return null

      const { data, error: queryError } = await supabase
        .from('tours')
        .select(
          'id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, outbound_flight, return_flight, is_deleted, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, tour_leader_id, controller_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by'
        )
        .eq('id', tourId)
        .single()

      if (queryError) throw queryError
      return data as Tour
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const updateStatus = async (newStatus: NonNullable<Tour['status']>) => {
    if (!tourId) return null

    // 狀態轉換驗證
    const VALID_TOUR_TRANSITIONS: Record<string, string[]> = {
      開團: ['待出發', '取消'],
      待出發: ['已出發', '取消', '開團'],
      已出發: ['待結團'],
      待結團: ['已結團'],
      已結團: [],
      取消: ['開團'],
    }

    const { data: current, error: fetchError } = await supabase
      .from('tours')
      .select('status')
      .eq('id', tourId)
      .single()

    if (fetchError || !current) throw new Error(TOURS_ADVANCED_LABELS.CANNOT_GET_STATUS)

    const currentStatus = current.status ?? ''
    if (!currentStatus || !VALID_TOUR_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new Error(
        TOURS_ADVANCED_LABELS.INVALID_STATUS_TRANSITION(currentStatus || '', newStatus)
      )
    }

    const { data, error: updateError } = await supabase
      .from('tours')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tourId)
      .select()
      .single()

    if (updateError) throw updateError

    mutateTour(data as Tour)
    return data as Tour
  }

  return {
    tour: tour || null,
    loading: isLoading,
    error: error?.message || null,
    actions: {
      updateStatus,
      refresh: () => mutateTour(),
    },
  }
}
