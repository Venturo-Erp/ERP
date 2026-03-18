// @ts-nocheck -- tour_requests table missing columns in generated types; pending DB migration
import { BaseService, StoreOperations } from '@/core/services/base.service'
import { PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { ValidationError } from '@/core/errors/app-errors'
import { logger } from '@/lib/utils/logger'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { supabase } from '@/lib/supabase/client'
import { invalidatePaymentRequests, invalidatePaymentRequestItems } from '@/data'
import { PAYMENTS_LABELS } from '../constants/labels'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

class PaymentRequestService extends BaseService<PaymentRequest> {
  protected resourceName = 'payment_requests'

  // 內部快取（用於同步方法）
  private _items: PaymentRequest[] = []
  private _itemsLoaded = false

  protected getStore = (): StoreOperations<PaymentRequest> => {
    return {
      getAll: () => this._items,
      getById: (id: string) => this._items.find(r => r.id === id),
      add: async (request: PaymentRequest) => {
        const { id, created_at, updated_at, ...createData } = request
        const insertData = {
          id: request.id,
          ...createData,
          created_at: request.created_at,
          updated_at: request.updated_at,
        }
        logger.log('Creating payment_request with data:', insertData)
        const { data, error } = await supabase
          .from('payment_requests')
          .insert(insertData)
          .select()
          .single()
        if (error) {
          logger.error('Supabase error creating payment_request:', error)
          throw new Error(`新增請款單失敗: ${error.message || JSON.stringify(error)}`)
        }
        // 更新內部快取，確保 getById 可以找到新建立的請款單
        const newRequest = data as unknown as PaymentRequest
        this._items = [newRequest, ...this._items]
        await invalidatePaymentRequests()
        return newRequest
      },
      update: async (id: string, data: Partial<PaymentRequest>) => {
        const { error } = await supabase.from('payment_requests').update(data).eq('id', id)
        if (error) throw error
        await invalidatePaymentRequests()
      },
      delete: async (id: string) => {
        const { error } = await supabase.from('payment_requests').delete().eq('id', id)
        if (error) throw error
        await invalidatePaymentRequests()
      },
    }
  }

  // 載入資料到內部快取（供同步方法使用）
  private async loadItems(): Promise<void> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) throw error
    this._items = (data || []) as unknown as PaymentRequest[]
    this._itemsLoaded = true
  }

  // 載入請款項目
  private async loadPaymentRequestItems(): Promise<PaymentRequestItem[]> {
    const { data, error } = await supabase
      .from('payment_request_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(5000)
    if (error) throw error
    return (data || []) as unknown as PaymentRequestItem[]
  }

  protected validate(data: Partial<PaymentRequest>): void {
    if (data.tour_id && !data.tour_id.trim()) {
      throw new ValidationError('tour_id', PAYMENTS_LABELS.必須關聯旅遊團)
    }

    if (data.amount !== undefined && data.amount < 0) {
      throw new ValidationError('amount', PAYMENTS_LABELS.總金額不能為負數)
    }

    if (data.created_at) {
      const requestDate = new Date(data.created_at)
      const dayOfWeek = requestDate.getDay()
      if (dayOfWeek !== 4) {
        throw new ValidationError('created_at', PAYMENTS_LABELS.請款日期必須為週四)
      }
    }
  }

  // ========== PaymentRequestItem 管理 ==========

  /**
   * 取得請款單的所有項目
   */
  async getItemsByRequestIdAsync(requestId: string): Promise<PaymentRequestItem[]> {
    const { data, error } = await supabase
      .from('payment_request_items')
      .select('*')
      .eq('request_id', requestId)
      .order('sort_order', { ascending: true })
      .limit(500)
    if (error) throw error
    return (data || []) as unknown as PaymentRequestItem[]
  }

  // 同步方法（向後相容，需要先載入資料）
  getItemsByRequestId(requestId: string): PaymentRequestItem[] {
    // 注意：這是同步方法，依賴於先前已載入的資料
    // 建議使用 getItemsByRequestIdAsync
    return []
  }

  /**
   * 新增請款項目
   */
  async addItem(
    requestId: string,
    itemData: Omit<
      PaymentRequestItem,
      'id' | 'request_id' | 'item_number' | 'subtotal' | 'created_at' | 'updated_at'
    >
  ): Promise<PaymentRequestItem> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    const existingItems = await this.getItemsByRequestIdAsync(requestId)

    const now = this.now()
    // 品項編號格式：TYO241218A-R01-1, TYO241218A-R01-2...
    const itemIndex = existingItems.length + 1
    const itemNumber = `${request.code}-${itemIndex}`

    // 資料庫欄位是 unitprice（無底線），轉換欄位名稱
    const item = {
      id: crypto.randomUUID(),
      request_id: requestId,
      item_number: itemNumber,
      category: itemData.category,
      supplier_id: itemData.supplier_id || null,
      supplier_name: itemData.supplier_name,
      description: itemData.description,
      unitprice: itemData.unit_price, // 資料庫欄位名稱
      quantity: itemData.quantity,
      subtotal: itemData.unit_price * itemData.quantity,
      notes: itemData.notes,
      sort_order: itemData.sort_order,
      tour_request_id: itemData.tour_request_id || null, // 關聯需求單
      advanced_by: (itemData as Record<string, unknown>).advanced_by || null,
      advanced_by_name: (itemData as Record<string, unknown>).advanced_by_name || null,
      // workspace_id auto-set by DB trigger
      created_at: now,
      updated_at: now,
    }

    // 直接使用 Supabase 新增項目
    const { data: createdItem, error } = await supabase
      .from('payment_request_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    await invalidatePaymentRequestItems()

    // 更新 request 的總金額
    const allItems = [...existingItems, createdItem as unknown as PaymentRequestItem]
    const totalAmount = allItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)

    await this.update(requestId, {
      amount: totalAmount,
      updated_at: now,
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }

    return createdItem as unknown as PaymentRequestItem
  }

  /**
   * 批次新增請款項目（batch insert，效能優化）
   */
  async addItems(
    requestId: string,
    itemsData: Array<
      Omit<
        PaymentRequestItem,
        'id' | 'request_id' | 'item_number' | 'subtotal' | 'created_at' | 'updated_at'
      >
    >
  ): Promise<PaymentRequestItem[]> {
    if (itemsData.length === 0) return []

    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    const existingItems = await this.getItemsByRequestIdAsync(requestId)
    const now = this.now()

    const rows = itemsData.map((itemData, idx) => {
      const itemIndex = existingItems.length + idx + 1
      const itemNumber = `${request.code}-${itemIndex}`
      return {
        id: crypto.randomUUID(),
        request_id: requestId,
        item_number: itemNumber,
        category: itemData.category,
        supplier_id: itemData.supplier_id || null,
        supplier_name: itemData.supplier_name,
        description: itemData.description,
        unitprice: itemData.unit_price, // 資料庫欄位名稱
        quantity: itemData.quantity,
        subtotal: itemData.unit_price * itemData.quantity,
        notes: itemData.notes,
        sort_order: itemData.sort_order,
        tour_request_id: itemData.tour_request_id || null,
        created_at: now,
        updated_at: now,
      }
    })

    const { data: createdItems, error } = await supabase
      .from('payment_request_items')
      .insert(rows)
      .select()

    if (error) throw error
    await invalidatePaymentRequestItems()

    // 更新 request 的總金額
    const allItems = [...existingItems, ...(createdItems as unknown as PaymentRequestItem[])]
    const totalAmount = allItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)

    await this.update(requestId, {
      amount: totalAmount,
      updated_at: now,
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }

    return createdItems as unknown as PaymentRequestItem[]
  }

  /**
   * 更新請款項目
   */
  async updateItem(
    requestId: string,
    itemId: string,
    itemData: Partial<PaymentRequestItem>
  ): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    const now = this.now()

    // 取得現有項目
    const { data: existingItem, error: fetchError } = await supabase
      .from('payment_request_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError) throw fetchError

    // 計算新的 subtotal（資料庫欄位是 unitprice）
    const unitPrice = Number(
      itemData.unit_price ?? (existingItem as Record<string, unknown>)?.unitprice ?? 0
    )
    const quantity = Number(itemData.quantity ?? existingItem?.quantity ?? 0)
    const subtotal = unitPrice * quantity

    // 映射 TypeScript 欄位名到資料庫欄位名，避免寫入不存在的欄位
    const dbUpdate: Record<string, unknown> = {
      subtotal,
      updated_at: now,
    }
    if (itemData.category !== undefined) dbUpdate.category = itemData.category
    if (itemData.supplier_id !== undefined) dbUpdate.supplier_id = itemData.supplier_id || null
    if (itemData.supplier_name !== undefined) dbUpdate.supplier_name = itemData.supplier_name
    if (itemData.description !== undefined) dbUpdate.description = itemData.description
    if (itemData.quantity !== undefined) dbUpdate.quantity = itemData.quantity
    if (itemData.notes !== undefined) dbUpdate.notes = itemData.notes
    if (itemData.sort_order !== undefined) dbUpdate.sort_order = itemData.sort_order
    // unit_price → unitprice (DB column name)
    if (itemData.unit_price !== undefined) dbUpdate.unitprice = itemData.unit_price

    // 直接使用 Supabase 更新項目
    const { error: updateError } = await supabase
      .from('payment_request_items')
      .update(dbUpdate)
      .eq('id', itemId)

    if (updateError) throw updateError
    await invalidatePaymentRequestItems()

    // 更新 request 的總金額
    const allItems = await this.getItemsByRequestIdAsync(requestId)
    const totalAmount = allItems.reduce((sum, i) => {
      if (i.id === itemId) {
        return sum + subtotal
      }
      return sum + (i.subtotal || 0)
    }, 0)

    await this.update(requestId, {
      amount: totalAmount,
      updated_at: now,
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }
  }

  /**
   * 刪除請款項目
   */
  async deleteItem(requestId: string, itemId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    const now = this.now()

    // 直接使用 Supabase 刪除項目
    const { error } = await supabase.from('payment_request_items').delete().eq('id', itemId)

    if (error) throw error
    await invalidatePaymentRequestItems()

    // 更新 request 的總金額
    const remainingItems = await this.getItemsByRequestIdAsync(requestId)
    const totalAmount = remainingItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)

    await this.update(requestId, {
      amount: totalAmount,
      updated_at: now,
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }
  }

  // ========== 業務邏輯方法 ==========

  /**
   * 計算請款單總金額（手動觸發）
   */
  async calculateTotalAmount(requestId: string): Promise<number> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    const items = await this.getItemsByRequestIdAsync(requestId)
    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

    await this.update(requestId, {
      amount: totalAmount,
      updated_at: this.now(),
    })

    return totalAmount
  }

  /**
   * 按類別取得請款項目
   */
  async getItemsByCategory(
    requestId: string,
    category: PaymentRequestItem['category']
  ): Promise<PaymentRequestItem[]> {
    const { data, error } = await supabase
      .from('payment_request_items')
      .select('*')
      .eq('request_id', requestId)
      .eq('category', category)
      .order('sort_order', { ascending: true })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequestItem[]
  }

  /**
   * 從報價單創建請款單
   */
  async createFromQuote(
    tourId: string,
    quoteId: string,
    requestDate: string,
    tourName: string,
    code: string
  ): Promise<PaymentRequest> {
    const requestData = {
      tour_id: tourId,
      code,
      request_number: code,
      request_date: requestDate,
      request_type: PAYMENTS_LABELS.從報價單自動生成,
      amount: 0,
      status: 'pending' as const,
      note: PAYMENTS_LABELS.從報價單自動生成,
    }

    return await this.create(requestData)
  }

  // ========== Query 方法 ==========

  /**
   * 取得待處理請款單
   */
  async getPendingRequests(): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /**
   * 取得已出帳請款單
   */
  async getBilledRequests(): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('status', 'billed')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /**
   * 按旅遊團取得請款單
   */
  async getRequestsByTour(tourId: string): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /**
   * 按訂單取得請款單
   */
  async getRequestsByOrder(orderId: string): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /**
   * ✅ 標記為已出帳
   */
  async markAsBilled(requestId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    if (request.status === 'billed') {
      throw new Error(PAYMENTS_LABELS.此請款單已出帳)
    }

    const now = this.now()

    await this.update(requestId, {
      status: 'billed',
      updated_at: now,
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }
  }

  /**
   * 取消出帳（將狀態改回已確認）
   */
  async cancelBilling(requestId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) {
      throw new Error(`找不到請款單: ${requestId}`)
    }

    if (request.status !== 'billed') {
      throw new Error(PAYMENTS_LABELS.只能取消已出帳的請款單)
    }

    await this.update(requestId, {
      status: 'confirmed',
      updated_at: this.now(),
    })

    // 重算團成本
    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }

    logger.warn(PAYMENTS_LABELS.出帳已取消, { requestId })
  }
}

export const paymentRequestService = new PaymentRequestService()
