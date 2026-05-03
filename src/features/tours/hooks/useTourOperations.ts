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
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import {
  checkTourDependencies,
  deleteTourEmptyOrders,
  deleteTourConfigurationData,
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
  /** 建立成功 callback：傳則抑制預設 router.push、由呼叫端決定下一步（給 todo dialog 等嵌套場景用） */
  onCreated?: (tour: { id: string; code: string }) => void
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
    onCreated,
  } = params

  const handleAddTour = useCallback(
    async (newTour: NewTourData, newOrder: Partial<OrderFormData>, fromQuoteId?: string) => {
      const isProposalOrTemplate =
        newTour.status === TOUR_STATUS.PROPOSAL || newTour.status === TOUR_STATUS.TEMPLATE

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
          const prefix = newTour.status === TOUR_STATUS.PROPOSAL ? 'PROP' : 'TMPL'
          code = `${prefix}-${Date.now().toString(36).toUpperCase()}`
        } else {
          // 正式團：驗證城市代碼（團號需要 3 碼英文城市代碼）
          if (!cityCode || cityCode.length < 2) {
            setFormError(TOUR_OPERATIONS_LABELS.SELECT_CITY_OR_SET_AIRPORT)
            setSubmitting(false)
            return
          }
          const departure_date = new Date(newTour.departure_date)
          code = await tourService.generateTourCode(
            cityCode,
            departure_date,
            newTour.isSpecial
          )
        }

        // 🔧 核心表架構：直接使用前端傳來的 countryId，不查詢
        let countryId: string | undefined
        if (newTour.countryCode === '__custom__') {
          countryId = undefined // 自訂國家不設 country_id
        } else {
          countryId = newTour.countryId // ✅ 直接使用
        }

        // 建新團：status 就是真相（正式團預設 upcoming、提案/模板按使用者選擇）
        const defaultStatus = isProposalOrTemplate ? newTour.status : TOUR_STATUS.UPCOMING
        const tourData = {
          name: newTour.name,
          days_count: isProposalOrTemplate ? newTour.days_count || null : null,
          // SSOT：location 是已廢棄欄位，新團不寫入；目的地由 country_id + airport_code 衍生
          country_id: countryId,
          airport_code: cityCode || undefined,
          departure_date: isProposalOrTemplate ? null : newTour.departure_date,
          return_date: isProposalOrTemplate ? null : newTour.return_date,
          status: defaultStatus,
          price: newTour.price,
          max_participants: newTour.max_participants,
          code,
          contract_status: 'pending' as const,
          total_revenue: 0,
          total_cost: 0,
          profit: 0,
          current_participants: 0,
          enable_checkin: isProposalOrTemplate ? false : newTour.enable_checkin || false,
          controller_id: isProposalOrTemplate ? undefined : newTour.controller_id || undefined,
          // SSOT：航班屬於旅遊團「行程編輯」分頁，開團時不寫入 outbound_flight / return_flight
          workspace_id: workspaceId,
          tour_service_type: newTour.tour_service_type || 'tour_group',
        }

        // 建團：如果團號重複（23505），自動跳下一個字母重試
        let createdTour: Awaited<ReturnType<typeof actions.create>>
        let retries = 0
        while (true) {
          try {
            createdTour = await actions.create(tourData)
            break
          } catch (err: unknown) {
            const isDuplicate =
              err instanceof Error &&
              (err.message?.includes('23505') || err.message?.includes('duplicate'))
            if (isDuplicate && retries < 5 && tourData.code) {
              retries++
              const lastChar = tourData.code.slice(-1)
              const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1)
              tourData.code = tourData.code.slice(0, -1) + nextChar
              logger.info(`團號重複，自動跳至 ${tourData.code}`)
              continue
            }
            throw err
          }
        }

        // 寫入動態選人欄位指派（field_id → employee_id）
        if (newTour.role_assignments && !isProposalOrTemplate) {
          const assignments = Object.entries(newTour.role_assignments)
            .filter(([, employeeId]) => employeeId)
            .map(([fieldId, employeeId]) => ({
              tour_id: createdTour.id,
              field_id: fieldId,
              employee_id: employeeId,
            }))
          if (assignments.length > 0) {
            await supabase.from('tour_role_assignments').insert(assignments as never[])
          }
        }

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

          // 內部聊天頻道已於 2026-05-02 整套刪除（William 拍板）、tour 不再自動建頻道
        }

        resetForm()
        closeDialog()

        // onCreated callback 優先（嵌套場景如 todo dialog 用、抑制預設導航）
        if (onCreated) {
          onCreated({ id: createdTour.id, code })
        } else if (!isProposalOrTemplate) {
          // 提案/模板建立後不導航（留在列表頁），正式團跳轉到詳情頁
          router.push(`/tours/${code}`)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : TOUR_OPERATIONS_LABELS.CREATE_TOUR_FAILED
        setFormError(errorMessage)
        logger.error(
          'Failed to create tour:',
          err,
          JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : Object(err)))
        )
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

        // 清理關聯資料（channels 已於 cleanup 砍除）
        await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
        await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)

        // 斷開報價單和行程表連結
        await unlinkTourQuotes(tour.id)
        await unlinkTourItineraries(tour.id)

        // 清除 16 張配置類子表（Wave 6 Batch 2 改 RESTRICT 後必須顯式清）
        await deleteTourConfigurationData(tour.id)

        // 刪除空訂單
        await deleteTourEmptyOrders(tour.id)

        // 真刪除旅遊團
        const { error: deleteError } = await supabase.from('tours').delete().eq('id', tour.id)

        if (deleteError) {
          throw deleteError
        }

        logger.info(`已刪除旅遊團 ${tour.code}`)
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

        // channel_chat_system 已於 cleanup 砍除、不再同步頻道封存
        logger.info(tour.archived ? '已解除封存旅遊團' : `已封存旅遊團，原因：${reason}`)
      } catch (err) {
        logger.error('封存/解封旅遊團失敗:', err)
      }
    },
    [actions]
  )

  /**
   * handleConvertToOfficial - 將提案/模板轉為正式團
   * - 提案：直接更新 status='upcoming'，填入日期，產生團號
   * - 模板：複製一份新團 status='upcoming'（模板保留）
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

        if (tour.status === TOUR_STATUS.PROPOSAL) {
          // 提案 → 直接更新
          await actions.update(tour.id, {
            departure_date,
            return_date,
            code,
            status: TOUR_STATUS.UPCOMING,
          } as Partial<Tour>)
        } else {
          // 模板 → 複製一份新團（用 unknown 繞過嚴格型別，實際欄位由 Supabase 驗證）
          const newTourData = {
            name: tour.name,
            // SSOT：location 是已廢棄的舊欄位，新團不再寫入
            country_id: tour.country_id || null,
            airport_code: tour.airport_code || null,
            departure_date,
            return_date,
            code,
            status: TOUR_STATUS.UPCOMING,
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

        // 內部聊天頻道已於 2026-05-02 整套刪除（William 拍板）、轉開團不再自動建頻道

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
