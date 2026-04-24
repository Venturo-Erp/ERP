/**
 * useDraftAutoSave — 表單 draft 自動存 localStorage、切頁不丟資料 (🟠 #13)
 *
 * 使用:
 * ```tsx
 * 'use client'
 * import { useDraftAutoSave } from '@/hooks/useDraftAutoSave'
 *
 * export function AddOrderForm() {
 *   const [formData, setFormData] = useState<FormData>(initialData)
 *
 *   const { hasDraft, loadDraft, clearDraft } = useDraftAutoSave('add-order', formData)
 *
 *   // 問用戶要不要恢復
 *   useEffect(() => {
 *     if (hasDraft && confirm('發現未完成的草稿、要恢復嗎？')) {
 *       const draft = loadDraft()
 *       if (draft) setFormData(draft)
 *     }
 *   }, [hasDraft])
 *
 *   const handleSubmit = async () => {
 *     await createOrder(formData)
 *     clearDraft() // 成功送出、清掉 draft
 *   }
 * }
 * ```
 *
 * 機制:
 *   - 每次 state 改動、debounce 1.5 秒存 localStorage
 *   - 用 key 前綴 'venturo_draft_' 避免撞 key
 *   - Submit 成功要手動 clearDraft、否則下次打開又跳「要恢復嗎」
 */

import { useEffect, useRef, useState, useCallback } from 'react'

const STORAGE_PREFIX = 'venturo_draft_'
const DEFAULT_DEBOUNCE_MS = 1500

interface DraftOptions {
  /** 停用 auto-save (例如 edit mode 不需要) */
  enabled?: boolean
  /** debounce 毫秒、預設 1500 */
  debounceMs?: number
  /** 最少多少次 state 變動才開始寫、避免 mount 立刻寫空白 */
  minChanges?: number
}

export interface UseDraftAutoSaveResult<T> {
  /** mount 時若 localStorage 有存檔、true */
  hasDraft: boolean
  /** 從 localStorage 讀 draft、沒有回 null */
  loadDraft: () => T | null
  /** 清掉 draft (submit 成功後 call) */
  clearDraft: () => void
  /** 手動觸發存檔、不走 debounce */
  saveDraft: () => void
}

export function useDraftAutoSave<T>(
  key: string,
  state: T,
  options: DraftOptions = {}
): UseDraftAutoSaveResult<T> {
  const { enabled = true, debounceMs = DEFAULT_DEBOUNCE_MS, minChanges = 1 } = options
  const storageKey = `${STORAGE_PREFIX}${key}`
  const [hasDraft, setHasDraft] = useState(false)
  const changesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // mount 時檢查有沒有 draft
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setHasDraft(true)
    } catch {
      // localStorage 無法讀 (某些瀏覽器隱私模式)
    }
  }, [storageKey, enabled])

  // 每次 state 改動、debounce save
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    changesRef.current += 1
    if (changesRef.current < minChanges) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(stateRef.current))
      } catch {
        // localStorage 滿了、忽略
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, storageKey, enabled, debounceMs, minChanges])

  const loadDraft = useCallback((): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return null
      return JSON.parse(saved) as T
    } catch {
      return null
    }
  }, [storageKey])

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(storageKey)
      setHasDraft(false)
    } catch {
      // ignore
    }
  }, [storageKey])

  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateRef.current))
    } catch {
      // ignore
    }
  }, [storageKey])

  return { hasDraft, loadDraft, clearDraft, saveDraft }
}
