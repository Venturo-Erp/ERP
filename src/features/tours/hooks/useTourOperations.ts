'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tour } from '@/stores/types'
import { tourService } from '@/features/tours/services/tour.service'
import { logger } from '@/lib/utils/logger'
import { NewTourData } from '../types'
import { OrderFormData } from '@/features/orders/components/add-order-form'
import type { CreateInput, UpdateInput } from '@/stores/core/types'
import { updateCountry, updateCity, updateQuote } from '@/data'
import { createOrder } from '@/data/entities/orders'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { TOUR_OPERATIONS_LABELS } from '../constants/labels'
import {
  checkTourDependencies,
  checkTourPaidOrders,
  deleteTourEmptyOrders,
  unlinkTourQuotes,
  unlinkTourItineraries,
} from '@/features/tours/services/tour_dependency.service'

interface TourActions {
  create: (data: CreateInput<Tour>) => Promise<Tour>
  update: (id: string, data: UpdateInput<Tour>) => Promise<Tour>
  delete: (id: string) => Promise<boolean | void>
}

// 🔧 優化：移除不必要的外部依賴，改成內部直接查詢
// 🔧 編輯模式已移至 TourEditDialog + useTourEdit hook
interface UseTourOperationsParams {
  actions: TourActions
  resetForm: () => void
  closeDialog: () => void
  setSubmitting: (value: boolean) => void
  setFormError: (error: string | null) => void
  workspaceId?: string
  // 🔧 保留 fromQuoteId 更新功能（可選）
  onQuoteLinked?: (quoteId: string, tourId: string) => void
}

export function useTourOperations(params: UseTourOperationsParams) {
  const router = useRouter()
  // 🔧 核心表架構：直接用 entity update，不需要 find
  const incrementCountryUsage = async (countryId: string) => {
    if (!countryId) return
    try {
      // 用 supabase 原子操作取得 + 更新
      const { data } = await supabase
        .from('countries')
        .select('usage_count')
        .eq('id', countryId)
        .single()
      await updateCountry(countryId, { usage_count: ((data?.usage_count as number) || 0) + 1 })
    } catch {
      // 非關鍵操作，靜默處理
    }
  }

  const incrementCityUsage = async (cityName: string) => {
    if (!cityName) return
    try {
      const { data } = await supabase
        .from('cities')
        .select('id, usage_count')
        .eq('name', cityName)
        .single()
      if (data) {
        await updateCity(data.id, { usage_count: ((data.usage_count as number) || 0) + 1 })
      }
    } catch {
      // 非關鍵操作，靜默處理
    }
  }

  const {
    actions,
    resetForm,
    closeDialog,
    setSubmitting,
    setFormError,
    workspaceId,
    onQuoteLinked,
  } = params

  const handleAddTour = useCallback(
    async (newTour: NewTourData, newOrder: Partial<OrderFormData>, fromQuoteId?: string) => {
      const isProposalOrTemplate =
        newTour.tour_type === 'proposal' || newTour.tour_type === 'template'

      // 提案/模板只需要名稱，正式團需要日期
      if (!isProposalOrTemplate) {
        // Zod schema 驗證必填欄位
        const { createTourSchema } = await import('@/lib/validations/schemas')
        const validation = createTourSchema.safeParse({
          name: newTour.name.trim(),
          departure_date: newTour.departure_date,
          return_date: newTour.return_date,
        })
        if (!validation.success) {
          setFormError(validation.error.issues[0].message)
          return
        }
      } else {
        if (!newTour.name.trim()) {
          setFormError('請輸入名稱')
          return
        }
      }

      // Check custom destination (正式團 and 有填自訂國家時)
      if (newTour.countryCode === '__custom__') {
        if (!newTour.customCountry?.trim()) {
          alert(TOUR_OPERATIONS_LABELS.FILL_COUNTRY_NAME)
          return
        }
        if (!newTour.customLocation?.trim()) {
          alert(TOUR_OPERATIONS_LABELS.FILL_CITY_NAME)
          return
        }
        if (!newTour.customCityCode?.trim()) {
          alert(TOUR_OPERATIONS_LABELS.FILL_CITY_CODE)
          return
        }
        if (newTour.customCityCode.length !== 3) {
          alert(TOUR_OPERATIONS_LABELS.CITY_CODE_3_CHARS)
          return
        }
      }

      try {
        setSubmitting(true)
        setFormError(null)

        // Determine city code and name
        const cityCode =
          newTour.countryCode === '__custom__' ? newTour.customCityCode! : newTour.cityCode
        const cityName =
          newTour.countryCode === '__custom__'
            ? newTour.customLocation!
            : newTour.cityName || newTour.cityCode

        let code: string

        if (isProposalOrTemplate) {
          // 提案/模板：用 DRAFT- 前綴的臨時編號
          const prefix = newTour.tour_type === 'proposal' ? 'PROP' : 'TMPL'
          code = `${prefix}-${Date.now().toString(36).toUpperCase()}`
        } else {
          // 正式團：驗證城市代碼（團號需要 3 碼英文城市代碼）
          if (!cityCode || cityCode.length < 2) {
            setFormError(TOUR_OPERATIONS_LABELS.SELECT_CITY_OR_SET_AIRPORT)
            setSubmitting(false)
            return
          }
          const departure_date = new Date(newTour.departure_date)
          code = await tourService.generateTourCode(cityCode, departure_date, newTour.isSpecial)
        }

        // 解析航班文字為 FlightInfo（簡單格式：航空公司 班次 時間）
        const parseFlightText = (text?: string): import('@/stores/types').FlightInfo | null => {
          if (!text?.trim()) return null
          // 存儲原始文字到 flightNumber，其他欄位留空讓用戶在行程表中填寫
          return {
            airline: '',
            flightNumber: text.trim(),
            departureAirport: '',
            departureTime: '',
            arrivalAirport: '',
            arrivalTime: '',
          }
        }

        // 🔧 核心表架構：直接使用前端傳來的 countryId，不查詢
        let countryId: string | undefined
        if (newTour.countryCode === '__custom__') {
          countryId = undefined // 自訂國家不設 country_id
        } else {
          countryId = newTour.countryId // ✅ 直接使用
        }

        const tourData = {
          name: newTour.name,
          tour_type: newTour.tour_type || 'official',
          days_count: isProposalOrTemplate ? newTour.days_count || null : null,
          location: cityName || '',
          country_id: countryId,
          airport_code: cityCode || undefined,
          departure_date: isProposalOrTemplate ? null : newTour.departure_date,
          return_date: isProposalOrTemplate ? null : newTour.return_date,
          status: newTour.status,
          price: newTour.price,
          max_participants: newTour.max_participants,
          code,
          contract_status: 'pending' as const,
          total_revenue: 0,
          total_cost: 0,
          profit: 0,
          current_participants: 0,
          quote_id: fromQuoteId || undefined,
          enable_checkin: isProposalOrTemplate ? false : newTour.enable_checkin || false,
          controller_id: isProposalOrTemplate ? undefined : newTour.controller_id || undefined,
          outbound_flight: isProposalOrTemplate
            ? undefined
            : parseFlightText(newTour.outbound_flight_text),
          return_flight: isProposalOrTemplate
            ? undefined
            : parseFlightText(newTour.return_flight_text),
          workspace_id: workspaceId,
        }

        const createdTour = await actions.create(tourData)

        // 🔧 核心表架構：直接用 id 更新 usage_count
        if (countryId) {
          incrementCountryUsage(countryId)
        }
        if (cityName) {
          incrementCityUsage(cityName)
        }

        // 提案/模板不需要建立訂單和連結報價單
        if (!isProposalOrTemplate) {
          // If contact person is filled, also add order (業務必填)
          if (newOrder.contact_person?.trim() && newOrder.sales_person?.trim()) {
            // 🔧 優化：直接用 supabase insert，不依賴外部 hook
            const order_number = `${code}-O01`
            const memberCount = newOrder.member_count || 1
            const totalAmount = newOrder.total_amount || newTour.price * memberCount
            try {
              await createOrder({
                order_number,
                tour_id: createdTour.id,
                tour_name: newTour.name,
                contact_person: newOrder.contact_person,
                sales_person: newOrder.sales_person || '',
                assistant: newOrder.assistant || '',
                member_count: memberCount,
                payment_status: 'unpaid',
                total_amount: totalAmount,
                paid_amount: 0,
                remaining_amount: totalAmount,
                code,
                workspace_id: workspaceId,
              } as Parameters<typeof createOrder>[0])
            } catch (orderErr) {
              logger.warn('建立訂單失敗:', (orderErr as Error).message)
            }
          }

          // If created from quote, update quote's tourId
          if (fromQuoteId) {
            // 🔧 優化：直接用 supabase update
            try {
              await updateQuote(fromQuoteId, { tour_id: createdTour.id } as Parameters<
                typeof updateQuote
              >[1])
            } catch (quoteError) {
              logger.warn(
                '更新報價單失敗:',
                quoteError instanceof Error ? quoteError.message : quoteError
              )
            }
            onQuoteLinked?.(fromQuoteId, createdTour.id)
          }

          // 🔧 自動建立頻道（正式團才建立）
          const { useAuthStore } = await import('@/stores/auth-store')
          const user = useAuthStore.getState().user
          if (user && createdTour.workspace_id) {
            const { createTourChannel } = await import('../services/tour-channel.service')
            createTourChannel(createdTour as unknown as Tour, user.id)
              .then(result => {
                if (result.success) {
                  logger.log(`[useTourOperations] 已為 ${createdTour.code} 建立頻道`)
                } else {
                  logger.warn(`[useTourOperations] 建立頻道失敗: ${result.error}`)
                }
              })
              .catch(error => {
                logger.error('[useTourOperations] 建立頻道時發生錯誤:', error)
              })
          }
        }

        resetForm()
        closeDialog()

        // 提案/模板建立後不導航（留在列表頁），正式團跳轉到詳情頁
        if (!isProposalOrTemplate) {
          router.push(`/tours/${code}`)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : TOUR_OPERATIONS_LABELS.CREATE_TOUR_FAILED
        setFormError(errorMessage)
        logger.error('Failed to create tour:', err)
      } finally {
        setSubmitting(false)
      }
    },
    [
      actions,
      resetForm,
      closeDialog,
      setSubmitting,
      setFormError,
      router,
      incrementCountryUsage,
      incrementCityUsage,
      workspaceId,
      onQuoteLinked,
    ]
  )

  const handleDeleteTour = useCallback(
    async (tour: Tour | null): Promise<{ success: boolean; error?: string }> => {
      if (!tour) return { success: false, error: TOUR_OPERATIONS_LABELS.INVALID_TOUR }

      try {
        // 檢查是否有關聯資料（團員、收款單、請款單、PNR 不能刪）
        const { blockers, hasBlockers } = await checkTourDependencies(tour.id)

        if (hasBlockers) {
          const errorMsg = TOUR_OPERATIONS_LABELS.CANNOT_DELETE_HAS_DEPS(blockers.join('、'))
          logger.warn(`刪除旅遊團 ${tour.code} 失敗：${errorMsg}`)
          return { success: false, error: errorMsg }
        }

        // 檢查是否有已付款訂單
        const { hasPaidOrders, count: paidCount } = await checkTourPaidOrders(tour.id)
        if (hasPaidOrders) {
          return {
            success: false,
            error: TOUR_OPERATIONS_LABELS.CANNOT_DELETE_PAID_ORDERS(paidCount),
          }
        }

        // 刪除關聯的行事曆事件
        const { error: deleteEventsError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('related_tour_id', tour.id)

        if (deleteEventsError) {
          logger.warn(`刪除旅遊團 ${tour.code} 的行事曆事件失敗:`, deleteEventsError)
        } else {
          logger.info(`已刪除旅遊團 ${tour.code} 的行事曆事件`)
        }

        // 軟刪除：只標記為已刪除，不真正刪除資料
        const { error: softDeleteError } = await supabase
          .from('tours')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          } as any) // TODO: 重新生成型別後移除 as any
          .eq('id', tour.id)

        if (softDeleteError) {
          throw softDeleteError
        }

        logger.info(`已軟刪除旅遊團 ${tour.code}`)
        return { success: true }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : TOUR_OPERATIONS_LABELS.DELETE_TOUR_FAILED
        logger.error('刪除旅遊團失敗:', JSON.stringify(err, null, 2))
        return { success: false, error: errorMsg }
      }
    },
    [actions]
  )

  const handleArchiveTour = useCallback(
    async (tour: Tour, reason?: string) => {
      try {
        // 封存時斷開連結，解除封存不需要
        if (!tour.archived) {
          const linkedQuotesCount = await unlinkTourQuotes(tour.id)
          const linkedItinerariesCount = await unlinkTourItineraries(tour.id)
          logger.info(
            `封存旅遊團 ${tour.code}，斷開 ${linkedQuotesCount} 個報價單和 ${linkedItinerariesCount} 個行程表的連結`
          )
        }

        // 封存時記錄原因，解除封存時清除原因
        await actions.update(tour.id, {
          archived: !tour.archived,
          archive_reason: tour.archived ? null : reason,
        } as Partial<Tour>)
        logger.info(tour.archived ? '已解除封存旅遊團' : `已封存旅遊團，原因：${reason}`)
      } catch (err) {
        logger.error('封存/解封旅遊團失敗:', err)
      }
    },
    [actions]
  )

  /**
   * handleConvertToOfficial - 將提案/模板轉為正式團
   * - 提案：直接更新 tour_type='official'，填入日期，產生團號
   * - 模板：複製一份新團，tour_type='official'，填入日期，產生團號（模板保留）
   */
  const handleConvertToOfficial = useCallback(
    async (
      tour: Tour,
      departure_date: string,
      return_date: string,
      orderData?: {
        contact_person?: string
        sales_person?: string
        assistant?: string
        member_count?: number
        total_amount?: number
      }
    ) => {
      try {
        // Determine city code from existing location or code
        const cityCode = tour.code?.slice(0, 3) || 'TYO'
        const departureDate = new Date(departure_date)
        const code = await tourService.generateTourCode(cityCode, departureDate, false)

        let tourId = tour.id

        if (tour.tour_type === 'proposal') {
          // 提案 → 直接更新
          await actions.update(tour.id, {
            tour_type: 'official',
            departure_date,
            return_date,
            code,
            status: '待出發',
          } as Partial<Tour>)
        } else {
          // 模板 → 複製一份新團（用 unknown 繞過嚴格型別，實際欄位由 Supabase 驗證）
          const newTourData = {
            name: tour.name,
            location: tour.location || '',
            country_id: tour.country_id || null,  // ✅ 保留國家
            airport_code: tour.airport_code || null,  // ✅ 保留機場代碼
            tour_type: 'official' as const,
            departure_date,
            return_date,
            code,
            status: '待出發' as const,
            contract_status: 'pending' as const,
            price: tour.price || 0,
            max_participants: tour.max_participants || 20,
            total_revenue: 0,
            total_cost: 0,
            profit: 0,
            current_participants: 0,
            description: tour.description,
            days_count: tour.days_count,
            workspace_id: workspaceId,
          }
          const createdTour = await (actions.create as (data: unknown) => Promise<Tour>)(
            newTourData
          )
          tourId = createdTour.id
        }

        // 有填訂單資料就建立訂單
        if (orderData?.contact_person?.trim() && orderData?.sales_person?.trim()) {
          const orderNumber = `${code}-O01`
          const memberCount = orderData.member_count || 1
          const totalAmount = orderData.total_amount || (tour.price || 0) * memberCount
          try {
            await createOrder({
              order_number: orderNumber,
              tour_id: tourId,
              tour_name: tour.name,
              contact_person: orderData.contact_person,
              sales_person: orderData.sales_person,
              assistant: orderData.assistant || '',
              member_count: memberCount,
              payment_status: 'unpaid',
              total_amount: totalAmount,
              paid_amount: 0,
              remaining_amount: totalAmount,
              code,
              workspace_id: workspaceId,
            } as Parameters<typeof createOrder>[0])
          } catch (orderErr) {
            logger.warn('轉開團建立訂單失敗:', (orderErr as Error).message)
          }
        }

        // 導航到新團號
        router.push(`/tours/${code}`)
      } catch (err) {
        logger.error('轉開團失敗:', err)
        throw err
      }
    },
    [actions, router, workspaceId]
  )

  return {
    handleAddTour,
    handleDeleteTour,
    handleArchiveTour,
    handleConvertToOfficial,
  }
}
