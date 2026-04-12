import { formatDate } from '@/lib/utils/format-date'
import { BaseService, StoreOperations } from '@/core/services/base.service'
import { Tour } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { ValidationError } from '@/core/errors/app-errors'
import { generateTourCode as generateTourCodeUtil } from '@/stores/utils/code-generator'
import { getCurrentWorkspaceCode } from '@/lib/workspace-helpers'
// workspace_id is now auto-set by DB trigger
import { BaseEntity } from '@/core/types/common'
import { supabase } from '@/lib/supabase/client'
import { invalidateTours } from '@/data'
import { useTourStore } from '@/stores'
import { TOUR_SERVICE_LABELS } from '../constants/labels'

class TourService extends BaseService<Tour & BaseEntity> {
  protected resourceName = 'tours'

  // 使用 Store 提供同步讀取，搭配 invalidateTours 確保 SWR 快取同步
  protected getStore = (): StoreOperations<Tour & BaseEntity> => {
    const store = useTourStore.getState()
    return {
      getAll: () => store.items as (Tour & BaseEntity)[],
      getById: (id: string) =>
        store.items.find(t => t.id === id) as (Tour & BaseEntity) | undefined,
      add: async (tour: Tour & BaseEntity) => {
        // Store.create 內部會處理類型轉換，這裡使用 unknown 轉換避免類型差異
        const result = await store.create(tour as unknown as Parameters<typeof store.create>[0])
        await invalidateTours()
        return result as (Tour & BaseEntity) | undefined
      },
      update: async (id: string, data: Partial<Tour & BaseEntity>) => {
        // Store.update 內部會處理類型轉換，這裡使用 unknown 轉換避免類型差異
        await store.update(id, data as unknown as Parameters<typeof store.update>[1])
        await invalidateTours()
      },
      delete: async (id: string) => {
        await store.delete(id)
        await invalidateTours()
      },
    }
  }

  protected validate(data: Partial<Tour & BaseEntity>): void {
    super.validate(data)

    if (data.name && data.name.trim().length < 2) {
      throw new ValidationError('name', TOUR_SERVICE_LABELS.NAME_MIN_LENGTH)
    }

    if (data.max_participants && data.max_participants < 1) {
      throw new ValidationError('max_participants', TOUR_SERVICE_LABELS.MAX_PARTICIPANTS_GT_ZERO)
    }

    if (data.price && data.price < 0) {
      throw new ValidationError('price', TOUR_SERVICE_LABELS.PRICE_NOT_NEGATIVE)
    }

    // 移除過去日期驗證 - 允許建立歷史旅遊團資料
    // if (data.departure_date) {
    //   const depDate = new Date(data.departure_date);
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);
    //   if (depDate < today) {
    //     throw new ValidationError('departure_date', '出發日期不能是過去的時間');
    //   }
    // }

    if (data.return_date && data.departure_date) {
      const depDate = new Date(data.departure_date)
      const retDate = new Date(data.return_date)

      if (retDate < depDate) {
        throw new ValidationError('return_date', TOUR_SERVICE_LABELS.RETURN_BEFORE_DEPARTURE)
      }
    }
  }

  // 檢查團號是否已存在（直接查 DB，避免快取不一致）
  async isTourCodeExists(code: string): Promise<boolean> {
    const { count } = await supabase
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
    return (count ?? 0) > 0
  }

  /**
   * 生成團號
   * @param cityCode - 3碼城市代號 (如: CNX, BKK, OSA)
   * @param date - 出發日期
   * @param isSpecial - 是否為特殊團（目前未使用）
   * @returns 團號 (格式: CNX250128A)
   */
  async generateTourCode(
    cityCode: string,
    date: Date,
    isSpecial: boolean = false
  ): Promise<string> {
    // 取得當前 workspace code (用於向後相容，新格式不需要)
    const workspaceCode = getCurrentWorkspaceCode()
    if (!workspaceCode) {
      throw new Error(TOUR_SERVICE_LABELS.CANNOT_GET_WORKSPACE)
    }

    // 直接從 DB 查同日期同城市的現有團號，避免快取不一致導致重複
    const dateStr = formatDate(date).replace(/-/g, '').slice(2) // YYMMDD
    const prefix = `${cityCode.toUpperCase()}${dateStr}`
    const { data: existingTours } = await supabase
      .from('tours')
      .select('code')
      .like('code', `${prefix}%`)

    // 使用統一的 code generator
    const code = generateTourCodeUtil(
      workspaceCode,
      cityCode.toUpperCase(),
      date.toISOString(),
      existingTours || []
    )

    // 雙重檢查：確保生成的團號不存在
    const exists = await this.isTourCodeExists(code)
    if (exists) {
      const lastChar = code.slice(-1)
      const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1)
      return `${prefix}${nextChar}`
    }

    return code
  }

  // 檢查團體是否可以取消
  async canCancelTour(tour_id: string): Promise<{ canCancel: boolean; reason?: string }> {
    const tour = await this.getById(tour_id)
    if (!tour) {
      return { canCancel: false, reason: TOUR_SERVICE_LABELS.TOUR_NOT_FOUND }
    }

    // Tour 狀態檢查
    if (tour.status === TOUR_SERVICE_LABELS.STATUS_CLOSED) {
      return { canCancel: false, reason: TOUR_SERVICE_LABELS.TOUR_ALREADY_CLOSED }
    }

    const departure_date = new Date(tour.departure_date || '')
    const now = new Date()
    const daysDiff = Math.ceil((departure_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 3) {
      return { canCancel: false, reason: TOUR_SERVICE_LABELS.CANNOT_CANCEL_WITHIN_3_DAYS }
    }

    return { canCancel: true }
  }

  /**
   * 封存旅遊團相關頻道
   * 當旅遊團結案或取消時，自動封存其相關頻道
   */
  private async archiveTourChannel(tourId: string): Promise<void> {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('channels')
        .update({
          is_archived: true,
          archived_at: now,
          updated_at: now,
        })
        .eq('tour_id', tourId)

      if (error) {
        logger.warn(`封存旅遊團 ${tourId} 頻道失敗:`, error)
      } else {
        logger.log(`旅遊團 ${tourId} 頻道已封存`)
      }
    } catch (error) {
      // 封存頻道失敗不應阻止狀態更新
      logger.warn('封存頻道時發生錯誤:', error)
    }
  }

  // 更新團體狀態
  async updateTourStatus(tour_id: string, newStatus: Tour['status']): Promise<Tour> {
    const tour = await this.getById(tour_id)
    if (!tour) {
      throw new Error('Tour not found')
    }

    const currentStatus = tour.status

    // If the status is not changing, do nothing.
    if (currentStatus === newStatus) {
      return tour
    }

    // 簡化版狀態轉換邏輯
    // 提案 → 進行中 → 結案
    //          ↓
    //    (解鎖回提案)
    const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
      // 英文狀態值（新規範）
      proposed: ['draft', 'cancelled'],
      draft: ['published', 'cancelled'],
      published: ['departed', 'cancelled', 'draft'],
      departed: ['completed'],
      completed: ['archived'],
      cancelled: ['draft'],
      archived: [],
      // 相容舊中文狀態值
      [TOUR_SERVICE_LABELS.STATUS_PROPOSAL]: [
        TOUR_SERVICE_LABELS.STATUS_ACTIVE,
        TOUR_SERVICE_LABELS.STATUS_CANCELLED,
        'draft',
        'cancelled',
      ],
      [TOUR_SERVICE_LABELS.STATUS_ACTIVE]: [
        TOUR_SERVICE_LABELS.STATUS_CLOSED,
        TOUR_SERVICE_LABELS.STATUS_CANCELLED,
        TOUR_SERVICE_LABELS.STATUS_PROPOSAL,
        'completed',
        'cancelled',
      ],
      [TOUR_SERVICE_LABELS.STATUS_CLOSED]: [],
      [TOUR_SERVICE_LABELS.STATUS_CANCELLED]: [],
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus || ''] || []
    if (!newStatus || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        'status',
        TOUR_SERVICE_LABELS.INVALID_STATUS_TRANSITION(currentStatus || '', newStatus || '')
      )
    }

    const result = await this.update(tour_id, {
      status: newStatus,
      // 可以在這裡記錄狀態變更的原因和時間
      updated_at: this.now(),
    })

    // 當旅遊團結案或取消時，自動封存相關頻道
    if (
      newStatus === TOUR_SERVICE_LABELS.STATUS_CLOSED ||
      newStatus === TOUR_SERVICE_LABELS.STATUS_CANCELLED
    ) {
      await this.archiveTourChannel(tour_id)
    }

    return result
  }

  /**
   * 建立 ad-hoc 旅遊團 — 用於散客情境（如散客辦簽證、買網卡）
   * 出發日 = 今天，名稱依類型 + 客戶名自動產生
   * @param serviceType 團服務類型（visa / esim / flight 等）
   * @param customerName 客戶名稱（會放入團名稱）
   */
  async createAdHocTour(
    serviceType: 'visa' | 'esim' | 'flight' | 'flight_hotel' | 'hotel' | 'car_service',
    customerName?: string
  ): Promise<Tour> {
    const today = new Date()
    const dateStr = formatDate(today)
    const yymmdd = dateStr.replace(/-/g, '').slice(2)

    // 產生唯一團號 — 例如 V260412A001
    const prefixMap: Record<string, string> = {
      visa: 'V',
      esim: 'E',
      flight: 'F',
      flight_hotel: 'FH',
      hotel: 'H',
      car_service: 'C',
    }
    const prefix = prefixMap[serviceType] || 'X'
    const random = Math.random().toString(36).slice(2, 5).toUpperCase()
    const code = `${prefix}${yymmdd}${random}`

    const labelMap: Record<string, string> = {
      visa: '簽證',
      esim: '網卡',
      flight: '機票',
      flight_hotel: '機加酒',
      hotel: '訂房',
      car_service: '派車',
    }
    const typeLabel = labelMap[serviceType] || serviceType
    const name = customerName ? `${customerName} ${typeLabel}` : `${typeLabel} ${dateStr}`

    const adHocTour: Partial<Tour> = {
      code,
      name,
      departure_date: dateStr,
      return_date: dateStr,
      status: '待出發',
      tour_service_type: serviceType,
      max_participants: 99,
      contract_status: 'pending',
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
      created_at: this.now(),
      updated_at: this.now(),
    }

    return await this.create(adHocTour as unknown as Tour & BaseEntity)
  }
}

export const tourService = new TourService()
