'use client'

/**
 * createEntityHook - 統一資料存取 Factory
 *
 * 所有 entity 都透過這個 factory 建立，確保一致性：
 * - 統一 CRUD 操作
 * - 統一快取策略
 * - 統一 loading/error 狀態
 * - 統一 TypeScript 型別
 * - Workspace 資料隔離
 * - 樂觀更新
 */

import { useState, useEffect } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { SupabaseTableName } from '@/lib/supabase/typed-client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { get_cache, set_cache, invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import type { UserRole } from '@/lib/rbac-config'
import {
  BaseEntity,
  EntityConfig,
  EntityHook,
  ListResult,
  DetailResult,
  PaginatedParams,
  PaginatedResult,
  DictionaryResult,
  DEFAULT_CACHE_CONFIG,
  EntityCreateData,
} from './types'

// UUID v4 生成（兼容瀏覽器）
function generateUUID(): string {
  // 優先用原生 API
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: 手動生成 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================
// Workspace 隔離配置
// ============================================

// 需要 workspace 隔離的表格列表
const WORKSPACE_SCOPED_TABLES = [
  // === 核心業務 ===
  'tours',
  'orders',
  'customers',
  // === 行程與報價 ===
  'quotes',
  'itineraries',
  // === 財務管理 ===
  'payment_requests',
  'disbursement_orders',
  'receipt_orders',
  // === 會計模組 ===
  'chart_of_accounts',
  'journal_vouchers',
  'confirmations',
  // === 供應商 ===
  // 'suppliers', // ⚠️ 2026-01-17: 移除，表沒有 workspace_id
  // === 其他業務 ===
  'visas',
  'todos',
  'calendar_events',
  // === 企業客戶（B2B）===
  'companies',
  'company_contacts',
  'company_announcements',
  // === 金流串接 log ===
  'linkpay_logs',
  // === 溝通頻道 ===
  'channels',
  'messages',
  // === PNR 系統 ===
  'pnrs',
  'pnr_records',
  'pnr_fare_history',
  'pnr_fare_alerts',
  'pnr_flight_status_history',
  'flight_status_subscriptions',
  'pnr_queue_items',
  'pnr_schedule_changes',
  'pnr_ai_queries',
  // === 其他 ===
  'airport_images',
  'leader_availability',
  'request_responses',
  'request_response_items',
  // === 資料庫（景點/飯店等，需要 workspace 隔離寫入）===
  'countries',
  'ref_airports',
  'attractions',
  // === 獎金系統 ===
  'tour_bonus_settings',
  'workspace_bonus_defaults',
  // === 核心表 ===
  'tour_itinerary_items',
]

// 表格對應的 code prefix（用於自動生成編號）
const TABLE_CODE_PREFIX: Record<string, string> = {
  tours: 'T',
  itineraries: 'I',
  orders: 'O',
  customers: 'C',
  quotes: 'Q',
  payment_requests: 'PR',
  disbursement_orders: 'DO',
  receipt_orders: 'RO',
  visas: 'V',
}

/**
 * 取得當前使用者的 workspace_id 和 role
 */
function getCurrentUserContext(): {
  workspaceId: string | null
  userRole: UserRole | null
  userId: string | null
} {
  if (typeof window === 'undefined') return { workspaceId: null, userRole: null, userId: null }
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      const user = parsed?.state?.user
      // userRole 不再用於權限決策、僅供 SWR cache scoping (2026-05-01)
      return {
        workspaceId: user?.workspace_id || null,
        userRole: 'staff' as UserRole,
        userId: user?.id || null,
      }
    }
  } catch {
    // 忽略解析錯誤
  }
  return { workspaceId: null, userRole: null, userId: null }
}

// ============================================
// Entity Hook Factory
// ============================================

export function createEntityHook<T extends BaseEntity>(
  tableName: string,
  config: EntityConfig
): EntityHook<T> {
  // 快取 key 前綴
  const cacheKeyPrefix = `entity:${tableName}`
  const cacheKeyList = `${cacheKeyPrefix}:list`
  const cacheKeySlim = `${cacheKeyPrefix}:slim`

  // 判斷是否需要 workspace 隔離
  const isWorkspaceScoped = config.workspaceScoped ?? WORKSPACE_SCOPED_TABLES.includes(tableName)
  const skipAudit = config.skipAuditFields ?? false

  // 合併快取配置
  const cacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...config.cache,
  }

  // SWR 配置
  const swrConfig = {
    revalidateOnFocus: cacheConfig.revalidateOnFocus,
    revalidateOnReconnect: cacheConfig.revalidateOnReconnect,
    dedupingInterval: cacheConfig.dedupe ? cacheConfig.staleTime : 0,
  }

  // ============================================
  // Supabase Realtime — 異動時自動刷新快取
  // ============================================
  function useRealtimeSync() {
    useEffect(() => {
      const channel = supabase
        .channel(`realtime:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
          // 有人異動了這張表 → 刷新所有相關 SWR 快取
          globalMutate(
            (key: string) => typeof key === 'string' && key.startsWith(cacheKeyPrefix),
            undefined,
            { revalidate: true }
          )
          // 同步清 IndexedDB 快取
          invalidate_cache_pattern(cacheKeyPrefix)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }, [])
  }

  // ============================================
  // 認證檢查 Hook
  // ============================================
  function useAuth() {
    const user = useAuthStore(state => state.user)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const hasHydrated = useAuthStore(state => state._hasHydrated)

    return {
      isReady: hasHydrated && isAuthenticated && !!user?.id,
      hasHydrated,
      workspaceId: user?.workspace_id || null,
      // userRole 已不再用於權限決策、僅供 SWR cache scoping (2026-05-01)
      userRole: 'staff' as UserRole,
    }
  }

  /**
   * 取得 workspace 過濾條件
   */
  function getWorkspaceFilter(): string | null {
    if (!isWorkspaceScoped) return null

    const { workspaceId } = getCurrentUserContext()

    if (workspaceId) {
      // 向後相容：同時查詢符合當前 workspace 或 workspace_id 為 NULL 的舊資料
      return `workspace_id.eq.${workspaceId},workspace_id.is.null`
    }

    return null
  }

  // ============================================
  // useIdbFallback - 從 IndexedDB 載入快取作為 fallback
  // ============================================
  function useIdbFallback<D>(cache_key: string | null): D | undefined {
    const [fallback, setFallback] = useState<D | undefined>(undefined)

    useEffect(() => {
      if (!cache_key) return
      let cancelled = false
      get_cache<D>(cache_key)
        .then(entry => {
          if (!cancelled && entry) {
            setFallback(entry.data)
          }
        })
        .catch(() => {
          /* cache miss is non-critical */
        })
      return () => {
        cancelled = true
      }
    }, [cache_key])

    return fallback
  }

  // ============================================
  // useList - 列表 Hook
  // ============================================
  function useList(options?: { enabled?: boolean }): ListResult<T> {
    const { isReady, hasHydrated } = useAuth()
    useRealtimeSync()
    const enabled = options?.enabled !== false // 預設為 true
    const swrKey = isReady && enabled ? cacheKeyList : null
    const idb_fallback = useIdbFallback<T[]>(swrKey)

    const { data, error, isLoading, mutate } = useSWR<T[]>(
      swrKey,
      async () => {
        const selectFields = config.list?.select || '*'

        let query = supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields)

        // 套用 workspace 過濾
        const workspaceFilter = getWorkspaceFilter()
        if (workspaceFilter) {
          query = query.or(workspaceFilter)
        }

        if (config.list?.orderBy) {
          query = query.order(config.list.orderBy.column, {
            ascending: config.list.orderBy.ascending,
          })
        }

        if (config.list?.defaultFilter) {
          Object.entries(config.list.defaultFilter).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value)
            }
          })
        }

        const { data, error } = await query

        if (error) {
          logger.error(`[${tableName}] List fetch error:`, error.message)
          throw error
        }

        // Supabase returns Database row types; cast to app-level T (safe: T mirrors DB schema)
        return (data || []) as unknown as T[]
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T[]) => {
          set_cache(cacheKeyList, fresh_data)
        },
      }
    )

    return {
      items: data || [],
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useListSlim - 精簡列表 Hook
  // ⚠️ 返回完整類型 T，但只 fetch slim.select 指定的欄位
  // 開發者需自行確保只存取 slim 包含的欄位
  // ============================================
  function useListSlim(options?: { enabled?: boolean }): ListResult<T> {
    const { isReady, hasHydrated } = useAuth()
    useRealtimeSync()
    const enabled = options?.enabled !== false // 預設為 true
    const swrKey = isReady && enabled ? cacheKeySlim : null
    const idb_fallback = useIdbFallback<T[]>(swrKey)

    const { data, error, isLoading, mutate } = useSWR<T[]>(
      swrKey,
      async () => {
        const selectFields = config.slim?.select || 'id'

        let query = supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields)

        // 套用 workspace 過濾
        const workspaceFilter = getWorkspaceFilter()
        if (workspaceFilter) {
          query = query.or(workspaceFilter)
        }

        const { data, error } = await query

        if (error) {
          logger.error(`[${tableName}] Slim fetch error:`, error.message)
          throw error
        }

        // ⚠️ 強制轉型為 T[]，實際上只有 slim.select 的欄位有值
        return (data || []) as unknown as T[]
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T[]) => {
          set_cache(cacheKeySlim, fresh_data)
        },
      }
    )

    return {
      items: data || [],
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useDetail - 單筆 Hook（Skip Pattern）
  // ============================================
  function useDetail(id: string | null): DetailResult<T> {
    const { isReady, hasHydrated } = useAuth()
    // Skip pattern: id 為 null 時不發請求
    const swrKey = isReady && id ? `${cacheKeyPrefix}:detail:${id}` : null
    const idb_fallback = useIdbFallback<T | null>(swrKey)

    const { data, error, isLoading, mutate } = useSWR<T | null>(
      swrKey,
      async () => {
        if (!id) return null

        const selectFields = config.detail?.select || '*'

        const { data, error } = await supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields)
          .eq('id', id)
          .maybeSingle()

        if (error) {
          logger.error(`[${tableName}] Detail fetch error:`, error.message)
          throw error
        }

        // maybeSingle() 返回 null 表示記錄不存在，這不是錯誤
        if (!data) {
          return null
        }

        return data as unknown as T
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T | null) => {
          if (swrKey && fresh_data) {
            set_cache(swrKey, fresh_data)
          }
        },
      }
    )

    return {
      item: data || null,
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // usePaginated - 分頁 Hook
  // ============================================
  function usePaginated(params: PaginatedParams): PaginatedResult<T> {
    const { isReady, hasHydrated } = useAuth()
    const swrKey = isReady ? `${cacheKeyPrefix}:paginated:${JSON.stringify(params)}` : null

    const { data, error, isLoading, mutate } = useSWR(
      swrKey,
      async () => {
        const { page, pageSize, filter, search, searchFields, sortBy, sortOrder } = params
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const selectFields = config.list?.select || '*'

        let query = supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields, { count: 'exact' })
          .range(from, to)

        // 套用 workspace 過濾
        const workspaceFilter = getWorkspaceFilter()
        if (workspaceFilter) {
          query = query.or(workspaceFilter)
        }

        // 排序
        const orderColumn = sortBy || config.list?.orderBy?.column || 'created_at'
        const orderAsc =
          sortOrder === 'asc' ||
          (sortOrder === undefined && config.list?.orderBy?.ascending) ||
          false
        query = query.order(orderColumn, { ascending: orderAsc })

        // 過濾
        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && value !== 'all') {
              query = query.eq(key, value)
            }
          })
        }

        // 搜尋
        if (search && searchFields && searchFields.length > 0) {
          const searchConditions = searchFields.map(field => `${field}.ilike.%${search}%`).join(',')
          query = query.or(searchConditions)
        }

        const { data, count, error } = await query

        if (error) {
          logger.error(`[${tableName}] Paginated fetch error:`, error.message)
          throw error
        }

        return {
          items: (data || []) as unknown as T[],
          totalCount: count || 0,
        }
      },
      { ...swrConfig, keepPreviousData: true }
    )

    return {
      items: data?.items || [],
      totalCount: data?.totalCount || 0,
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useDictionary - Dictionary Hook（O(1) 查詢）
  // ⚠️ 使用 Slim 資料，只包含 slim.select 指定的欄位
  // ============================================
  function useDictionary(): DictionaryResult<T> {
    const { items, loading } = useListSlim()

    const dictionary = (items || []).reduce(
      (acc, item) => {
        if (item.id) {
          acc[item.id] = item
        }
        return acc
      },
      {} as Record<string, T>
    )

    return {
      dictionary,
      loading,
      get: (id: string) => dictionary[id],
    }
  }

  // ============================================
  // create - 建立（支援 code 自動生成 + 樂觀更新）
  // ============================================
  async function create(data: EntityCreateData<T>): Promise<T> {
    const now = new Date().toISOString()

    // 自動注入 workspace_id 和 created_by
    const dataRecord = data as Record<string, unknown>
    const { workspaceId: ctxWorkspaceId, userId: ctxUserId } = getCurrentUserContext()
    let workspace_id = dataRecord.workspace_id
    if (isWorkspaceScoped && !workspace_id) {
      workspace_id = ctxWorkspaceId
    }

    // 自動生成 code
    const codePrefix = TABLE_CODE_PREFIX[tableName]
    const needsCodeGeneration = codePrefix && !dataRecord.code

    // 使用樂觀鎖重試機制處理 code 生成的競態條件
    const maxInsertRetries = 3
    let lastError: unknown = null

    for (let insertAttempt = 0; insertAttempt < maxInsertRetries; insertAttempt++) {
      let generatedCode: string | undefined

      // 每次重試都重新查詢並生成 code
      if (needsCodeGeneration) {
        const { data: maxCodeResults } = await supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select('code')
          .like('code', `${codePrefix}%`)
          .order('code', { ascending: false })
          .limit(1)

        let nextNumber = 1
        const codeResults = maxCodeResults as Array<{ code?: string }> | null
        if (codeResults && codeResults.length > 0 && codeResults[0]?.code) {
          const numericPart = codeResults[0].code.replace(codePrefix, '')
          const currentMax = parseInt(numericPart, 10)
          if (!isNaN(currentMax)) {
            nextNumber = currentMax + 1
          }
        }

        // 加入偏移量避免並發衝突
        if (insertAttempt > 0) {
          nextNumber += insertAttempt
        }

        generatedCode = `${codePrefix}${String(nextNumber).padStart(6, '0')}`
      }

      const newItem = {
        ...data,
        id: generateUUID(),
        created_at: now,
        updated_at: now,
        ...(isWorkspaceScoped && workspace_id ? { workspace_id } : {}),
        ...(generatedCode ? { code: generatedCode } : {}),
        ...(!skipAudit && ctxUserId ? { created_by: ctxUserId, updated_by: ctxUserId } : {}),
      }

      // 樂觀更新
      globalMutate(
        cacheKeyList,
        (currentItems: T[] | undefined) => [...(currentItems || []), newItem as T],
        false
      )

      try {
        const { data: created, error } = await supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .insert(newItem as never)
          .select()
          .single()

        if (!error) {
          // 成功：樂觀更新已生效，不需要 invalidate（避免閃爍）
          return created as unknown as T
        }

        // 檢查是否為 unique constraint 錯誤
        const errorCode = (error as { code?: string })?.code
        const errorMessage = (error as { message?: string })?.message || ''
        const isUniqueViolation =
          errorCode === '23505' ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('unique constraint')

        if (isUniqueViolation && needsCodeGeneration && insertAttempt < maxInsertRetries - 1) {
          logger.warn(`[${tableName}] Code 重複，重試第 ${insertAttempt + 1} 次`)
          await invalidate()
          lastError = error
          continue
        }

        await invalidate()
        throw error
      } catch (err) {
        await invalidate()
        throw err
      }
    }

    throw lastError || new Error('建立失敗：已達最大重試次數')
  }

  // ============================================
  // update - 更新（樂觀更新）
  // ============================================
  async function update(id: string, data: Partial<T>): Promise<T> {
    const { userId: currentUserId } = getCurrentUserContext()
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
      ...(!skipAudit && currentUserId ? { updated_by: currentUserId } : {}),
    }

    // 樂觀更新
    globalMutate(
      cacheKeyList,
      (currentItems: T[] | undefined) =>
        (currentItems || []).map(item => (item.id === id ? { ...item, ...updateData } : item)),
      false
    )

    try {
      const { error } = await supabase
        .from(tableName as never /* dynamic table name requires runtime assertion */)
        .update(updateData as never)
        .eq('id', id)

      if (error) {
        logger.error(`[${tableName}] Update error:`, error.message)
        await invalidate() // 失敗時回滾樂觀更新
        throw error
      }

      // 成功：樂觀更新已生效，直接返回更新後的資料
      return { id, ...updateData } as unknown as T
    } catch (err) {
      await invalidate() // 失敗時回滾樂觀更新
      throw err
    }
  }

  // ============================================
  // delete - 刪除（樂觀更新）
  // ============================================
  async function remove(id: string): Promise<boolean> {
    // 樂觀更新
    globalMutate(
      cacheKeyList,
      (currentItems: T[] | undefined) => (currentItems || []).filter(item => item.id !== id),
      false
    )

    try {
      const { error } = await supabase
        .from(tableName as never /* dynamic table name requires runtime assertion */)
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`[${tableName}] Delete error:`, error.message)
        await invalidate()
        throw error
      }

      // 成功：樂觀更新已生效，不需要 invalidate（避免閃爍）
      return true
    } catch (err) {
      await invalidate()
      throw err
    }
  }

  // ============================================
  // batchRemove - 批量刪除
  // ============================================
  async function batchRemove(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true

    // 樂觀更新
    globalMutate(
      cacheKeyList,
      (currentItems: T[] | undefined) =>
        (currentItems || []).filter(item => !ids.includes(item.id)),
      false
    )

    try {
      const { error } = await supabase
        .from(tableName as never /* dynamic table name requires runtime assertion */)
        .delete()
        .in('id', ids)

      if (error) {
        logger.error(`[${tableName}] BatchRemove error:`, error.message)
        await invalidate()
        throw error
      }

      // 成功：樂觀更新已生效，不需要 invalidate（避免閃爍）
      return true
    } catch (err) {
      await invalidate()
      throw err
    }
  }

  // ============================================
  // invalidate - 使快取失效
  // ============================================
  async function invalidate(): Promise<void> {
    await Promise.all([
      globalMutate(
        (key: string) => typeof key === 'string' && key.startsWith(cacheKeyPrefix),
        undefined,
        { revalidate: true }
      ),
      invalidate_cache_pattern(cacheKeyPrefix),
    ])
  }

  // ============================================
  // Return
  // ============================================
  return {
    useList,
    useListSlim,
    useDetail,
    usePaginated,
    useDictionary,
    create,
    update,
    delete: remove,
    batchRemove,
    invalidate,
  }
}
