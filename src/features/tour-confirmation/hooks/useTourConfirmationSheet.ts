'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Json, Database } from '@/lib/supabase/types'
import type {
  TourConfirmationSheet,
  TourConfirmationItem,
  GroupedConfirmationItems,
  CostSummary,
  CreateConfirmationItem,
  UpdateConfirmationItem,
  ConfirmationItemCategory,
} from '@/types/tour-confirmation-sheet.types'
import {
  syncConfirmationCreateToCore,
  syncConfirmationUpdateToCore,
  syncLeaderExpenseToCore,
} from '@/features/tour-confirmation/services/confirmationCoreTableSync'

// 資料庫表類型 (用於 Supabase 操作)
type DbConfirmationItem = Database['public']['Tables']['tour_confirmation_items']['Insert']

interface UseTourConfirmationSheetProps {
  tourId: string
}

export function useTourConfirmationSheet({ tourId }: UseTourConfirmationSheetProps) {
  const [sheet, setSheet] = useState<TourConfirmationSheet | null>(null)
  const [items, setItems] = useState<TourConfirmationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入確認表
  const loadSheet = useCallback(async () => {
    if (!tourId) return

    setLoading(true)
    setError(null)

    try {
      // 先找現有的確認表
      const { data: existingSheet, error: sheetError } = await supabase
        .from('tour_confirmation_sheets')
        .select(
          'id, tour_id, tour_code, tour_name, status, pax, departure_date, return_date, tour_leader_name, sales_person, notes, workspace_id, created_at, created_by, updated_at'
        )
        .eq('tour_id', tourId)
        .maybeSingle()

      if (sheetError) throw sheetError

      if (existingSheet) {
        setSheet(existingSheet as TourConfirmationSheet)

        // 載入明細
        const { data: itemsData, error: itemsError } = await supabase
          .from('tour_confirmation_items')
          .select(
            'id, sheet_id, title, category, supplier_name, service_date, day_label, expected_cost, actual_cost, booking_status, notes, sort_order, workspace_id, created_at, updated_at'
          )
          .eq('sheet_id', existingSheet.id)
          .order('category')
          .order('service_date')
          .order('sort_order')
          .limit(500)

        if (itemsError) throw itemsError
        setItems((itemsData || []) as TourConfirmationItem[])
      } else {
        setSheet(null)
        setItems([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗'
      logger.error('載入出團確認表失敗:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tourId])

  // 初始載入
  useEffect(() => {
    loadSheet()
  }, [loadSheet])

  // 建立新的確認表
  const createSheet = useCallback(
    async (tourData: {
      tour_code: string
      tour_name: string
      departure_date?: string
      return_date?: string
      workspace_id: string
    }) => {
      setSaving(true)
      try {
        const { data, error } = await supabase
          .from('tour_confirmation_sheets')
          .insert({
            tour_id: tourId,
            tour_code: tourData.tour_code,
            tour_name: tourData.tour_name,
            departure_date: tourData.departure_date,
            return_date: tourData.return_date,
            workspace_id: tourData.workspace_id,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error
        setSheet(data as TourConfirmationSheet)
        return data as TourConfirmationSheet
      } catch (err) {
        const message = err instanceof Error ? err.message : '建立失敗'
        logger.error('建立出團確認表失敗:', err)
        setError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [tourId]
  )

  // 檢查是否已交接（鎖定狀態）
  const isLocked = useCallback(() => {
    return sheet?.status === 'confirmed'
  }, [sheet])

  // 更新確認表
  const updateSheet = useCallback(
    async (updates: Partial<TourConfirmationSheet>) => {
      if (!sheet) return

      // 🔒 後端鎖定：已交接的確認單禁止修改（除非是更新狀態本身）
      if (isLocked() && !('status' in updates)) {
        throw new Error('此確認單已交接，無法修改')
      }

      setSaving(true)
      try {
        const updatePayload: Record<string, unknown> = {
          ...updates,
          updated_at: new Date().toISOString(),
        }
        const { data, error } = await supabase
          .from('tour_confirmation_sheets')
          .update(updatePayload)
          .eq('id', sheet.id)
          .select()
          .single()

        if (error) throw error
        setSheet(data as TourConfirmationSheet)
        return data as TourConfirmationSheet
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新失敗'
        logger.error('更新出團確認表失敗:', err)
        setError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [sheet, isLocked]
  )

  // 新增明細項目
  const addItem = useCallback(
    async (item: CreateConfirmationItem) => {
      if (!sheet) return

      // 🔒 後端鎖定：已交接的確認單禁止新增
      if (isLocked()) {
        throw new Error('此確認單已交接，無法新增項目')
      }

      setSaving(true)
      try {
        // 準備插入資料，確保必填欄位
        const insertData: DbConfirmationItem = {
          sheet_id: sheet.id,
          category: item.category,
          service_date: item.service_date,
          supplier_name: item.supplier_name,
          title: item.title,
          currency: item.currency || 'TWD',
          booking_status: item.booking_status || 'pending',
          sort_order: item.sort_order || 0,
          // 可選欄位
          service_date_end: item.service_date_end,
          day_label: item.day_label,
          supplier_id: item.supplier_id,
          description: item.description,
          unit_price: item.unit_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          expected_cost: item.expected_cost,
          actual_cost: item.actual_cost,
          contact_info: item.contact_info as Json | null,
          booking_reference: item.booking_reference,
          type_data: item.type_data as Json | null,
          notes: item.notes,
          // 關聯需求單
          request_id: item.request_id,
          // 資源關聯（餐廳/飯店/景點）
          resource_type: item.resource_type,
          resource_id: item.resource_id,
          // GPS 資訊（供領隊導航）
          latitude: item.latitude,
          longitude: item.longitude,
          google_maps_url: item.google_maps_url,
          // 核心表關聯
          itinerary_item_id: item.itinerary_item_id,
          // 領隊記帳欄位
          leader_expense: item.leader_expense,
          leader_expense_note: item.leader_expense_note,
          leader_expense_at: item.leader_expense_at,
          receipt_images: item.receipt_images,
        }

        const { data, error } = await supabase
          .from('tour_confirmation_items')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error

        const new_item = data as TourConfirmationItem

        // 同步核心表
        if (item.itinerary_item_id) {
          syncConfirmationCreateToCore({
            confirmation_item_id: new_item.id,
            itinerary_item_id: item.itinerary_item_id,
            booking_status: item.booking_status,
          }).catch(err => logger.error('Core table sync failed on add:', err))
        }

        setItems(prev => [...prev, new_item])
        globalMutate(
          (key: string) =>
            typeof key === 'string' && key.startsWith('entity:tour_confirmation_items'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:tour_confirmation_items')
        return new_item
      } catch (err) {
        const message = err instanceof Error ? err.message : '新增失敗'
        logger.error('新增明細失敗:', err)
        setError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [sheet, isLocked]
  )

  // 更新明細項目
  const updateItem = useCallback(
    async (itemId: string, updates: UpdateConfirmationItem) => {
      // 🔒 後端鎖定：已交接的確認單只允許更新領隊記帳欄位
      if (isLocked()) {
        const allowedFields = [
          'leader_expense',
          'leader_expense_note',
          'leader_expense_at',
          'receipt_images',
          'actual_cost',
        ]
        const updateKeys = Object.keys(updates)
        const hasDisallowedField = updateKeys.some(key => !allowedFields.includes(key))
        if (hasDisallowedField) {
          throw new Error('此確認單已交接，只能更新記帳相關欄位')
        }
      }

      setSaving(true)
      try {
        // 準備更新資料
        const updateData: Database['public']['Tables']['tour_confirmation_items']['Update'] = {
          ...updates,
          contact_info: updates.contact_info as Json | null | undefined,
          type_data: updates.type_data as Json | null | undefined,
          updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
          .from('tour_confirmation_items')
          .update(updateData)
          .eq('id', itemId)
          .select()
          .single()

        if (error) throw error

        const updated_item = data as TourConfirmationItem

        // 同步核心表
        const existing_item = items.find(i => i.id === itemId)
        const core_item_id = (
          existing_item as TourConfirmationItem & { itinerary_item_id?: string | null }
        )?.itinerary_item_id
        if (core_item_id) {
          // 確認相關欄位
          if (
            updates.booking_status !== undefined ||
            updates.actual_cost !== undefined ||
            updates.booking_reference !== undefined
          ) {
            syncConfirmationUpdateToCore({
              itinerary_item_id: core_item_id,
              booking_status: updates.booking_status,
              confirmed_cost: updates.actual_cost,
              booking_reference: updates.booking_reference,
              confirmation_note: updates.notes,
            }).catch(err => logger.error('Core table sync failed on update:', err))
          }

          // 領隊回填欄位
          if (updates.leader_expense !== undefined) {
            syncLeaderExpenseToCore({
              itinerary_item_id: core_item_id,
              actual_expense: updates.leader_expense ?? null,
              expense_note: updates.leader_expense_note,
              expense_at: updates.leader_expense_at,
              receipt_images: updates.receipt_images,
            }).catch(err => logger.error('Core table leader sync failed:', err))
          }
        }

        setItems(prev => prev.map(item => (item.id === itemId ? updated_item : item)))
        globalMutate(
          (key: string) =>
            typeof key === 'string' && key.startsWith('entity:tour_confirmation_items'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:tour_confirmation_items')
        return updated_item
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新失敗'
        logger.error('更新明細失敗:', err)
        setError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [isLocked, items]
  )

  // 刪除明細項目
  const deleteItem = useCallback(
    async (itemId: string) => {
      // 🔒 後端鎖定：已交接的確認單禁止刪除
      if (isLocked()) {
        throw new Error('此確認單已交接，無法刪除項目')
      }

      setSaving(true)
      try {
        const { error } = await supabase.from('tour_confirmation_items').delete().eq('id', itemId)

        if (error) throw error

        setItems(prev => prev.filter(item => item.id !== itemId))
        globalMutate(
          (key: string) =>
            typeof key === 'string' && key.startsWith('entity:tour_confirmation_items'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:tour_confirmation_items')
      } catch (err) {
        const message = err instanceof Error ? err.message : '刪除失敗'
        logger.error('刪除明細失敗:', err)
        setError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [isLocked]
  )

  // 按類別分組的明細
  const groupedItems = useMemo((): GroupedConfirmationItems => {
    return {
      transport: items.filter(i => i.category === 'transport'),
      meal: items.filter(i => i.category === 'meal'),
      accommodation: items.filter(i => i.category === 'accommodation'),
      activity: items.filter(i => i.category === 'activity'),
      other: items.filter(i => i.category === 'other'),
    }
  }, [items])

  // 費用統計
  const costSummary = useMemo((): CostSummary => {
    const calc = (category: ConfirmationItemCategory) => {
      const categoryItems = items.filter(i => i.category === category)
      return {
        expected: categoryItems.reduce((sum, i) => sum + (i.expected_cost || 0), 0),
        actual: categoryItems.reduce((sum, i) => sum + (i.actual_cost || 0), 0),
      }
    }

    const transport = calc('transport')
    const meal = calc('meal')
    const accommodation = calc('accommodation')
    const activity = calc('activity')
    const other = calc('other')

    return {
      transport,
      meal,
      accommodation,
      activity,
      other,
      total: {
        expected:
          transport.expected +
          meal.expected +
          accommodation.expected +
          activity.expected +
          other.expected,
        actual:
          transport.actual + meal.actual + accommodation.actual + activity.actual + other.actual,
      },
    }
  }, [items])

  return {
    sheet,
    items,
    groupedItems,
    costSummary,
    loading,
    saving,
    error,
    isLocked,
    createSheet,
    updateSheet,
    addItem,
    updateItem,
    deleteItem,
    reload: loadSheet,
  }
}
