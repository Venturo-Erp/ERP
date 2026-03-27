// src/hooks/useTodos.ts
// Phase 1: 純雲端架構的 Todos Hook (使用 SWR)
// 使用資料存取層 (DAL) 進行資料查詢

import { useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import {
  createTodo as createTodoEntity,
  updateTodo as updateTodoEntity,
  deleteTodo as deleteTodoEntity,
} from '@/data/entities/todos'
import { getAllTodos } from '@/lib/data/todos'
import { CACHE_STRATEGY } from '@/lib/swr'
import type { Todo } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'
import { logger } from '@/lib/utils/logger'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import { useAuthStore } from '@/stores/auth-store'

// Supabase Insert 類型
type TodoInsert = Database['public']['Tables']['todos']['Insert']

/**
 * 生成 SWR key（包含 workspaceId 確保不同 workspace 的資料分開快取）
 */
function getTodosKey(workspaceId: string | null): string | null {
  if (!workspaceId) return null
  return `entity:todos:list:${workspaceId}`
}

/**
 * 生成 UUID（相容不支援 crypto.randomUUID 的瀏覽器）
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    )
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 使用 @/lib/workspace-helpers 的 getCurrentWorkspaceId

// ===== 主要 Hook =====
export function useTodos() {
  // 直接從 auth store 取得 user，確保資料是最新的
  const { user } = useAuthStore()

  // 取得當前 workspace ID
  // 注意：super_admin 的 getCurrentWorkspaceId() 會返回 null（可跨 workspace）
  // 但我們仍需要一個 workspace 來查詢，使用 user.workspace_id 作為備用
  let workspaceId = getCurrentWorkspaceId()

  // 如果是 super_admin（workspaceId 為 null），使用 auth store 的 user.workspace_id
  if (!workspaceId && user?.workspace_id) {
    workspaceId = user.workspace_id
  }

  const swrKey = getTodosKey(workspaceId)

  // 使用 DAL 的 getAllTodos 作為 SWR fetcher
  // Todos 使用 REALTIME 策略（即時更新）
  const {
    data: todos = [],
    error,
    isLoading,
    isValidating,
  } = useSWR<Todo[]>(
    swrKey,
    // SWR fetcher 接收 key，我們需要從 key 中提取 workspaceId
    async () => {
      if (!workspaceId) return []
      return getAllTodos(workspaceId)
    },
    CACHE_STRATEGY.REALTIME
  )

  // Realtime 訂閱：暫時關閉
  // 目前以單人操作為主，純樂觀更新即可
  // 之後需要多人協作時再啟用（參考 docs/SWR_BEST_PRACTICES.md）

  // 新增待辦
  const create = async (todoData: Omit<Todo, 'id' | 'created_at' | 'updated_at'>) => {
    // 驗證必填欄位
    if (!todoData.creator) {
      throw new Error('新增待辦事項需要 creator 欄位')
    }

    const now = new Date().toISOString()

    // 自動注入 workspace_id（如果未提供）
    // 使用 hook 已計算好的 workspaceId，確保 Super Admin 也能正確取得
    const workspace_id = (todoData as { workspace_id?: string }).workspace_id || workspaceId

    const newTodo = {
      ...todoData,
      id: generateUUID(),
      ...(workspace_id && { workspace_id }),
      created_at: now,
      updated_at: now,
    }

    logger.log('[useTodos] 新增待辦:', {
      title: newTodo.title,
      creator: newTodo.creator,
      workspace_id,
      hook_workspaceId: workspaceId,
      user_workspace_id: user?.workspace_id,
    })

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(swrKey, (currentTodos: Todo[] | undefined) => [...(currentTodos || []), newTodo], false)

    try {
      // 確保 workspace_id 存在（Supabase 必填欄位）
      if (!workspace_id) {
        throw new Error('無法取得 workspace_id，請重新登入')
      }

      // 轉換為 Supabase Insert 類型（Json 欄位需要轉型）
      // 排除 creator 欄位（todos 表沒有此欄位，改用 created_by_legacy）
      const { creator, ...todoWithoutCreator } = newTodo
      await createTodoEntity({
        ...todoWithoutCreator,
        created_by_legacy: creator,
        related_items: newTodo.related_items,
        sub_tasks: newTodo.sub_tasks,
        notes: newTodo.notes,
      } as unknown as Parameters<typeof createTodoEntity>[0])

      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return newTodo
    } catch (err) {
      // 失敗時回滾
      // 顯示完整的 Supabase 錯誤訊息
      const errorDetails =
        err && typeof err === 'object'
          ? {
              message: (err as { message?: string }).message,
              code: (err as { code?: string }).code,
              details: (err as { details?: string }).details,
              hint: (err as { hint?: string }).hint,
            }
          : err
      logger.error('[useTodos] 新增失敗:', errorDetails)
      mutate(swrKey)
      throw err
    }
  }

  // 更新待辦
  const update = async (id: string, updates: Partial<Todo>) => {
    const updatedTodo = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    // 第三個參數 false = 不 revalidate（不重新 fetch）
    mutate(
      swrKey,
      (currentTodos: Todo[] | undefined) =>
        (currentTodos || []).map(t => (t.id === id ? { ...t, ...updatedTodo } : t)),
      false
    )

    try {
      await updateTodoEntity(id, updatedTodo as Parameters<typeof updateTodoEntity>[1])
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      mutate(swrKey)
      throw err
    }
  }

  // 刪除待辦
  const remove = async (id: string) => {
    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      swrKey,
      (currentTodos: Todo[] | undefined) => (currentTodos || []).filter(t => t.id !== id),
      false
    )

    try {
      await deleteTodoEntity(id)
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      mutate(swrKey)
      throw err
    }
  }

  // 重新載入
  const refresh = () => mutate(swrKey)

  return {
    // 資料
    todos,
    items: todos, // 相容舊 store API

    // 狀態
    isLoading,
    isValidating,
    error,

    // 操作
    create,
    update,
    delete: remove,
    fetchAll: refresh, // 相容舊 store API
  }
}

export default useTodos
