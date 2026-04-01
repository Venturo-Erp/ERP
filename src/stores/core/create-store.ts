/**
 * Zustand Store 工廠函數（簡化版）
 * 純雲端架構：直接使用 Supabase，不再使用 IndexedDB 快取
 *
 * 架構：
 * - Supabase: 雲端資料庫（唯一的 Source of Truth）
 * - Zustand: UI 狀態管理
 *
 * 注意：此 Store 已改為向後相容用途，新功能請使用 cloud-hooks
 */

import { create } from 'zustand'
import { BaseEntity } from '@/types'
import { TableName } from '@/lib/db/schemas'
import { memoryCache } from '@/lib/cache/memory-cache'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom, castRows, castRow } from '@/lib/supabase/typed-client'
import { canCrossWorkspace, type UserRole } from '@/lib/rbac-config'
import { shouldCrossWorkspace } from '@/lib/workspace-context'
import type { RealtimeChannel } from '@supabase/supabase-js'

// 型別定義
import type { StoreState, StoreConfig, CreateInput, UpdateInput } from './types'

// 工具
import { AbortManager } from '../utils/abort-manager'
import { logger } from '@/lib/utils/logger'

// Validate UUID to prevent SQL injection
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * 生成 UUID（相容不支援 crypto.randomUUID 的瀏覽器）
 */
function generateUUID(): string {
  // 優先使用原生 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: 使用 crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    )
  }
  // 最後手段：Math.random（不推薦，但能用）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 取得當前使用者的 workspace_id 和 role
 * 從 localStorage 讀取 auth-store 的值，避免循環依賴
 */
function getCurrentUserContext(): { workspaceId: string | null; userRole: UserRole | null } {
  if (typeof window === 'undefined') return { workspaceId: null, userRole: null }
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      const user = parsed?.state?.user
      const isAdmin = parsed?.state?.isAdmin
      // 新系統：使用 permissions 判斷管理員
      const userRole = isAdmin 
        ? 'admin' as UserRole
        : ('staff' as UserRole)
      return {
        workspaceId: user?.workspace_id || null,
        userRole,
      }
    }
  } catch {
    // 忽略解析錯誤
  }
  return { workspaceId: null, userRole: null }
}

/**
 * 取得當前使用者的 workspace_id（向後相容）
 * 優先從 auth store 讀取，fallback 到 localStorage
 */
function getCurrentWorkspaceId(): string | null {
  // 優先從 Zustand auth store 讀取（更可靠）
  try {
    // 動態 import 避免循環依賴
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      const workspaceId = parsed?.state?.user?.workspace_id
      if (workspaceId) return workspaceId
    }
  } catch {
    // 忽略
  }
  // Fallback 到原始方法
  return getCurrentUserContext().workspaceId
}

/**
 * 取得當前使用者的員工 ID（用於追蹤 created_by, updated_by）
 */
function getCurrentEmployeeId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.user?.id || null
    }
  } catch {
    // 忽略
  }
  return null
}

/**
 * 建立 Store 工廠函數
 *
 * @example
 * // 基本使用
 * const useTourStore = createStore({ tableName: 'tours', codePrefix: 'T' });
 *
 * // 舊版向後相容
 * const useOrderStore = createStore('orders', 'O');
 */
export function createStore<T extends BaseEntity>(
  tableNameOrConfig: TableName | StoreConfig,
  codePrefixParam?: string,
  _enableSupabaseParam = true
) {
  // 支援兩種調用方式：1. 舊版參數 2. 配置物件
  let config: StoreConfig
  if (typeof tableNameOrConfig === 'string') {
    // 舊版調用方式（向後相容）
    config = {
      tableName: tableNameOrConfig,
      codePrefix: codePrefixParam,
      enableSupabase: true,
      fastInsert: true,
    }
  } else {
    // 新版配置物件
    config = {
      ...tableNameOrConfig,
      enableSupabase: true,
      fastInsert: tableNameOrConfig.fastInsert ?? true,
    }
  }

  const { tableName, codePrefix } = config

  // 建立 AbortController 管理器
  const abortManager = new AbortManager()
  let subscription: RealtimeChannel | null = null

  // 建立 Zustand Store
  const store = create<StoreState<T>>()((set, get) => ({
    // 初始狀態
    items: [],
    loading: false,
    error: null,

    // 設定載入狀態
    setLoading: (loading: boolean) => set({ loading }),

    // 設定錯誤
    setError: (error: string | null) => set({ error }),

    // 取得所有資料（直接從 Supabase，含重試機制）
    fetchAll: async () => {
      const MAX_RETRIES = 3
      const RETRY_DELAY = 1000 // 1 秒

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // 取消前一個請求
          abortManager.abort()

          set({ loading: true, error: null })

          // 建立基礎查詢（使用 dynamicFrom 處理動態表名）
          let query = dynamicFrom(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500)

          // 🔒 Workspace 隔離：若啟用 workspaceScoped，自動過濾 workspace_id
          if (config.workspaceScoped) {
            const { workspaceId, userRole } = getCurrentUserContext()
            const isAdmin = canCrossWorkspace(userRole)
            
            

            // 只有 Super Admin 且明確開啟跨 workspace 模式才不過濾
            if (shouldCrossWorkspace(isAdmin)) {
              // 跨 workspace 模式：不加過濾
            } else if (workspaceId) {
              // 驗證 workspaceId 格式（防止 SQL injection）
              if (!isValidUUID(workspaceId)) {
                throw new Error(`Invalid workspace ID format: ${workspaceId}`)
              }
              // 一般使用者或 Super Admin 預設模式：過濾到自己的 workspace
              query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
            }
          }

          // 加上 limit 防止全表掃描
          const fetchLimit = config.fetchLimit ?? 1000
          query = query.limit(fetchLimit)

          const { data, error } = await query

          if (error) throw error
          
          

          const items = castRows<T>(data)
          set({ items, loading: false })
          return items
        } catch (error) {
          const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch'
          const isLastAttempt = attempt === MAX_RETRIES

          // 如果是網路錯誤且還有重試機會，等待後重試
          if (isNetworkError && !isLastAttempt) {
            logger.warn(
              `[${tableName}] 網路錯誤，${RETRY_DELAY}ms 後重試 (${attempt}/${MAX_RETRIES})`
            )
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
            continue
          }

          // 處理各種錯誤格式
          let errorMessage = '無法載入資料'
          if (error instanceof Error) {
            errorMessage = error.message
          } else if (error && typeof error === 'object') {
            const err = error as Record<string, unknown>
            errorMessage = (err.message as string) || (err.error as string) || JSON.stringify(error)
          }
          logger.error(`[${tableName}] fetchAll 失敗:`, errorMessage)
          set({ error: errorMessage, loading: false })
          return []
        }
      }
      return []
    },

    // 根據 ID 取得單筆
    fetchById: async (id: string) => {
      try {
        set({ loading: true, error: null })

        const { data, error } = await dynamicFrom(tableName).select('*').eq('id', id).single()

        if (error) throw error

        set({ loading: false })
        return castRow<T>(data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '讀取失敗'
        set({ error: errorMessage, loading: false })
        return null
      }
    },

    // 建立資料
    create: async (data: CreateInput<T>) => {
      try {
        set({ loading: true, error: null })

        // 生成 UUID（如果未提供）
        const id = (data as Record<string, unknown>).id || generateUUID()

        // 取得當前員工 ID（用於追蹤）
        const currentEmployeeId = getCurrentEmployeeId()

        // 生成 code（如果有 prefix）
        const insertData: Record<string, unknown> = {
          ...data,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // 自動填入 created_by（僅對有此欄位的表，且使用者未提供時）
        // 注意：不是所有表都有 created_by（如 employees），所以不強制注入
        // 如果表定義有 created_by 但使用者沒提供，Supabase 會報錯（符合預期）

        // 只有啟用 workspaceScoped 的表才自動注入 workspace_id
        if (config.workspaceScoped) {
          const workspace_id =
            (data as Record<string, unknown>).workspace_id || getCurrentWorkspaceId()
          if (workspace_id) {
            insertData.workspace_id = workspace_id
          } else {
            // RLS 需要 workspace_id，如果沒有則拋出明確錯誤
            throw new Error(`[${tableName}] 無法取得 workspace_id，請確認已登入並重新整理頁面`)
          }
        }

        // 使用樂觀鎖重試機制處理 code 生成的競態條件
        // 當 unique constraint 失敗時，重新生成 code 並重試
        const maxInsertRetries = 3
        let lastError: unknown = null

        for (let insertAttempt = 0; insertAttempt < maxInsertRetries; insertAttempt++) {
          // 每次重試都重新生成 code
          if (codePrefix && !(data as Record<string, unknown>).code) {
            // 從資料庫查詢最大 code
            const { data: maxCodeResults } = await dynamicFrom(tableName)
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

            // 加入隨機偏移量避免並發衝突（第二次重試開始）
            if (insertAttempt > 0) {
              nextNumber += insertAttempt
            }

            const candidateCode = `${codePrefix}${String(nextNumber).padStart(6, '0')}`
            ;(insertData as Record<string, unknown>).code = candidateCode
          }

          // 🔧 特殊處理：employees 表沒有 created_by 欄位，需要移除
          if (tableName === 'employees' && 'created_by' in insertData) {
            delete insertData.created_by
          }

          const { data: newItem, error } = await dynamicFrom(tableName)
            .insert(insertData as Record<string, unknown>)
            .select()
            .single()

          if (!error) {
            // 插入成功，跳出重試迴圈
            const createdItem = castRow<T>(newItem) as T
            set(state => ({
              items: [createdItem, ...state.items],
              loading: false,
            }))
            return createdItem
          }

          // 檢查是否為 unique constraint 錯誤（code 重複）
          const errorCode = (error as { code?: string })?.code
          const errorMessage = (error as { message?: string })?.message || ''
          const isUniqueViolation =
            errorCode === '23505' ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('unique constraint') ||
            errorMessage.includes('violates unique constraint')

          if (isUniqueViolation && codePrefix && insertAttempt < maxInsertRetries - 1) {
            // unique constraint 錯誤且還有重試次數，繼續重試
            logger.warn(`[${tableName}] Code 重複，重試第 ${insertAttempt + 1} 次`)
            lastError = error
            continue
          }

          // 非 unique constraint 錯誤或已用完重試次數，拋出錯誤
          throw error
        }

        // 如果所有重試都失敗，拋出最後的錯誤
        throw lastError || new Error('建立失敗：已達最大重試次數')
      } catch (error) {
        // 解析錯誤訊息
        let errorMessage = '建立失敗'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (error && typeof error === 'object') {
          const err = error as {
            message?: string
            error?: string
            details?: string
            code?: string
            hint?: string
          }
          if (err.message) {
            errorMessage = err.message
          } else if (err.details) {
            errorMessage = err.details
          } else if (err.error) {
            errorMessage = err.error
          } else if (err.code) {
            errorMessage = `資料庫錯誤 (${err.code})`
          } else if (err.hint) {
            errorMessage = err.hint
          } else if (Object.keys(error).length === 0) {
            errorMessage = '資料庫操作失敗，請檢查必填欄位或權限設定'
          } else {
            // 嘗試序列化整個錯誤物件
            try {
              errorMessage = JSON.stringify(error)
            } catch {
              errorMessage = '未知錯誤'
            }
          }
        }

        logger.error(`[${tableName}] create 失敗:`, error, 'errorMessage:', errorMessage)
        set({ error: errorMessage, loading: false })

        // 拋出帶有訊息的 Error，方便上層處理
        throw new Error(errorMessage)
      }
    },

    update: async (id: string, data: UpdateInput<T>) => {
      try {
        set({ loading: true, error: null })

        // 取得當前員工 ID（用於追蹤）
        const currentEmployeeId = getCurrentEmployeeId()

        const updateData: Record<string, unknown> = {
          ...data,
          updated_at: new Date().toISOString(),
        }

        // 自動填入 updated_by（如果資料有這個欄位）
        if (currentEmployeeId) {
          updateData.updated_by = currentEmployeeId
        }

        const { data: updatedItem, error } = await dynamicFrom(tableName)
          .update(updateData as Record<string, unknown>)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        const result = castRow<T>(updatedItem) as T
        // 樂觀更新 UI
        set(state => ({
          items: state.items.map(item => (item.id === id ? result : item)),
          loading: false,
        }))

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '更新失敗'
        set({ error: errorMessage, loading: false })
        throw error
      }
    },

    // 刪除資料
    delete: async (id: string) => {
      try {
        set({ loading: true, error: null })

        const { error } = await dynamicFrom(tableName).delete().eq('id', id)

        if (error) throw error

        // 樂觀更新 UI
        set(state => ({
          items: state.items.filter(item => item.id !== id),
          loading: false,
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '刪除失敗'
        set({ error: errorMessage, loading: false })
        throw error
      }
    },

    // 批次建立
    createMany: async (dataArray: CreateInput<T>[]) => {
      const results: T[] = []

      for (const data of dataArray) {
        const newItem = await get().create(data)
        results.push(newItem)
      }

      return results
    },

    // 批次刪除
    deleteMany: async (ids: string[]) => {
      const { error } = await dynamicFrom(tableName).delete().in('id', ids)

      if (error) throw error

      // 樂觀更新 UI
      set(state => ({
        items: state.items.filter(item => !ids.includes(item.id)),
      }))
    },

    // 根據欄位查詢
    findByField: (field: keyof T, value: unknown) => {
      return get().items.filter(item => item[field] === value)
    },

    // 自訂過濾
    filter: (predicate: (item: T) => boolean) => {
      return get().items.filter(predicate)
    },

    // 計數
    count: () => {
      return get().items.length
    },

    // 清空資料
    clear: async () => {
      set({ items: [], error: null })
      memoryCache.invalidatePattern(`${tableName}:`)
    },

    // 同步待處理資料（純雲端架構，此方法已無作用）
    syncPending: async () => {
      logger.log(`⏭️ [${tableName}] 純雲端模式，無需同步`)
    },

    // 取消進行中的請求
    cancelRequests: () => {
      abortManager.abort()
      set({ loading: false })
      logger.log(`🛑 [${tableName}] 已取消進行中的請求`)
    },

    // ============================================
    // Realtime Subscription
    // ============================================
    subscribe: () => {
      if (subscription) {
        logger.log(`[${tableName}] 已有訂閱，無需重複訂閱`)
        return
      }

      logger.log(`[${tableName}] 建立 Realtime 訂閱...`)
      subscription = supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
          logger.log(`[${tableName}] Realtime event:`, payload)
          const { eventType, new: newRecord, old: oldRecord } = payload

          const { workspaceId: currentWorkspaceId } = getCurrentUserContext()

          switch (eventType) {
            case 'INSERT': {
              const inserted = newRecord as T
              // 🔒 Workspace 隔離
              if (config.workspaceScoped && inserted.workspace_id !== currentWorkspaceId) return
              set(state => ({ items: [inserted, ...state.items] }))
              break
            }
            case 'UPDATE': {
              const updated = newRecord as T
              // 🔒 Workspace 隔離
              if (config.workspaceScoped && updated.workspace_id !== currentWorkspaceId) return
              set(state => ({
                items: state.items.map(item => (item.id === updated.id ? updated : item)),
              }))
              break
            }
            case 'DELETE': {
              const deleted = oldRecord as Partial<T>
              // 刪除操作，我們只需要 id
              if (!deleted.id) return
              set(state => ({
                items: state.items.filter(item => item.id !== deleted.id),
              }))
              break
            }
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            logger.log(`✅ [${tableName}] Realtime 訂閱成功！`)
          }
          if (status === 'CHANNEL_ERROR') {
            logger.error(`[${tableName}] Realtime 訂閱錯誤:`, err)
            set({ error: `Realtime 訂閱錯誤: ${err?.message}` })
          }
          if (status === 'TIMED_OUT') {
            logger.warn(`[${tableName}] Realtime 訂閱超時`)
            set({ error: 'Realtime 訂閱超時' })
          }
        })
    },

    unsubscribe: () => {
      if (subscription) {
        logger.log(`[${tableName}] 取消 Realtime 訂閱...`)
        supabase.removeChannel(subscription)
        subscription = null
      }
    },
  }))

  return store
}
