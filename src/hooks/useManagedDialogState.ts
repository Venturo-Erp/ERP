/**
 * useManagedDialogState Hook
 *
 * 統一管理 Dialog 的開啟/關閉狀態，包含：
 * - 開啟/關閉控制
 * - 關閉前確認邏輯（如有未保存的修改）
 * - 自動重置數據
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const dialog = useManagedDialogState<Customer>({
 *     onConfirmClose: async () => {
 *       // 如果有未保存的變更，返回 false 阻止關閉
 *       if (isDirty) {
 *         return await confirm('有未保存的變更，確定要關閉嗎？')
 *       }
 *       return true
 *     },
 *     resetOnClose: true,
 *   })
 *
 *   return (
 *     <>
 *       <Button onClick={() => dialog.open({ id: '123', name: 'Test' })}>
 *         編輯客戶
 *       </Button>
 *       <CustomerDialog
 *         open={dialog.isOpen}
 *         data={dialog.data}
 *         onClose={dialog.close}
 *         onDataChange={dialog.setData}
 *       />
 *     </>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useCallback, useRef } from 'react'

interface UseManagedDialogStateOptions<T> {
  /**
   * Dialog 關閉時的回調
   */
  onClose?: () => void

  /**
   * 關閉前確認回調
   * 返回 true 允許關閉，返回 false 阻止關閉
   * 可用於檢查是否有未保存的變更
   */
  onConfirmClose?: () => boolean | Promise<boolean>

  /**
   * 關閉時是否重置數據
   * 預設為 true
   */
  resetOnClose?: boolean

  /**
   * 初始數據
   */
  initialData?: T | null
}

interface UseManagedDialogStateReturn<T> {
  /**
   * Dialog 是否開啟
   */
  isOpen: boolean

  /**
   * Dialog 數據
   */
  data: T | null

  /**
   * 開啟 Dialog
   * @param data 可選的初始數據
   */
  open: (data?: T | null) => void

  /**
   * 關閉 Dialog（會執行確認邏輯）
   */
  close: () => Promise<void>

  /**
   * 強制關閉 Dialog（跳過確認邏輯）
   */
  forceClose: () => void

  /**
   * 設置 Dialog 數據
   */
  setData: (data: T | null | ((prev: T | null) => T | null)) => void

  /**
   * 更新部分數據（合併）
   */
  updateData: (partial: Partial<T>) => void

  /**
   * 重置數據到初始狀態
   */
  resetData: () => void

  /**
   * 是否正在關閉中（等待確認）
   */
  isClosing: boolean
}

/**
 * Dialog 狀態管理 Hook（帶生命週期管理）
 */
function useManagedDialogState<T = unknown>(
  options: UseManagedDialogStateOptions<T> = {}
): UseManagedDialogStateReturn<T> {
  const { onClose, onConfirmClose, resetOnClose = true, initialData = null } = options

  const [isOpen, setIsOpen] = useState(false)
  const [data, setDataState] = useState<T | null>(initialData)
  const [isClosing, setIsClosing] = useState(false)

  // 使用 ref 存儲初始數據，避免 stale closure
  const initialDataRef = useRef<T | null>(initialData)
  initialDataRef.current = initialData

  const open = useCallback((newData?: T | null) => {
    if (newData !== undefined) {
      setDataState(newData)
    }
    setIsOpen(true)
    setIsClosing(false)
  }, [])

  const forceClose = useCallback(() => {
    setIsOpen(false)
    setIsClosing(false)
    if (resetOnClose) {
      setDataState(initialDataRef.current)
    }
    onClose?.()
  }, [resetOnClose, onClose])

  const close = useCallback(async () => {
    // 如果有確認邏輯，先執行確認
    if (onConfirmClose) {
      setIsClosing(true)
      try {
        const canClose = await onConfirmClose()
        if (!canClose) {
          setIsClosing(false)
          return
        }
      } catch {
        setIsClosing(false)
        return
      }
    }

    forceClose()
  }, [onConfirmClose, forceClose])

  const setData = useCallback((newData: T | null | ((prev: T | null) => T | null)) => {
    if (typeof newData === 'function') {
      setDataState(newData as (prev: T | null) => T | null)
    } else {
      setDataState(newData)
    }
  }, [])

  const updateData = useCallback((partial: Partial<T>) => {
    setDataState(prev => {
      if (prev === null) {
        return partial as T
      }
      return { ...prev, ...partial }
    })
  }, [])

  const resetData = useCallback(() => {
    setDataState(initialDataRef.current)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    forceClose,
    setData,
    updateData,
    resetData,
    isClosing,
  }
}

/**
 * 簡化版：單純的開關狀態
 * 適用於不需要數據的簡單 Dialog
 */
function useSimpleDialogState(options?: {
  onClose?: () => void
  onConfirmClose?: () => boolean | Promise<boolean>
}) {
  return useManagedDialogState<undefined>({
    ...options,
    resetOnClose: false,
  })
}
