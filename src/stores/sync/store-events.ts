/**
 * Store 事件同步系統
 *
 * 解決跨 Store 同步問題：當 Tour 更新時，自動通知相關的 OrderStore 和 MemberStore 重新載入
 *
 * 設計原則：
 * 1. 避免無限循環 - 使用 eventSource 追蹤來源，不觸發來源 store 的重新載入
 * 2. 精準更新 - 只重新載入受影響的資料，不做 fetchAll
 * 3. 向後相容 - 不修改現有 store 介面，以擴展方式加入
 *
 * 使用方式：
 * ```typescript
 * // 發送事件
 * storeEvents.emit('TOUR_UPDATED', { tourId: '123', source: 'tour' })
 *
 * // 訂閱事件
 * storeEvents.on('TOUR_UPDATED', ({ tourId }) => {
 *   orderStore.fetchByTourId(tourId)
 * })
 * ```
 */

import { logger } from '@/lib/utils/logger'

// ============================================
// 事件類型定義
// ============================================

/**
 * Store 事件類型
 */
export type StoreEventType =
  | 'TOUR_CREATED'
  | 'TOUR_UPDATED'
  | 'TOUR_DELETED'
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_DELETED'
  | 'MEMBER_CREATED'
  | 'MEMBER_UPDATED'
  | 'MEMBER_DELETED'
  | 'ITINERARY_CREATED'
  | 'ITINERARY_UPDATED'
  | 'ITINERARY_DELETED'
  | 'PAYMENT_REQUEST_CREATED'
  | 'PAYMENT_REQUEST_UPDATED'
  | 'PAYMENT_REQUEST_DELETED'
  | 'RECEIPT_ORDER_CREATED'
  | 'RECEIPT_ORDER_UPDATED'
  | 'RECEIPT_ORDER_DELETED'

/**
 * 事件來源 Store 類型
 */
export type StoreSource =
  | 'tour'
  | 'order'
  | 'member'
  | 'itinerary'
  | 'payment_request'
  | 'receipt_order'
  | 'external' // 外部觸發（如 API、Realtime）

/**
 * 事件 payload 基礎介面
 */
interface BaseEventPayload {
  /** 事件來源 store，用於避免無限循環 */
  source: StoreSource
  /** 時間戳記 */
  timestamp?: number
}

/**
 * Tour 相關事件 payload
 */
export interface TourEventPayload extends BaseEventPayload {
  tourId: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * Order 相關事件 payload
 */
export interface OrderEventPayload extends BaseEventPayload {
  orderId: string
  tourId?: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * Member 相關事件 payload
 */
export interface MemberEventPayload extends BaseEventPayload {
  memberId: string
  orderId?: string
  tourId?: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * Itinerary 相關事件 payload
 */
export interface ItineraryEventPayload extends BaseEventPayload {
  itineraryId: string
  tourId?: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * PaymentRequest 相關事件 payload
 */
export interface PaymentRequestEventPayload extends BaseEventPayload {
  paymentRequestId: string
  tourId?: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * ReceiptOrder 相關事件 payload
 */
export interface ReceiptOrderEventPayload extends BaseEventPayload {
  receiptOrderId: string
  tourId?: string
  orderId?: string
  /** 變更的欄位（可選，用於精準更新） */
  changedFields?: string[]
}

/**
 * 事件 payload 類型映射
 */
export interface StoreEventPayloadMap {
  TOUR_CREATED: TourEventPayload
  TOUR_UPDATED: TourEventPayload
  TOUR_DELETED: TourEventPayload
  ORDER_CREATED: OrderEventPayload
  ORDER_UPDATED: OrderEventPayload
  ORDER_DELETED: OrderEventPayload
  MEMBER_CREATED: MemberEventPayload
  MEMBER_UPDATED: MemberEventPayload
  MEMBER_DELETED: MemberEventPayload
  ITINERARY_CREATED: ItineraryEventPayload
  ITINERARY_UPDATED: ItineraryEventPayload
  ITINERARY_DELETED: ItineraryEventPayload
  PAYMENT_REQUEST_CREATED: PaymentRequestEventPayload
  PAYMENT_REQUEST_UPDATED: PaymentRequestEventPayload
  PAYMENT_REQUEST_DELETED: PaymentRequestEventPayload
  RECEIPT_ORDER_CREATED: ReceiptOrderEventPayload
  RECEIPT_ORDER_UPDATED: ReceiptOrderEventPayload
  RECEIPT_ORDER_DELETED: ReceiptOrderEventPayload
}

// ============================================
// 事件訂閱者類型
// ============================================

type EventHandler<T extends StoreEventType> = (payload: StoreEventPayloadMap[T]) => void

interface Subscription {
  unsubscribe: () => void
}

// ============================================
// Store 事件管理器
// ============================================

class StoreEventManager {
  private handlers: Map<StoreEventType, Set<EventHandler<StoreEventType>>> = new Map()
  private eventHistory: Array<{
    type: StoreEventType
    payload: BaseEventPayload
    timestamp: number
  }> = []
  private maxHistorySize = 100

  // 防止重複事件的 debounce 機制
  private pendingEvents: Map<string, NodeJS.Timeout> = new Map()
  private debounceMs = 50 // 50ms 內的相同事件會被合併

  constructor() {
    // 初始化所有事件類型的 handler set
    const eventTypes: StoreEventType[] = [
      'TOUR_CREATED',
      'TOUR_UPDATED',
      'TOUR_DELETED',
      'ORDER_CREATED',
      'ORDER_UPDATED',
      'ORDER_DELETED',
      'MEMBER_CREATED',
      'MEMBER_UPDATED',
      'MEMBER_DELETED',
      'ITINERARY_CREATED',
      'ITINERARY_UPDATED',
      'ITINERARY_DELETED',
      'PAYMENT_REQUEST_CREATED',
      'PAYMENT_REQUEST_UPDATED',
      'PAYMENT_REQUEST_DELETED',
      'RECEIPT_ORDER_CREATED',
      'RECEIPT_ORDER_UPDATED',
      'RECEIPT_ORDER_DELETED',
    ]
    eventTypes.forEach(type => this.handlers.set(type, new Set()))
  }

  /**
   * 訂閱事件
   * @param eventType 事件類型
   * @param handler 處理函數
   * @param options 選項
   * @returns 訂閱物件（包含 unsubscribe 方法）
   */
  on<T extends StoreEventType>(
    eventType: T,
    handler: EventHandler<T>,
    options?: {
      /** 要忽略的來源（避免自己觸發自己） */
      ignoreSources?: StoreSource[]
    }
  ): Subscription {
    const wrappedHandler: EventHandler<T> = payload => {
      // 檢查是否應該忽略此來源
      if (options?.ignoreSources?.includes(payload.source)) {
        logger.log(`[StoreEvents] 忽略來自 ${payload.source} 的 ${eventType} 事件`)
        return
      }
      handler(payload)
    }

    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.add(wrappedHandler as EventHandler<StoreEventType>)
    }

    return {
      unsubscribe: () => {
        const handlers = this.handlers.get(eventType)
        if (handlers) {
          handlers.delete(wrappedHandler as EventHandler<StoreEventType>)
        }
      },
    }
  }

  /**
   * 發送事件
   * @param eventType 事件類型
   * @param payload 事件資料
   */
  emit<T extends StoreEventType>(
    eventType: T,
    payload: Omit<StoreEventPayloadMap[T], 'timestamp'>
  ): void {
    const fullPayload = {
      ...payload,
      timestamp: Date.now(),
    } as StoreEventPayloadMap[T]

    // 生成事件唯一 key（用於 debounce）
    const eventKey = this.getEventKey(eventType, payload)

    // 清除之前的 pending event
    const pendingTimeout = this.pendingEvents.get(eventKey)
    if (pendingTimeout) {
      clearTimeout(pendingTimeout)
    }

    // 設定 debounce
    const timeout = setTimeout(() => {
      this.pendingEvents.delete(eventKey)
      this.executeEmit(eventType, fullPayload)
    }, this.debounceMs)

    this.pendingEvents.set(eventKey, timeout)
  }

  /**
   * 立即發送事件（跳過 debounce）
   */
  emitImmediate<T extends StoreEventType>(
    eventType: T,
    payload: Omit<StoreEventPayloadMap[T], 'timestamp'>
  ): void {
    const fullPayload = {
      ...payload,
      timestamp: Date.now(),
    } as StoreEventPayloadMap[T]

    // 清除可能存在的 pending event
    const eventKey = this.getEventKey(eventType, payload)
    const pendingTimeout = this.pendingEvents.get(eventKey)
    if (pendingTimeout) {
      clearTimeout(pendingTimeout)
      this.pendingEvents.delete(eventKey)
    }

    this.executeEmit(eventType, fullPayload)
  }

  private executeEmit<T extends StoreEventType>(
    eventType: T,
    payload: StoreEventPayloadMap[T]
  ): void {
    logger.log(`[StoreEvents] 發送事件: ${eventType}`, payload)

    // 記錄事件歷史
    this.eventHistory.push({
      type: eventType,
      payload,
      timestamp: payload.timestamp || Date.now(),
    })

    // 限制歷史記錄大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }

    // 執行所有 handlers
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          logger.error(`[StoreEvents] Handler 執行錯誤 (${eventType}):`, error)
        }
      })
    }
  }

  private getEventKey(eventType: StoreEventType, payload: Record<string, unknown>): string {
    // 根據事件類型生成唯一 key
    const idField = this.getIdField(eventType)
    const id = (payload[idField] as string) || 'unknown'
    return `${eventType}:${id}`
  }

  private getIdField(eventType: StoreEventType): string {
    if (eventType.startsWith('TOUR_')) return 'tourId'
    if (eventType.startsWith('ORDER_')) return 'orderId'
    if (eventType.startsWith('MEMBER_')) return 'memberId'
    if (eventType.startsWith('ITINERARY_')) return 'itineraryId'
    if (eventType.startsWith('PAYMENT_REQUEST_')) return 'paymentRequestId'
    if (eventType.startsWith('RECEIPT_ORDER_')) return 'receiptOrderId'
    return 'id'
  }

  /**
   * 取得事件歷史（用於除錯）
   */
  getEventHistory(): ReadonlyArray<{
    type: StoreEventType
    payload: BaseEventPayload
    timestamp: number
  }> {
    return [...this.eventHistory]
  }

  /**
   * 清除所有訂閱（用於測試或清理）
   */
  clearAll(): void {
    this.handlers.forEach(handlers => handlers.clear())
    this.eventHistory = []
    this.pendingEvents.forEach(timeout => clearTimeout(timeout))
    this.pendingEvents.clear()
  }

  /**
   * 取得指定事件類型的訂閱數量（用於除錯）
   */
  getSubscriberCount(eventType: StoreEventType): number {
    return this.handlers.get(eventType)?.size || 0
  }
}

// ============================================
// 匯出單例
// ============================================

export const storeEvents = new StoreEventManager()

// ============================================
// 便利函數
// ============================================

/**
 * 建立 Store 同步設定
 *
 * @example
 * ```typescript
 * // 在 store 初始化時呼叫
 * const cleanup = setupStoreSyncListeners({
 *   onTourUpdated: (tourId) => orderStore.fetchByTourId(tourId),
 *   onOrderUpdated: (orderId) => memberStore.fetchByOrderId(orderId),
 * })
 *
 * // 清理時呼叫
 * cleanup()
 * ```
 */
interface StoreSyncConfig {
  /** 當 Tour 建立時 */
  onTourCreated?: (tourId: string, payload: TourEventPayload) => void
  /** 當 Tour 更新時 */
  onTourUpdated?: (tourId: string, payload: TourEventPayload) => void
  /** 當 Tour 刪除時 */
  onTourDeleted?: (tourId: string, payload: TourEventPayload) => void
  /** 當 Order 建立時 */
  onOrderCreated?: (orderId: string, tourId: string | undefined, payload: OrderEventPayload) => void
  /** 當 Order 更新時 */
  onOrderUpdated?: (orderId: string, tourId: string | undefined, payload: OrderEventPayload) => void
  /** 當 Order 刪除時 */
  onOrderDeleted?: (orderId: string, tourId: string | undefined, payload: OrderEventPayload) => void
  /** 當 Member 建立時 */
  onMemberCreated?: (
    memberId: string,
    orderId: string | undefined,
    payload: MemberEventPayload
  ) => void
  /** 當 Member 更新時 */
  onMemberUpdated?: (
    memberId: string,
    orderId: string | undefined,
    payload: MemberEventPayload
  ) => void
  /** 當 Member 刪除時 */
  onMemberDeleted?: (
    memberId: string,
    orderId: string | undefined,
    payload: MemberEventPayload
  ) => void
  /** 要忽略的事件來源 */
  ignoreSources?: StoreSource[]
}

function setupStoreSyncListeners(config: StoreSyncConfig): () => void {
  const subscriptions: Subscription[] = []
  const { ignoreSources } = config

  // Tour 事件
  if (config.onTourCreated) {
    subscriptions.push(
      storeEvents.on(
        'TOUR_CREATED',
        payload => {
          config.onTourCreated!(payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onTourUpdated) {
    subscriptions.push(
      storeEvents.on(
        'TOUR_UPDATED',
        payload => {
          config.onTourUpdated!(payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onTourDeleted) {
    subscriptions.push(
      storeEvents.on(
        'TOUR_DELETED',
        payload => {
          config.onTourDeleted!(payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }

  // Order 事件
  if (config.onOrderCreated) {
    subscriptions.push(
      storeEvents.on(
        'ORDER_CREATED',
        payload => {
          config.onOrderCreated!(payload.orderId, payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onOrderUpdated) {
    subscriptions.push(
      storeEvents.on(
        'ORDER_UPDATED',
        payload => {
          config.onOrderUpdated!(payload.orderId, payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onOrderDeleted) {
    subscriptions.push(
      storeEvents.on(
        'ORDER_DELETED',
        payload => {
          config.onOrderDeleted!(payload.orderId, payload.tourId, payload)
        },
        { ignoreSources }
      )
    )
  }

  // Member 事件
  if (config.onMemberCreated) {
    subscriptions.push(
      storeEvents.on(
        'MEMBER_CREATED',
        payload => {
          config.onMemberCreated!(payload.memberId, payload.orderId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onMemberUpdated) {
    subscriptions.push(
      storeEvents.on(
        'MEMBER_UPDATED',
        payload => {
          config.onMemberUpdated!(payload.memberId, payload.orderId, payload)
        },
        { ignoreSources }
      )
    )
  }
  if (config.onMemberDeleted) {
    subscriptions.push(
      storeEvents.on(
        'MEMBER_DELETED',
        payload => {
          config.onMemberDeleted!(payload.memberId, payload.orderId, payload)
        },
        { ignoreSources }
      )
    )
  }

  // 返回清理函數
  return () => {
    subscriptions.forEach(sub => sub.unsubscribe())
  }
}

// ============================================
// Store 同步關係配置
// ============================================

/**
 * 預設的 Store 同步關係
 *
 * Tour 更新時：
 * - Orders: 重新載入該 Tour 的訂單（可能影響訂單狀態、日期等）
 * - Members: 通常不需要直接重載（透過 Order 間接更新）
 *
 * Order 更新時：
 * - Members: 重新載入該 Order 的成員
 * - Tour: 可能需要更新統計（人數、金額等）
 *
 * Member 更新時：
 * - Order: 可能需要更新統計（人數、金額等）
 */
const STORE_SYNC_RELATIONS = {
  // Tour 事件會影響的 stores
  TOUR_UPDATED: ['order'] as const,
  TOUR_DELETED: ['order', 'member', 'itinerary', 'payment_request', 'receipt_order'] as const,

  // Order 事件會影響的 stores
  ORDER_UPDATED: ['member'] as const,
  ORDER_DELETED: ['member', 'receipt_order'] as const,

  // Member 事件會影響的 stores
  MEMBER_UPDATED: [] as const,
  MEMBER_DELETED: [] as const,
} as const
