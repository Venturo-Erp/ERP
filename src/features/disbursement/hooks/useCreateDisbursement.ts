/**
 * useCreateDisbursement Hook
 * 管理建立/編輯出納單的狀態與邏輯
 */

'use client'

import { getTodayString, formatDate } from '@/lib/utils/format-date'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { PaymentRequest, DisbursementOrder } from '@/stores/types'
import {
  useDisbursementOrders,
  updateDisbursementOrder as updateDisbursementOrderApi,
  invalidateDisbursementOrders,
  invalidatePaymentRequests,
} from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { createDisbursementSchema } from '@/lib/validations/schemas'
import { DISBURSEMENT_LABELS, DISBURSEMENT_HOOK_LABELS } from '../constants/labels'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

// 計算下一個週四
function getNextThursday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
  const nextThursday = new Date(today)
  nextThursday.setDate(today.getDate() + daysUntilThursday)
  return nextThursday
}

// 生成出納單號：DOYYMMDD-NNN（根據出帳日期，流水號從 001 開始）
async function generateDisbursementNumber(existingOrders: DisbursementOrder[], disbursementDate?: string): Promise<string> {
  const date = disbursementDate ? new Date(disbursementDate) : new Date()
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const prefix = `DO${yy}${mm}${dd}`

  // 找出同一出帳日期的既有出納單，取最大流水號 +1
  const sameDayOrders = existingOrders.filter(o => o.order_number?.startsWith(prefix))
  let nextNum = 1
  for (const order of sameDayOrders) {
    const match = order.order_number?.match(/-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= nextNum) nextNum = num + 1
    }
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`
}

interface UseCreateDisbursementProps {
  pendingRequests: PaymentRequest[]
  onSuccess: () => void
  editingOrder?: DisbursementOrder | null
}

export function useCreateDisbursement({
  pendingRequests,
  onSuccess,
  editingOrder,
}: UseCreateDisbursementProps) {
  // 使用 @/data hooks（SWR 自動載入）
  const { items: disbursement_orders } = useDisbursementOrders()
  const user = useAuthStore(state => state.user)

  const isEditMode = !!editingOrder

  // 狀態
  const [disbursementDate, setDisbursementDate] = useState(formatDate(getNextThursday()))
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 編輯模式：初始化表單值
  useEffect(() => {
    if (editingOrder) {
      setDisbursementDate(editingOrder.disbursement_date || formatDate(getNextThursday()))
      setSelectedRequestIds(editingOrder.payment_request_ids || [])
    }
  }, [editingOrder])

  // 篩選請款單
  const filteredRequests = useMemo(() => {
    return pendingRequests.filter(r => {
      // 搜尋篩選
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase()
        const matchSearch =
          r.code?.toLowerCase().includes(lowerSearch) ||
          r.tour_code?.toLowerCase().includes(lowerSearch) ||
          r.tour_name?.toLowerCase().includes(lowerSearch)
        if (!matchSearch) return false
      }

      // 日期篩選（用請款日期，不是建立日期）
      if (dateFilter) {
        const reqDate = r.request_date || r.created_at
        if (!reqDate || !reqDate.startsWith(dateFilter)) return false
      }

      // 狀態篩選
      if (statusFilter !== 'all') {
        if (r.status !== statusFilter) return false
      }

      return true
    })
  }, [pendingRequests, searchTerm, dateFilter, statusFilter])

  // 選中的總金額
  const selectedAmount = useMemo(() => {
    return pendingRequests
      .filter(r => selectedRequestIds.includes(r.id))
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  }, [pendingRequests, selectedRequestIds])

  // 切換選擇
  const toggleSelect = useCallback((requestId: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    )
  }, [])

  // 全選/取消全選
  const toggleSelectAll = useCallback(() => {
    if (selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedRequestIds([])
    } else {
      setSelectedRequestIds(filteredRequests.map(r => r.id))
    }
  }, [filteredRequests, selectedRequestIds])

  // 設為今日
  const setToday = useCallback(() => {
    setDateFilter(getTodayString())
  }, [])

  // 清除篩選
  const clearFilters = useCallback(() => {
    setSearchTerm('')
    setDateFilter('')
    setStatusFilter('all')
  }, [])

  // 建立出納單
  const handleCreate = useCallback(async () => {
    const validation = createDisbursementSchema.safeParse({
      selectedRequestIds,
      disbursementDate,
    })
    if (!validation.success) {
      void alert(validation.error.issues[0].message, 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      // 生成出納單號
      const orderNumber = await generateDisbursementNumber(disbursement_orders, disbursementDate)

      // 直接使用 Supabase 建立出納單（繞過 store 的 workspace_id 檢查）

      const { data, error } = await dynamicFrom('disbursement_orders')
        .insert({
          id: crypto.randomUUID(),
          code: orderNumber,
          order_number: orderNumber,
          disbursement_date: disbursementDate,
          payment_request_ids: selectedRequestIds,
          amount: selectedAmount,
          status: 'pending',
          workspace_id: user?.workspace_id || null,
          created_by: user?.id || null,
        })
        .select()
        .single()

      if (error) {
        logger.error(DISBURSEMENT_LABELS.Supabase_錯誤, error)
        throw new Error(error.message)
      }

      // 更新請款單狀態為 confirmed（已加入出納單，尚未出帳）
      const tour_ids_to_recalculate = new Set<string>()
      for (const id of selectedRequestIds) {
        await supabase.from('payment_requests').update({ status: 'confirmed' }).eq('id', id)
        const req = pendingRequests.find(r => r.id === id)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 重算相關團的成本
      for (const tour_id of tour_ids_to_recalculate) {
        await recalculateExpenseStats(tour_id)
      }

      // 重新載入出納單列表（SWR 快取失效）
      await invalidateDisbursementOrders()

      await alert(DISBURSEMENT_HOOK_LABELS.出納單建立成功(orderNumber), 'success')

      // 重置狀態
      resetForm()
      onSuccess()
    } catch (error) {
      logger.error(DISBURSEMENT_LABELS.建立出納單失敗, error)
      const errorMessage = error instanceof Error ? error.message : DISBURSEMENT_LABELS.未知錯誤
      await alert(DISBURSEMENT_HOOK_LABELS.建立出納單失敗(errorMessage), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedRequestIds, selectedAmount, disbursement_orders, disbursementDate, user, onSuccess])

  // 更新出納單（編輯模式）
  const handleUpdate = useCallback(async () => {
    if (!editingOrder) return

    // 編輯模式允許清空請款單（這期不出帳），只驗日期
    if (!disbursementDate) {
      void alert('請選擇出納日期', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const oldIds = new Set(editingOrder.payment_request_ids || [])
      const newIds = new Set(selectedRequestIds)

      // 找出新增和移除的請款單
      const addedIds = selectedRequestIds.filter(id => !oldIds.has(id))
      const removedIds = (editingOrder.payment_request_ids || []).filter(id => !newIds.has(id))

      // 如果出帳日期改變，重新生成出納單號
      const dateChanged = editingOrder.disbursement_date !== disbursementDate
      let updatedFields: Record<string, unknown> = {
        payment_request_ids: selectedRequestIds,
        amount: selectedAmount,
        disbursement_date: disbursementDate,
      }
      if (dateChanged) {
        const newOrderNumber = await generateDisbursementNumber(disbursement_orders, disbursementDate)
        updatedFields = { ...updatedFields, order_number: newOrderNumber, code: newOrderNumber }
      }

      // 更新出納單
      await updateDisbursementOrderApi(editingOrder.id, updatedFields)

      const tour_ids_to_recalculate = new Set<string>()

      // 新增的請款單：狀態改為 confirmed（加入出納單，尚未出帳）
      for (const id of addedIds) {
        await supabase.from('payment_requests').update({ status: 'confirmed' }).eq('id', id)
        const req = pendingRequests.find(r => r.id === id)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 移除的請款單：狀態改回 pending（從出納單移除，回到待處理）
      for (const id of removedIds) {
        await supabase.from('payment_requests').update({ status: 'pending' }).eq('id', id)
        const req = pendingRequests.find(r => r.id === id)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 重算相關團的成本（忽略錯誤，不影響主流程）
      for (const tour_id of tour_ids_to_recalculate) {
        try {
          await recalculateExpenseStats(tour_id)
        } catch (calcErr) {
          logger.warn('重算團成本失敗:', tour_id, calcErr)
        }
      }

      // SWR 快取失效
      await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])

      await alert(DISBURSEMENT_LABELS.出納單已更新(editingOrder.order_number || ''), 'success')

      resetForm()
      onSuccess()
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error)
      logger.error(DISBURSEMENT_LABELS.更新出納單失敗_2, msg, error)
      await alert(
        DISBURSEMENT_LABELS.更新出納單失敗_hook(msg || DISBURSEMENT_LABELS.未知錯誤),
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    editingOrder,
    selectedRequestIds,
    selectedAmount,
    disbursementDate,
    pendingRequests,
    onSuccess,
  ])

  // 重置表單
  const resetForm = useCallback(() => {
    setSelectedRequestIds([])
    setSearchTerm('')
    setDateFilter('')
    setStatusFilter('all')
  }, [])

  return {
    // 狀態
    isEditMode,
    disbursementDate,
    selectedRequestIds,
    searchTerm,
    dateFilter,
    statusFilter,
    isSubmitting,
    filteredRequests,
    selectedAmount,

    // 設定函數
    setDisbursementDate,
    setSearchTerm,
    setDateFilter,
    setStatusFilter,

    // 操作函數
    toggleSelect,
    toggleSelectAll,
    setToday,
    clearFilters,
    handleCreate,
    handleUpdate,
    resetForm,
  }
}
