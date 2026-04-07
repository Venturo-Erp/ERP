'use client'

/**
 * Widgets Store Facade
 * 整合 AdvanceList 和 SharedOrderList Stores (createStore)
 * 保持與舊版 widgets-store 相同的 API
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { useAdvanceListStore } from './advance-list-store'
import { useSharedOrderListStore } from './shared-order-list-store'
import { useChannelStore } from './channel-store'
import type { AdvanceItem, AdvanceList, SharedOrderList } from './types'

/**
 * Widgets UI 狀態 (不需要同步到 Supabase 的狀態)
 */
interface WidgetsUIState {
  loading: boolean
  setLoading: (loading: boolean) => void
}

/**
 * UI 狀態 Store (純前端狀態)
 */
const useWidgetsUIStore = create<WidgetsUIState>(set => ({
  loading: false,
  setLoading: loading => set({ loading }),
}))

/**
 * Widgets Store Facade
 * 整合 AdvanceList 和 SharedOrderList Stores
 * 保持與舊版相同的 API
 */
export const useWidgetsStore = () => {
  const advanceListStore = useAdvanceListStore()
  const sharedOrderListStore = useSharedOrderListStore()
  const uiStore = useWidgetsUIStore()

  return {
    // ============================================
    // 資料 (來自 createStore)
    // ============================================
    advanceLists: advanceListStore.items,
    sharedOrderLists: sharedOrderListStore.items,

    // ============================================
    // Loading 和 Error
    // ============================================
    loading: uiStore.loading || advanceListStore.loading || sharedOrderListStore.loading,
    error: advanceListStore.error || sharedOrderListStore.error,

    // ============================================
    // Advance List 操作
    // ============================================
    shareAdvanceList: async (
      channelId: string,
      items: Omit<AdvanceItem, 'id' | 'status'>[],
      currentUserId: string
    ) => {
      const isOnline = typeof navigator !== 'undefined' && navigator.onLine

      const listId = uuidv4()
      const advanceItems = items.map(item => ({
        ...item,
        id: uuidv4(),
        status: 'pending' as const,
      }))

      const newList: AdvanceList = {
        id: listId,
        channel_id: channelId,
        items: advanceItems,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
      }

      try {
        if (isOnline && process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true') {
          // 取得頻道的 workspace_id
          const channel = useChannelStore
            .getState()
            .items.find((c: { id: string }) => c.id === channelId)
          const workspaceId = channel?.workspace_id

          const { error: listError } = await supabase.from('advance_lists').insert({
            id: listId,
            channel_id: channelId,
            created_by: currentUserId,
            created_at: newList.created_at,
            workspace_id: workspaceId,
          })

          if (listError) throw listError

          const { error: itemsError } = await supabase.from('advance_items').insert(
            advanceItems.map(item => ({
              id: item.id,
              advance_list_id: listId,
              name: item.name,
              description: item.description,
              amount: item.amount,
              advance_person: item.advance_person,
              status: item.status,
              created_at: newList.created_at,
              workspace_id: workspaceId,
            }))
          )

          if (itemsError) throw itemsError

          mutate((key: string) => typeof key === 'string' && key.startsWith('entity:advance_lists'), undefined, { revalidate: true })
          mutate((key: string) => typeof key === 'string' && key.startsWith('entity:advance_items'), undefined, { revalidate: true })
        }
      } catch (error) {
        // Silently fail
      }

      // 使用 createStore 的 create 方法
      await advanceListStore.create(newList)
    },

    processAdvanceItem: async (
      listId: string,
      itemId: string,
      paymentRequestId: string,
      processedBy: string
    ) => {
      const list = advanceListStore.items.find(l => l.id === listId)
      if (!list) return

      const updatedItems = list.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: 'completed' as const,
              payment_request_id: paymentRequestId,
              processed_by: processedBy,
              processed_at: new Date().toISOString(),
            }
          : item
      )

      await advanceListStore.update(listId, { items: updatedItems })
    },

    updateAdvanceStatus: async (listId: string, itemId: string, status: AdvanceItem['status']) => {
      const list = advanceListStore.items.find(l => l.id === listId)
      if (!list) return

      const updatedItems = list.items.map(item => (item.id === itemId ? { ...item, status } : item))

      await advanceListStore.update(listId, { items: updatedItems })
    },

    loadAdvanceLists: async (channelId: string) => {
      uiStore.setLoading(true)

      try {
        // 使用 createStore 的 fetchAll（自動處理快取優先）
        await advanceListStore.fetchAll()

        // 過濾出該 channel 的清單 (createStore 已經載入所有資料)
        // Note: 過濾邏輯在 UI 層面處理
        uiStore.setLoading(false)
      } catch (error) {
        uiStore.setLoading(false)
      }
    },

    deleteAdvanceList: async (listId: string) => {
      await advanceListStore.delete(listId)
    },

    // ============================================
    // Shared Order List 操作
    // ============================================
    shareOrderList: async (channelId: string, orderIds: string[], currentUserId: string) => {
      const { supabase } = await import('@/lib/supabase/client')

      // 批量查詢指定 ID 的訂單
      const { data: fetchedOrders } = await supabase
        .from('orders')
        .select('id, order_number, contact_person, total_amount, paid_amount')
        .in('id', orderIds)

      const orders = (fetchedOrders || []).map(order => {
        const totalCost = order.total_amount || 0
        const collected = order.paid_amount || 0
        const gap = totalCost - collected
        const collectionRate = totalCost > 0 ? (collected / totalCost) * 100 : 0

        return {
          id: order.id,
          order_number: order.order_number,
          contact_person: order.contact_person || '',
          total_amount: totalCost,
          paid_amount: collected,
          gap,
          collection_rate: collectionRate,
          invoice_status: 'not_invoiced' as const,
          receipt_status: 'not_received' as const,
        }
      })

      const newList: SharedOrderList = {
        id: uuidv4(),
        channel_id: channelId,
        orders,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
      }

      // 使用 createStore 的 create 方法
      await sharedOrderListStore.create(newList)
    },

    updateOrderReceiptStatus: async (listId: string, orderId: string, _receiptId: string) => {
      const list = sharedOrderListStore.items.find(l => l.id === listId)
      if (!list) return

      const updatedOrders = list.orders.map(order =>
        order.id === orderId ? { ...order, receipt_status: 'received' as const } : order
      )

      await sharedOrderListStore.update(listId, { orders: updatedOrders })
    },

    loadSharedOrderLists: async (channelId: string) => {
      uiStore.setLoading(true)

      try {
        // 使用 createStore 的 fetchAll（自動處理快取優先）
        await sharedOrderListStore.fetchAll()

        // 過濾出該 channel 的清單 (createStore 已經載入所有資料)
        // Note: 過濾邏輯在 UI 層面處理
        uiStore.setLoading(false)
      } catch (error) {
        uiStore.setLoading(false)
      }
    },

    // ============================================
    // Internal state
    // ============================================
    clearWidgets: () => {
      // createStore 自動管理資料，這裡不需要清空
      // 如果需要，可以重新 fetchAll
    },
  }
}

/**
 * Hook 型別（方便使用）
 */
export type WidgetsStoreType = ReturnType<typeof useWidgetsStore>
