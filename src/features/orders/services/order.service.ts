/**
 * Order Service - 訂單核心邏輯
 *
 * @module order.service
 * @description
 * 訂單的 CRUD 操作和業務查詢。繼承 BaseService，額外提供：
 * - 依團、狀態、客戶篩選訂單
 * - 計算總營收
 *
 * 注意：訂單的 paid_amount / payment_status 由 receipt-core.service 的
 * recalculateReceiptStats 維護，不在此處修改。
 */

import { BaseService, StoreOperations } from '@/core/services/base.service'
import { useOrderStore } from '@/stores'
import { invalidateOrders } from '@/data'
import { ValidationError } from '@/core/errors/app-errors'
import { Order, PaymentStatus } from '@/types/order.types'
import { BaseEntity } from '@/core/types/common'
import { ORDER_SERVICE_LABELS } from '../constants/labels'

class OrderService extends BaseService<Order & BaseEntity> {
  protected resourceName = 'orders'

  // 使用 Store 提供同步讀取，搭配 invalidateOrders 確保 SWR 快取同步
  protected getStore = (): StoreOperations<Order & BaseEntity> => {
    const store = useOrderStore.getState()
    return {
      getAll: () => store.items as (Order & BaseEntity)[],
      getById: (id: string) =>
        store.items.find(o => o.id === id) as (Order & BaseEntity) | undefined,
      add: async (order: Order & BaseEntity) => {
        const { id, created_at, updated_at, ...createData } = order
        const result = await store.create(
          createData as unknown as Parameters<typeof store.create>[0]
        )
        await invalidateOrders()
        return result as Order & BaseEntity
      },
      update: async (id: string, data: Partial<Order>) => {
        await store.update(id, data as unknown as Parameters<typeof store.update>[1])
        await invalidateOrders()
      },
      delete: async (id: string) => {
        await store.delete(id)
        await invalidateOrders()
      },
    }
  }

  protected validate(data: Partial<Order>): void {
    if (data.tour_id && !data.tour_id.trim()) {
      throw new ValidationError('tour_id', ORDER_SERVICE_LABELS.MUST_ASSOCIATE_TOUR)
    }

    if (data.total_amount !== undefined && data.total_amount < 0) {
      throw new ValidationError('total_amount', ORDER_SERVICE_LABELS.AMOUNT_NOT_NEGATIVE)
    }
  }

  // ========== 業務邏輯方法 ==========

  getOrdersByTour(tour_id: string): Order[] {
    const store = useOrderStore.getState()
    return store.items.filter(o => o.tour_id === tour_id) as Order[]
  }

  getOrdersByStatus(status: PaymentStatus): Order[] {
    const store = useOrderStore.getState()
    return store.items.filter(o => o.payment_status === status) as Order[]
  }

  getOrdersByCustomer(customer_id: string): Order[] {
    const store = useOrderStore.getState()
    return store.items.filter(o => o.customer_id === customer_id) as Order[]
  }

  calculateTotalRevenue(): number {
    const store = useOrderStore.getState()
    return store.items
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)
  }

  getPendingOrders(): Order[] {
    return this.getOrdersByStatus('unpaid')
  }

  getConfirmedOrders(): Order[] {
    return this.getOrdersByStatus('paid')
  }
}

export const orderService = new OrderService()
