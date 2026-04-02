'use client'

/**
 * useOrderMembersData - 訂單成員資料管理與對話框狀態 Hook
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 此 hook 負責：
 * - 成員列表資料載入與狀態管理
 * - 新增/刪除成員操作
 * - 新增成員對話框狀態
 * - 訂單選擇對話框狀態（團體模式）
 * - Realtime 即時同步（2026-01-19 新增）
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import type { OrderMember } from '../types/order-member.types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { deleteMember } from '@/data'
import { COMP_ORDERS_LABELS } from '../constants/labels'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
import { MEMBER_DATA_LABELS } from '../constants/labels'

// 快取已同步的顧客 ID，避免重複同步
const syncedCustomerIds = new Set<string>()

interface UseOrderMembersDataParams {
  orderId?: string
  tourId: string
  workspaceId: string
  mode: 'order' | 'tour'
}

interface TourOrder {
  id: string
  order_number: string | null
}

export function useOrderMembersData({
  orderId,
  tourId,
  workspaceId,
  mode,
}: UseOrderMembersDataParams) {
  // ========== 成員資料狀態 ==========
  const [members, setMembers] = useState<OrderMember[]>([])
  const [loading, setLoading] = useState(false)
  const [departureDate, setDepartureDate] = useState<string | null>(null)
  const [returnDate, setReturnDate] = useState<string | null>(null)

  // ========== 團體模式相關狀態 ==========
  const [orderCount, setOrderCount] = useState(0)
  const [tourOrders, setTourOrders] = useState<TourOrder[]>([])

  // ========== 新增成員對話框狀態 ==========
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [memberCountToAdd, setMemberCountToAdd] = useState<number | ''>(1)
  const [selectedOrderIdForAdd, setSelectedOrderIdForAdd] = useState<string | null>(null)
  const [showOrderSelectDialog, setShowOrderSelectDialog] = useState(false)

  // ========== 顧客資料由 SWR 自動載入 ==========

  /**
   * 載入旅遊團出發/回程日期
   */
  const loadTourDepartureDate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('departure_date, return_date')
        .eq('id', tourId)
        .single()

      if (error) throw error
      setDepartureDate(data?.departure_date || null)
      setReturnDate(data?.return_date || null)
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.載入出發日期失敗, error)
    }
  }, [tourId])

  /**
   * 載入成員資料
   * - 單一訂單模式：載入該訂單的成員
   * - 團體模式：載入該旅遊團所有訂單的成員
   */
  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      let membersData: OrderMember[] = []
      let orderCodeMap: Record<string, string> = {}

      if (mode === 'tour') {
        // 團體模式：載入旅遊團所有訂單的成員
        // 1. 先查詢該旅遊團的所有訂單
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('tour_id', tourId)
          .order('created_at', { ascending: true })

        if (ordersError) throw ordersError

        if (ordersData && ordersData.length > 0) {
          // 設定訂單數量和訂單列表
          setOrderCount(ordersData.length)
          setTourOrders(ordersData)

          // 建立訂單編號對應表（只取序號部分，如 "01"）
          orderCodeMap = Object.fromEntries(
            ordersData.map(o => {
              const orderNum = o.order_number || ''
              // 從 "CNX250128A-01" 提取 "01"
              const seqMatch = orderNum.match(/-(\d+)$/)
              return [o.id, seqMatch ? seqMatch[1] : orderNum]
            })
          )
          const orderIds = ordersData.map(o => o.id)

          // 2. 載入這些訂單的所有成員
          const { data: allMembersData, error: membersError } = await supabase
            .from('order_members')
            .select('id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, contract_created_at, workspace_id, created_at, created_by, updated_at, updated_by')
            .in('order_id', orderIds)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })  // 加上 id 確保順序穩定
            .limit(500)

          if (membersError) throw membersError
          membersData = allMembersData || []
        }
      } else if (orderId) {
        // 單一訂單模式
        const { data, error: membersError } = await supabase
          .from('order_members')
          .select('id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, contract_created_at, workspace_id, created_at, created_by, updated_at, updated_by')
          .eq('order_id', orderId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })  // 加上 id 確保順序穩定
          .limit(500)

        if (membersError) throw membersError
        membersData = data || []
      }

      // 收集所有有 customer_id 的成員
      const customerIds = membersData.map(m => m.customer_id).filter(Boolean) as string[]

      // 如果有 customer_id，批次查詢顧客完整資料
      let customerDataMap: Record<
        string,
        {
          name: string | null
          passport_name: string | null
          birth_date: string | null
          passport_number: string | null
          passport_expiry: string | null
          gender: string | null
          verification_status: string
          passport_image_url: string | null
        }
      > = {}
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select(
            'id, name, passport_name, birth_date, passport_number, passport_expiry, gender, verification_status, passport_image_url'
          )
          .in('id', customerIds)

        if (customersData) {
          customerDataMap = Object.fromEntries(
            customersData.map(c => [
              c.id,
              {
                name: c.name || null,
                passport_name: c.passport_name || null,
                birth_date: c.birth_date || null,
                passport_number: c.passport_number || null,
                passport_expiry: c.passport_expiry || null,
                gender: c.gender || null,
                verification_status: c.verification_status || '',
                passport_image_url: c.passport_image_url || null,
              },
            ])
          )
        }
      }

      // 合併驗證狀態和訂單編號到成員
      // 同時填補缺失的顧客資料（chinese_name, passport_name 等）並背景同步到資料庫
      const membersToSync: Array<{
        memberId: string
        customerId: string
        updateData: Record<string, any>
      }> = []

      const membersWithStatus = membersData.map(m => {
        const customerData = m.customer_id ? customerDataMap[m.customer_id] : null
        if (!customerData) {
          return {
            ...m,
            order_code: mode === 'tour' ? orderCodeMap[m.order_id] || null : null,
          }
        }

        // 準備合併的資料（優先使用 order_members 的資料，缺失時用 customers 的）
        const mergedData: Record<string, any> = {}
        const syncData: Record<string, any> = {}

        // 檢查並填補缺失的欄位
        const fieldsToCheck = [
          'chinese_name',
          'passport_name',
          'birth_date',
          'passport_number',
          'passport_expiry',
          'gender',
          'passport_image_url',
        ] as const

        fieldsToCheck.forEach(field => {
          const memberValue = m[field as keyof typeof m]
          const customerField =
            field === 'chinese_name' ? 'name' : (field as keyof typeof customerData)
          const customerValue = customerData[customerField]

          if (!memberValue && customerValue) {
            // order_members 沒資料但 customers 有，使用 customers 的資料
            mergedData[field] = customerValue
            syncData[field] = customerValue
          } else {
            // 使用 order_members 的資料
            mergedData[field] = memberValue
          }
        })

        // 如果有需要同步的資料且尚未同步過，加入同步列表
        if (
          Object.keys(syncData).length > 0 &&
          m.customer_id &&
          !syncedCustomerIds.has(m.customer_id)
        ) {
          membersToSync.push({
            memberId: m.id,
            customerId: m.customer_id,
            updateData: syncData,
          })
        }

        return {
          ...m,
          ...mergedData,
          customer_verification_status: customerData.verification_status || null,
          order_code: mode === 'tour' ? orderCodeMap[m.order_id] || null : null,
        }
      })

      // 背景同步：將顧客資料同步到成員資料庫（一次性修復）
      if (membersToSync.length > 0) {
        const uniqueCustomerIds = [...new Set(membersToSync.map(m => m.customerId))]
        uniqueCustomerIds.forEach(id => syncedCustomerIds.add(id))

        // 背景執行，不阻塞 UI
        void (async () => {
          for (const item of membersToSync) {
            await supabase.from('order_members').update(item.updateData).eq('id', item.memberId)
          }
          logger.info(
            `背景同步 ${membersToSync.length} 個成員的顧客資料（${Object.keys(membersToSync[0]?.updateData || {}).join(', ')}）`
          )
        })()
      }

      setMembers(membersWithStatus)
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.載入成員失敗, error)
    } finally {
      setLoading(false)
    }
  }, [mode, tourId, orderId])

  /**
   * 處理新增成員按鈕點擊
   * - 團體模式：需要先選擇訂單
   * - 單一訂單模式：直接開啟新增對話框
   */
  const handleAddMember = async () => {
    if (mode === 'tour') {
      // 團體模式：需要先選擇訂單
      if (tourOrders.length === 0) {
        await alert(COMP_ORDERS_LABELS.此團尚無訂單_請先建立訂單, 'warning')
        return
      }
      if (tourOrders.length === 1) {
        // 只有一個訂單，直接使用
        setSelectedOrderIdForAdd(tourOrders[0].id)
        setIsAddDialogOpen(true)
      } else {
        // 多個訂單，顯示選擇對話框
        setShowOrderSelectDialog(true)
      }
    } else {
      setIsAddDialogOpen(true)
    }
  }

  /**
   * 確認新增成員
   */
  const confirmAddMembers = async () => {
    // 如果是空白或無效數字，預設為 1
    const count = typeof memberCountToAdd === 'number' ? memberCountToAdd : 1

    // 團體模式使用選擇的訂單 ID，單一訂單模式使用 prop 的 orderId
    const targetOrderId = mode === 'tour' ? selectedOrderIdForAdd : orderId
    if (!targetOrderId) {
      await alert(COMP_ORDERS_LABELS.請選擇訂單, 'warning')
      return
    }

    try {
      const newMembers = Array.from({ length: count }, () => ({
        order_id: targetOrderId,
        workspace_id: workspaceId,
        member_type: 'adult',
        identity: COMP_ORDERS_LABELS.大人,
      }))

      const { data, error } = await supabase.from('order_members').insert(newMembers).select()

      if (error) throw error
      setMembers([...members, ...(data || [])])
      setIsAddDialogOpen(false)
      setMemberCountToAdd(1)
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.新增成員失敗, error)
      await alert(COMP_ORDERS_LABELS.新增失敗, 'error')
    }
  }

  /**
   * 重新排序成員
   */
  const handleReorderMembers = async (reorderedMembers: OrderMember[]) => {
    // 更新本地狀態（同時更新每個成員的 sort_order）
    const membersWithNewOrder = reorderedMembers.map((member, index) => ({
      ...member,
      sort_order: index + 1,
    }))
    setMembers(membersWithNewOrder)

    // 批次更新資料庫中的 sort_order
    try {
      const updates = membersWithNewOrder.map(member => ({
        id: member.id,
        sort_order: member.sort_order,
      }))

      // 使用 Promise.all 批次更新
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from('order_members').update({ sort_order }).eq('id', id)
        )
      )
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.更新排序失敗, error)
      toast.error(COMP_ORDERS_LABELS.排序更新失敗)
      // 重新載入以恢復正確順序
      loadMembers()
    }
  }

  /**
   * 刪除成員
   */
  const handleDeleteMember = async (memberId: string) => {
    // 找到要刪除的成員，顯示名稱讓使用者確認
    const memberToDelete = members.find(m => m.id === memberId)
    const memberName =
      memberToDelete?.chinese_name || memberToDelete?.passport_name || COMP_ORDERS_LABELS.此成員

    const confirmed = await confirm(MEMBER_DATA_LABELS.DELETE_CONFIRM(memberName), {
      title: COMP_ORDERS_LABELS.刪除成員,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteMember(memberId)
      setMembers(members.filter(m => m.id !== memberId))

      // 重算團人數
      if (tourId) {
        recalculateParticipants(tourId).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      }
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.刪除成員失敗, error)
      await alert(COMP_ORDERS_LABELS.刪除失敗, 'error')
    }
  }

  // 追蹤當前訂單 ID 列表（用於 Realtime 過濾）
  const orderIdsRef = useRef<string[]>([])

  /**
   * 初始載入
   */
  useEffect(() => {
    loadMembers()
    loadTourDepartureDate()
    // 顧客資料由 SWR 自動載入（用於編輯模式搜尋）
  }, [orderId, tourId, mode, loadMembers, loadTourDepartureDate])

  // 更新 orderIdsRef（用於 Realtime 過濾）
  useEffect(() => {
    if (mode === 'tour') {
      orderIdsRef.current = tourOrders.map(o => o.id)
    } else if (orderId) {
      orderIdsRef.current = [orderId]
    }
  }, [mode, tourOrders, orderId])

  /**
   * Realtime 訂閱 - 即時同步成員變更
   */
  useEffect(() => {
    // 構建訂閱的 filter
    // 團體模式：監聽該團所有訂單的成員
    // 單一訂單模式：監聽該訂單的成員
    const targetOrderIds = mode === 'tour' ? tourOrders.map(o => o.id) : orderId ? [orderId] : []
    if (targetOrderIds.length === 0) return

    // 建立訂閱頻道
    const channelName = mode === 'tour' ? `tour-members-${tourId}` : `order-members-${orderId}`
    const channel = supabase
      .channel(channelName)
      .on<OrderMember>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_members',
        },
        (payload: RealtimePostgresChangesPayload<OrderMember>) => {
          // 檢查是否屬於當前監聽的訂單
          const newRecord = payload.new as OrderMember | undefined
          const oldRecord = payload.old as { id: string; order_id?: string } | undefined

          // 取得變更記錄的 order_id
          const recordOrderId = newRecord?.order_id || oldRecord?.order_id
          if (!recordOrderId || !orderIdsRef.current.includes(recordOrderId)) {
            return // 不屬於當前監聽的訂單，忽略
          }

          if (payload.eventType === 'INSERT' && newRecord) {
            // 新增成員 - 檢查是否已存在（避免重複）
            setMembers(prev => {
              if (prev.some(m => m.id === newRecord.id)) return prev
              toast.success(COMP_ORDERS_LABELS.新成員已加入, { duration: 2000 })
              return [...prev, newRecord]
            })
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            // 更新成員
            setMembers(prev => prev.map(m => (m.id === newRecord.id ? { ...m, ...newRecord } : m)))
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            // 刪除成員
            setMembers(prev => prev.filter(m => m.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    // 清理訂閱
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mode, tourId, orderId, tourOrders])

  return {
    // 成員資料
    members,
    setMembers,
    loading,
    departureDate,
    returnDate,
    orderCount,
    tourOrders,

    // 資料載入函數
    loadMembers,
    loadTourDepartureDate,

    // 成員操作
    handleAddMember,
    confirmAddMembers,
    handleDeleteMember,
    handleReorderMembers,

    // 新增成員對話框狀態
    isAddDialogOpen,
    setIsAddDialogOpen,
    memberCountToAdd,
    setMemberCountToAdd,

    // 訂單選擇對話框狀態（團體模式）
    selectedOrderIdForAdd,
    setSelectedOrderIdForAdd,
    showOrderSelectDialog,
    setShowOrderSelectDialog,
  }
}
