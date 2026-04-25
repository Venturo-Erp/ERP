'use client'

/**
 * Todos Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Todo } from '@/stores/types'

export const todoEntity = createEntityHook<Todo>('todos', {
  list: {
    select:
      'id,title,priority,deadline,status,completed,assignee,visibility,related_items,sub_tasks,notes,enabled_quick_actions,needs_creator_notification,created_at,updated_at,workspace_id,created_by,updated_by,is_public,task_type,tour_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,title,status,priority,deadline,assignee',
  },
  detail: { select: '*' },
  cache: {
    ...CACHE_PRESETS.high,
    revalidateOnFocus: true, // 待辦事項需要即時更新
  },
})

export const useTodos = todoEntity.useList
export const useTodosSlim = todoEntity.useListSlim
export const useTodo = todoEntity.useDetail
export const useTodosPaginated = todoEntity.usePaginated
export const useTodoDictionary = todoEntity.useDictionary

export const createTodo = todoEntity.create
export const updateTodo = todoEntity.update
export const deleteTodo = todoEntity.delete
export const invalidateTodos = todoEntity.invalidate
