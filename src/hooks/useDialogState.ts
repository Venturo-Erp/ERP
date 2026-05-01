'use client'

import { useState, useCallback } from 'react'

/**
 * 統一的 Dialog 狀態管理 Hook
 *
 * 解決的問題：
 * - 專案中有 15+ 種不同的 Dialog 開關狀態模式
 * - 命名不一致：isOpen, showDialog, is[Name]Open, show[Name]
 * - 缺少統一的 open/close handlers
 *
 * 使用方式：
 * ```tsx
 * // 簡單用法
 * const dialog = useDialogState()
 * <Button onClick={dialog.open}>開啟</Button>
 * <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
 *
 * // 帶資料用法
 * const dialog = useDialogState<Customer>()
 * <Button onClick={() => dialog.openWith(customer)}>編輯</Button>
 * <Dialog open={dialog.isOpen}>
 *   <CustomerForm customer={dialog.data} />
 * </Dialog>
 *
 * // 帶回調用法
 * const dialog = useDialogState<null>({
 *   onClose: () => resetForm()
 * })
 * ```
 */

interface UseDialogStateOptions<T = null> {
  /** 初始資料 */
  initialData?: T
  /** 開啟時的回調 */
  onOpen?: () => void
  /** 關閉時的回調 */
  onClose?: () => void
}

interface UseDialogStateReturn<T = null> {
  /** Dialog 是否開啟 */
  isOpen: boolean
  /** 關聯的資料 */
  data: T | null
  /** 設定 isOpen（用於 onOpenChange） */
  setIsOpen: (open: boolean) => void
  /** 設定資料 */
  setData: (data: T | null) => void
  /** 開啟 Dialog（無資料） */
  open: () => void
  /** 開啟 Dialog（帶資料） */
  openWith: (data: T) => void
  /** 關閉 Dialog */
  close: () => void
  /** 切換 Dialog */
  toggle: () => void
}

function useDialogState<T = null>(
  options?: UseDialogStateOptions<T>
): UseDialogStateReturn<T> {
  const [isOpen, setIsOpenState] = useState(false)
  const [data, setData] = useState<T | null>(options?.initialData ?? null)

  const open = useCallback(() => {
    setIsOpenState(true)
    options?.onOpen?.()
  }, [options])

  const openWith = useCallback(
    (newData: T) => {
      setData(newData)
      setIsOpenState(true)
      options?.onOpen?.()
    },
    [options]
  )

  const close = useCallback(() => {
    setIsOpenState(false)
    setData(options?.initialData ?? null)
    options?.onClose?.()
  }, [options])

  const toggle = useCallback(() => {
    setIsOpenState(prev => {
      const newValue = !prev
      if (newValue) {
        options?.onOpen?.()
      } else {
        setData(options?.initialData ?? null)
        options?.onClose?.()
      }
      return newValue
    })
  }, [options])

  // 用於 Dialog 的 onOpenChange prop
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsOpenState(true)
        options?.onOpen?.()
      } else {
        setIsOpenState(false)
        setData(options?.initialData ?? null)
        options?.onClose?.()
      }
    },
    [options]
  )

  return {
    isOpen,
    data,
    setIsOpen,
    setData,
    open,
    openWith,
    close,
    toggle,
  }
}

/**
 * 多 Dialog 狀態管理 Hook
 *
 * 用於同一頁面管理多個 Dialog 的場景
 *
 * 使用方式：
 * ```tsx
 * const dialogs = useMultiDialogState(['add', 'edit', 'delete'] as const)
 *
 * <Button onClick={dialogs.open('add')}>新增</Button>
 * <Button onClick={() => dialogs.openWith('edit', customer)}>編輯</Button>
 *
 * <AddDialog open={dialogs.isOpen('add')} onOpenChange={dialogs.setIsOpen('add')} />
 * <EditDialog open={dialogs.isOpen('edit')} data={dialogs.getData('edit')} />
 * ```
 */
function useMultiDialogState<K extends string, T = unknown>(keys: readonly K[]) {
  const [states, setStates] = useState<Record<K, { isOpen: boolean; data: T | null }>>(() => {
    const initial = {} as Record<K, { isOpen: boolean; data: T | null }>
    keys.forEach(key => {
      initial[key] = { isOpen: false, data: null }
    })
    return initial
  })

  const isOpen = useCallback((key: K) => states[key]?.isOpen ?? false, [states])
  const getData = useCallback((key: K) => states[key]?.data ?? null, [states])

  const open = useCallback(
    (key: K) => () => {
      setStates(prev => ({
        ...prev,
        [key]: { ...prev[key], isOpen: true },
      }))
    },
    []
  )

  const openWith = useCallback((key: K, data: T) => {
    setStates(prev => ({
      ...prev,
      [key]: { isOpen: true, data },
    }))
  }, [])

  const close = useCallback((key: K) => {
    setStates(prev => ({
      ...prev,
      [key]: { isOpen: false, data: null },
    }))
  }, [])

  const setIsOpen = useCallback(
    (key: K) => (open: boolean) => {
      setStates(prev => ({
        ...prev,
        [key]: { isOpen: open, data: open ? prev[key]?.data : null },
      }))
    },
    []
  )

  return {
    isOpen,
    getData,
    open,
    openWith,
    close,
    setIsOpen,
  }
}
