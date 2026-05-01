'use client'

/**
 * Store 同步事件包裝器
 *
 * 為現有的 Zustand Store 添加事件發送功能
 * 不修改原始 store，透過包裝方式擴展功能
 *
 * @example
 * ```typescript
 * // 包裝現有 store
 * const useTourStoreWithSync = withSyncEvents(useTourStore, {
 *   entityType: 'tour',
 *   getEntityId: (item) => item.id,
 * })
 * ```
 */

import {
  storeEvents,
  StoreEventType,
  StoreSource,
  TourEventPayload,
  OrderEventPayload,
  MemberEventPayload,
  ItineraryEventPayload,
  PaymentRequestEventPayload,
  ReceiptOrderEventPayload,
  StoreEventPayloadMap,
} from './store-events'
import { logger } from '@/lib/utils/logger'

// ============================================
// 類型定義
// ============================================

/**
 * 實體類型
 */
type SyncEntityType =
  | 'tour'
  | 'order'
  | 'member'
  | 'itinerary'
  | 'payment_request'
  | 'receipt_order'

/**
 * 同步事件配置
 */
interface SyncEventConfig<T> {
  /** 實體類型 */
  entityType: SyncEntityType
  /** 取得實體 ID */
  getEntityId: (item: T) => string
  /** 取得關聯的 Tour ID（可選） */
  getTourId?: (item: T) => string | undefined
  /** 取得關聯的 Order ID（可選，用於 Member） */
  getOrderId?: (item: T) => string | undefined
}

/**
 * 基礎 Store 介面（簡化版，只需要 CRUD 操作）
 */
interface BaseStoreActions<T> {
  items: T[]
  create: (data: Record<string, unknown>) => Promise<T>
  update: (id: string, data: Record<string, unknown>) => Promise<T>
  delete: (id: string) => Promise<void>
  deleteMany?: (ids: string[]) => Promise<void>
}

/**
 * Zustand Store 類型
 */
interface ZustandStore<T> {
  getState: () => BaseStoreActions<T>
  subscribe: (listener: (state: BaseStoreActions<T>) => void) => () => void
  setState: (partial: Partial<BaseStoreActions<T>>) => void
}

// ============================================
// 事件發送輔助函數
// ============================================

/**
 * 發送 CREATED 事件
 */
function emitCreated<T>(config: SyncEventConfig<T>, item: T): void {
  const { entityType, getEntityId, getTourId, getOrderId } = config
  const payload = buildEventPayload(entityType, item, getEntityId, getTourId, getOrderId)

  emitEventByType(entityType, 'CREATED', payload)
}

/**
 * 發送 UPDATED 事件
 */
function emitUpdated<T>(
  config: SyncEventConfig<T>,
  item: T,
  changedFields?: string[]
): void {
  const { entityType, getEntityId, getTourId, getOrderId } = config
  const payload = buildEventPayload(
    entityType,
    item,
    getEntityId,
    getTourId,
    getOrderId,
    changedFields
  )

  emitEventByType(entityType, 'UPDATED', payload)
}

/**
 * 發送 DELETED 事件
 */
function emitDeleted<T>(config: SyncEventConfig<T>, entityId: string, item?: T): void {
  const { entityType, getTourId, getOrderId } = config

  const tourId = item && getTourId ? getTourId(item) : undefined
  const orderId = item && getOrderId ? getOrderId(item) : undefined
  const payload = buildDeletePayload(entityType, entityId, tourId, orderId)

  emitEventByType(entityType, 'DELETED', payload)
}

/**
 * 根據實體類型發送對應事件（類型安全）
 */
function emitEventByType(
  entityType: SyncEntityType,
  action: 'CREATED' | 'UPDATED' | 'DELETED',
  payload: EventPayload
): void {
  const eventName = `${entityType.toUpperCase()}_${action}`
  logger.log(`[SyncEvents] ${eventName}`, payload)

  switch (entityType) {
    case 'tour':
      storeEvents.emit(`TOUR_${action}` as StoreEventType, payload as TourEventPayload)
      break
    case 'order':
      storeEvents.emit(`ORDER_${action}` as StoreEventType, payload as OrderEventPayload)
      break
    case 'member':
      storeEvents.emit(`MEMBER_${action}` as StoreEventType, payload as MemberEventPayload)
      break
    case 'itinerary':
      storeEvents.emit(`ITINERARY_${action}` as StoreEventType, payload as ItineraryEventPayload)
      break
    case 'payment_request':
      storeEvents.emit(
        `PAYMENT_REQUEST_${action}` as StoreEventType,
        payload as PaymentRequestEventPayload
      )
      break
    case 'receipt_order':
      storeEvents.emit(
        `RECEIPT_ORDER_${action}` as StoreEventType,
        payload as ReceiptOrderEventPayload
      )
      break
  }
}

/**
 * 事件 payload 類型
 */
type EventPayload = {
  source: StoreSource
  changedFields?: string[]
  tourId?: string
  orderId?: string
  memberId?: string
  itineraryId?: string
  paymentRequestId?: string
  receiptOrderId?: string
}

// ============================================
// 輔助函數
// ============================================

function buildEventPayload<T>(
  entityType: SyncEntityType,
  item: T,
  getEntityId: (item: T) => string,
  getTourId?: (item: T) => string | undefined,
  getOrderId?: (item: T) => string | undefined,
  changedFields?: string[]
): EventPayload {
  const entityId = getEntityId(item)
  const tourId = getTourId ? getTourId(item) : undefined
  const orderId = getOrderId ? getOrderId(item) : undefined
  const source: StoreSource = entityType

  const base: EventPayload = { source, changedFields }

  switch (entityType) {
    case 'tour':
      return { ...base, tourId: entityId }
    case 'order':
      return { ...base, orderId: entityId, tourId }
    case 'member':
      return { ...base, memberId: entityId, orderId, tourId }
    case 'itinerary':
      return { ...base, itineraryId: entityId, tourId }
    case 'payment_request':
      return { ...base, paymentRequestId: entityId, tourId }
    case 'receipt_order':
      return { ...base, receiptOrderId: entityId, tourId, orderId }
    default:
      return base
  }
}

function buildDeletePayload(
  entityType: SyncEntityType,
  entityId: string,
  tourId?: string,
  orderId?: string
): EventPayload {
  const source: StoreSource = entityType
  const base: EventPayload = { source }

  switch (entityType) {
    case 'tour':
      return { ...base, tourId: entityId }
    case 'order':
      return { ...base, orderId: entityId, tourId }
    case 'member':
      return { ...base, memberId: entityId, orderId, tourId }
    case 'itinerary':
      return { ...base, itineraryId: entityId, tourId }
    case 'payment_request':
      return { ...base, paymentRequestId: entityId, tourId }
    case 'receipt_order':
      return { ...base, receiptOrderId: entityId, tourId, orderId }
    default:
      return base
  }
}

// ============================================
// Store 包裝函數
// ============================================

/**
 * 為 Store 的 CRUD 操作添加事件發送
 *
 * 使用方式：在元件中呼叫 store 操作後，手動發送事件
 *
 * @example
 * ```typescript
 * // 在元件中
 * const store = useTourStore()
 *
 * const handleUpdate = async (id, data) => {
 *   const result = await store.update(id, data)
 *   emitUpdated(TOUR_SYNC_CONFIG, result)
 * }
 * ```
 */

// 預設的同步配置
const TOUR_SYNC_CONFIG: SyncEventConfig<{ id: string }> = {
  entityType: 'tour',
  getEntityId: item => item.id,
}

const ORDER_SYNC_CONFIG: SyncEventConfig<{ id: string; tour_id?: string }> = {
  entityType: 'order',
  getEntityId: item => item.id,
  getTourId: item => item.tour_id,
}

const MEMBER_SYNC_CONFIG: SyncEventConfig<{ id: string; order_id?: string }> = {
  entityType: 'member',
  getEntityId: item => item.id,
  getOrderId: item => item.order_id,
}

const ITINERARY_SYNC_CONFIG: SyncEventConfig<{ id: string; tour_id?: string }> = {
  entityType: 'itinerary',
  getEntityId: item => item.id,
  getTourId: item => item.tour_id,
}

const PAYMENT_REQUEST_SYNC_CONFIG: SyncEventConfig<{ id: string; tour_id?: string }> = {
  entityType: 'payment_request',
  getEntityId: item => item.id,
  getTourId: item => item.tour_id,
}

const RECEIPT_ORDER_SYNC_CONFIG: SyncEventConfig<{
  id: string
  tour_id?: string
  order_id?: string
}> = {
  entityType: 'receipt_order',
  getEntityId: item => item.id,
  getTourId: item => item.tour_id,
  getOrderId: item => item.order_id,
}
