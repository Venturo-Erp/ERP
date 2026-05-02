'use client'

/**
 * Store 同步 Hook
 *
 * 在應用程式根層級使用，設定跨 Store 的同步訂閱
 *
 * @example
 * ```tsx
 * // 在 app/providers.tsx 或類似的地方
 * function Providers({ children }) {
 *   useStoreSyncSetup()
 *   return <>{children}</>
 * }
 * ```
 */

import { useEffect, useRef } from 'react'
import { storeEvents } from './store-events'
import { logger } from '@/lib/utils/logger'

// 動態 import stores 避免循環依賴
// 這些 stores 會在需要時才被載入
type StoreModule = {
  useTourStore?: ReturnType<typeof import('../index').useTourStore.getState>
  useOrderStore?: ReturnType<typeof import('../index').useOrderStore.getState>
}

/**
 * 設定跨 Store 同步的 Hook
 *
 * 功能：
 * 1. Tour 更新時，重新載入相關 Orders
 * 2. Tour 刪除時，重新載入相關 Orders
 *
 * 避免無限循環的機制：
 * - 每個事件都帶有 source 標記
 * - 訂閱時可指定 ignoreSources 來忽略特定來源的事件
 *
 * 注意（2026-05-02）：
 * - 原 Member 同步邏輯已移除（members 表已 DROP、改用 order_members）
 * - Member 統計由 UI 層計算、不需 store-level 同步
 */
export function useStoreSyncSetup(): void {
  const setupDone = useRef(false)

  useEffect(() => {
    // 確保只設定一次
    if (setupDone.current) return
    setupDone.current = true

    logger.log('[StoreSync] 初始化跨 Store 同步機制...')

    const subscriptions: Array<{ unsubscribe: () => void }> = []

    // ====================================================
    // Tour 事件處理
    // ====================================================

    // Tour 更新時，重新載入相關 Orders
    subscriptions.push(
      storeEvents.on(
        'TOUR_UPDATED',
        async ({ tourId, source }) => {
          // 避免由 order store 觸發的事件再次觸發 order 重載
          if (source === 'order') return

          logger.log(`[StoreSync] Tour ${tourId} 更新，重新載入相關 Orders`)

          try {
            // 動態載入 store 避免循環依賴
            const { useOrderStore } = await import('../index')
            const orderState = useOrderStore.getState()

            // 只更新該 Tour 的訂單（精準更新）
            const affectedOrders = orderState.items.filter(order => order.tour_id === tourId)

            if (affectedOrders.length > 0) {
              // 重新取得這些訂單的最新資料
              await Promise.all(affectedOrders.map(order => orderState.fetchById(order.id)))
              logger.log(`[StoreSync] 已重新載入 ${affectedOrders.length} 筆 Orders`)
            }
          } catch (error) {
            logger.error('[StoreSync] 重新載入 Orders 失敗:', error)
          }
        },
        { ignoreSources: ['order'] }
      )
    )

    // Tour 刪除時，從 UI 移除相關 Orders（實際資料由 DB cascade 處理）
    subscriptions.push(
      storeEvents.on('TOUR_DELETED', async ({ tourId }) => {
        logger.log(`[StoreSync] Tour ${tourId} 刪除，清理相關資料`)

        try {
          const { useOrderStore } = await import('../index')
          const orderState = useOrderStore.getState()

          // 找出被影響的訂單
          const affectedOrders = orderState.items.filter(order => order.tour_id === tourId)
          const affectedOrderIds = affectedOrders.map(o => o.id)

          // 從 UI 狀態中移除（資料庫已由 cascade 處理）
          if (affectedOrderIds.length > 0) {
            // 觸發重新載入以同步資料庫狀態
            await orderState.fetchAll()

            logger.log(`[StoreSync] 已同步 ${affectedOrders.length} 筆受影響的 Orders`)
          }
        } catch (error) {
          logger.error('[StoreSync] 清理相關資料失敗:', error)
        }
      })
    )

    // ====================================================
    // Order 事件處理
    // ====================================================

    // Order 更新/刪除時的 Member 同步邏輯已移除（2026-05-02、members 表已 DROP）
    // 改用 @/data 的 order_members entity hook、不需 store-level 同步

    // ====================================================
    // Order 建立時，更新 Tour 的訂單列表
    // ====================================================
    subscriptions.push(
      storeEvents.on('ORDER_CREATED', async ({ tourId, source }) => {
        if (source === 'tour' || !tourId) return

        logger.log(`[StoreSync] 新 Order 建立於 Tour ${tourId}`)

        // 這裡不需要做什麼，因為 Order 已經加入到 orderStore.items
        // 如果 Tour 需要顯示訂單數量，應該在 UI 層計算
      })
    )

    // ====================================================
    // Member 事件處理
    // ====================================================

    // Member 更新時，可能需要更新 Order 的統計
    subscriptions.push(
      storeEvents.on('MEMBER_UPDATED', async ({ orderId, source }) => {
        if (source === 'order' || !orderId) return

        logger.log(`[StoreSync] Member 更新，所屬 Order: ${orderId}`)

        // 如果 Order 需要顯示成員數量或總金額，可以在這裡更新
        // 目前 Order 的統計由 UI 層計算，不需要額外處理
      })
    )

    // Member 刪除時，更新 Order 統計
    subscriptions.push(
      storeEvents.on('MEMBER_DELETED', async ({ orderId, source }) => {
        if (source === 'order' || !orderId) return

        logger.log(`[StoreSync] Member 刪除，所屬 Order: ${orderId}`)
        // 同上，統計由 UI 層處理
      })
    )

    logger.log(`[StoreSync] 已建立 ${subscriptions.length} 個同步訂閱`)

    // 清理函數
    return () => {
      logger.log('[StoreSync] 清理同步訂閱...')
      subscriptions.forEach(sub => sub.unsubscribe())
      setupDone.current = false
    }
  }, [])
}

/**
 * 手動觸發 Tour 同步事件
 *
 * 用於在 store 外部（如 API route、Realtime callback）觸發同步
 */
function emitTourUpdated(tourId: string, changedFields?: string[]): void {
  storeEvents.emit('TOUR_UPDATED', {
    tourId,
    source: 'external',
    changedFields,
  })
}

function emitTourDeleted(tourId: string): void {
  storeEvents.emit('TOUR_DELETED', {
    tourId,
    source: 'external',
  })
}

function emitOrderUpdated(orderId: string, tourId?: string, changedFields?: string[]): void {
  storeEvents.emit('ORDER_UPDATED', {
    orderId,
    tourId,
    source: 'external',
    changedFields,
  })
}

function emitOrderDeleted(orderId: string, tourId?: string): void {
  storeEvents.emit('ORDER_DELETED', {
    orderId,
    tourId,
    source: 'external',
  })
}

function emitMemberUpdated(memberId: string, orderId?: string, tourId?: string): void {
  storeEvents.emit('MEMBER_UPDATED', {
    memberId,
    orderId,
    tourId,
    source: 'external',
  })
}

function emitMemberDeleted(memberId: string, orderId?: string, tourId?: string): void {
  storeEvents.emit('MEMBER_DELETED', {
    memberId,
    orderId,
    tourId,
    source: 'external',
  })
}
