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

// 生成出納單號 — 透過 DB RPC、advisory lock 防 race
// 原本 client side SELECT max + 1 已撞過 2 次 (DO260423-001/002 各 2 筆)
async function generateDisbursementNumber(
  workspaceId: string,
  disbursementDate?: string
): Promise<string> {
  const dateParam = disbursementDate || new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.rpc('generate_disbursement_no', {
    p_workspace_id: workspaceId,
    p_disbursement_date: dateParam,
  })
  if (error || !data) throw error ?? new Error('generate_disbursement_no returned null')
  return data as string
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

  // 編輯模式：初始化表單值（從 FK 反查綁定的請款單 IDs）
  useEffect(() => {
    if (editingOrder) {
      setDisbursementDate(editingOrder.disbursement_date || formatDate(getNextThursday()))
      ;(async () => {
        const { data, error } = await supabase
          .from('payment_requests')
          .select('id')
          .eq('disbursement_order_id', editingOrder.id)
        if (error) {
          logger.error('讀取出納單綁定請款失敗:', error)
          setSelectedRequestIds([])
          return
        }
        setSelectedRequestIds((data || []).map(r => r.id))
      })()
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

  // 選中的總金額（扣掉成本轉移：transferred_pair_id 的 requests 淨流量 = 0、不算實際出帳）
  //
  // 對沖模式（新）：每對成本轉移有兩張 request（R_src amount<0、R_dst amount>0）、
  //   - 兩張都選：sum(r.amount) 自動抵銷（-X + +X = 0）、不用特別處理
  //   - 只選一張：要扣掉那張的 amount、讓「本期統計」反映真實銀行流量
  //   統一邏輯：不管選幾張、把 pair_id 的 request.amount 從總和扣掉（正負都扣）
  const selectedAmount = useMemo(() => {
    return pendingRequests
      .filter(r => selectedRequestIds.includes(r.id))
      .reduce((sum, r) => {
        const pairId = (r as unknown as Record<string, unknown>).transferred_pair_id
        if (pairId) return sum // 成本轉移 request、不算進出帳金額
        return sum + (r.amount || 0)
      }, 0)
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
      // 推斷出納單分類：依所選 PR 的特性決定 disbursement_type
      // 優先順序：成本轉移 > 薪資 > 公司請款 > 團體請款（fallback）
      const selectedPRs = pendingRequests.filter(pr => selectedRequestIds.includes(pr.id))
      let disbursementType: 'payment_request' | 'payroll' | 'cost_transfer' | 'company_expense' =
        'payment_request'
      // transferred_pair_id 不在 PaymentRequest type 上、用 DB 查
      const { data: pairCheck } = await supabase
        .from('payment_requests')
        .select('id')
        .in('id', selectedRequestIds)
        .not('transferred_pair_id', 'is', null)
        .limit(1)
      const hasCostTransfer = (pairCheck?.length ?? 0) > 0
      if (hasCostTransfer) {
        disbursementType = 'cost_transfer'
      } else if (selectedPRs.length > 0 && selectedPRs.every(pr => pr.expense_type === 'SAL')) {
        disbursementType = 'payroll'
      } else if (selectedPRs.length > 0 && selectedPRs.every(pr => !pr.tour_id)) {
        disbursementType = 'company_expense'
      }

      // 根治 race condition：client 生號 + insert 兩步中間、別人可能插隊
      // 做法：遇 23505 重複鍵就重新生號重試、最多 5 次
      // 正常情況第 1 次就成功、有並發才會重試、重試成本低
      const MAX_RETRIES = 5
      let data: { id: string; code?: string } | null = null
      let orderNumber = ''
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (!user?.workspace_id) throw new Error('找不到 workspace_id、無法生成出納單號')
        orderNumber = await generateDisbursementNumber(user.workspace_id, disbursementDate)

        const { data: inserted, error } = await dynamicFrom('disbursement_orders')
          .insert({
            id: crypto.randomUUID(),
            code: orderNumber,
            order_number: orderNumber,
            disbursement_date: disbursementDate,
            amount: selectedAmount,
            status: 'pending',
            disbursement_type: disbursementType,
            workspace_id: user?.workspace_id || null,
            created_by: user?.id || null,
          })
          .select()
          .single()

        if (!error) {
          data = inserted as { id: string; code?: string }
          break
        }

        // 撞號 → 重新生號重試
        if (error.code === '23505' && attempt < MAX_RETRIES - 1) {
          logger.warn(
            `[出納單] 編號 ${orderNumber} 撞號、重試 ${attempt + 1}/${MAX_RETRIES}`,
            error.message
          )
          continue
        }

        // 其他錯 or 撞號耗盡重試
        logger.error(
          DISBURSEMENT_LABELS.Supabase_錯誤,
          JSON.stringify(error),
          error.message,
          error.code
        )
        if (error.code === '23505') {
          throw new Error(`出納單號 ${orderNumber} 連續 ${MAX_RETRIES} 次撞號、請稍後再試`)
        }
        throw new Error(error.message || '建立出納單失敗')
      }

      if (!data) throw new Error('建立出納單失敗（未預期）')

      // 把選中的請款單綁到此出納單（FK 標籤式）+ 改 status=confirmed
      const tour_ids_to_recalculate = new Set<string>()
      for (const id of selectedRequestIds) {
        await supabase
          .from('payment_requests')
          .update({ disbursement_order_id: data.id, status: 'confirmed' })
          .eq('id', id)

        // PR confirmed → 自動產生會計傳票（opt-in：未啟用會計或設定不全、API 會 skip / throw、catch 吞）
        try {
          await fetch('/api/accounting/vouchers/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_type: 'payment_request',
              source_id: id,
              workspace_id: user?.workspace_id,
            }),
          })
        } catch (err) {
          logger.error('產生請款傳票失敗:', err)
        }

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
      // 從 FK 反查現有綁定、跟 selectedRequestIds 算 diff
      const { data: currentLinks, error: linkErr } = await supabase
        .from('payment_requests')
        .select('id')
        .eq('disbursement_order_id', editingOrder.id)
      if (linkErr) throw linkErr
      const existingIds = (currentLinks || []).map(r => r.id)
      const oldIds = new Set(existingIds)
      const newIds = new Set(selectedRequestIds)

      // 找出新增和移除的請款單
      const addedIds = selectedRequestIds.filter(id => !oldIds.has(id))
      const removedIds = existingIds.filter(id => !newIds.has(id))

      // 如果出帳日期改變，重新生成出納單號
      const dateChanged = editingOrder.disbursement_date !== disbursementDate
      let updatedFields: Record<string, unknown> = {
        amount: selectedAmount,
        disbursement_date: disbursementDate,
      }
      if (dateChanged) {
        if (!user?.workspace_id) throw new Error('找不到 workspace_id、無法生成出納單號')
        const newOrderNumber = await generateDisbursementNumber(user.workspace_id, disbursementDate)
        updatedFields = { ...updatedFields, order_number: newOrderNumber, code: newOrderNumber }
      }

      // 更新出納單金額/日期/編號（不寫 array、FK 端負責綁定）
      await updateDisbursementOrderApi(editingOrder.id, updatedFields)

      const tour_ids_to_recalculate = new Set<string>()

      // 把 added/removed 集合擴展、自動帶上「轉移 pair 對手」
      // 不然單邊變動 → 對手孤兒（一張 confirmed / 一張 pending、財務不平衡）
      const expandWithPairs = async (ids: string[]): Promise<string[]> => {
        if (ids.length === 0) return ids
        const { data: pairRows } = await supabase
          .from('payment_requests')
          .select('id, transferred_pair_id')
          .in('id', ids)
        const pairIdsToInclude = new Set<string>()
        for (const r of pairRows ?? []) {
          const row = r as { transferred_pair_id?: string | null }
          if (row.transferred_pair_id) pairIdsToInclude.add(row.transferred_pair_id)
        }
        if (pairIdsToInclude.size === 0) return ids

        // 用 pair_id 去抓所有對手 PR
        const { data: partners } = await supabase
          .from('payment_requests')
          .select('id')
          .in('transferred_pair_id', [...pairIdsToInclude])
        const merged = new Set(ids)
        for (const p of partners ?? []) {
          merged.add((p as { id: string }).id)
        }
        return [...merged]
      }

      const addedAll = await expandWithPairs(addedIds)
      const removedAll = await expandWithPairs(removedIds)

      // 新增的請款單：綁到此出納單 + status=confirmed
      for (const id of addedAll) {
        await supabase
          .from('payment_requests')
          .update({ disbursement_order_id: editingOrder.id, status: 'confirmed' })
          .eq('id', id)

        // PR confirmed → 自動產生會計傳票
        try {
          await fetch('/api/accounting/vouchers/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_type: 'payment_request',
              source_id: id,
              workspace_id: user?.workspace_id,
            }),
          })
        } catch (err) {
          logger.error('產生請款傳票失敗:', err)
        }

        const req = pendingRequests.find(r => r.id === id)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 移除的請款單：解除綁定（FK = null）+ status=pending（連 pair 對手一起釋放）
      for (const id of removedAll) {
        await supabase
          .from('payment_requests')
          .update({ disbursement_order_id: null, status: 'pending' })
          .eq('id', id)
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
