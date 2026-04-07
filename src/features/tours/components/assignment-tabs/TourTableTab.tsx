'use client'

/**
 * TourTableTab - 分桌 Tab
 * 從行程表自動帶入餐廳，勾選啟用後可新增桌次
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { createTourMealSetting } from '@/data/entities/tour-meal-settings'
import { createTourTable } from '@/data/entities/tour-tables'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UtensilsCrossed, Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../../constants/labels'

type MemberBasic = Pick<OrderMember, 'id' | 'chinese_name' | 'passport_name'>

interface DailyScheduleItem {
  day: number
  route: string
  meals: {
    breakfast: string
    lunch: string
    dinner: string
  }
  accommodation: string
}

interface TourInfo {
  id: string
  departure_date: string
  return_date: string
  daily_schedule?: DailyScheduleItem[]
}

interface MealSetting {
  id: string
  day_number: number
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  restaurant_name: string | null
  enabled: boolean
}

interface TableInfo {
  id: string
  meal_setting_id: string
  table_number: number
  capacity: number
  assigned_count: number
  is_full: boolean
}

interface TourTableTabProps {
  tourId: string
  tour?: TourInfo
  members: MemberBasic[]
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: COMP_TOURS_LABELS.早餐,
  lunch: COMP_TOURS_LABELS.午餐,
  dinner: COMP_TOURS_LABELS.晚餐,
}

// 預設桌次人數選項
const TABLE_CAPACITY_OPTIONS = [6, 8, 10, 12]

export function TourTableTab({ tourId, tour, members }: TourTableTabProps) {
  const user = useAuthStore(state => state.user)
  const [mealSettings, setMealSettings] = useState<MealSetting[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([])
  const [showAddTable, setShowAddTable] = useState(false)
  const [selectedMealSettingId, setSelectedMealSettingId] = useState<string | null>(null)
  const [newTableCapacity, setNewTableCapacity] = useState(10)

  // 從行程表提取餐廳資訊（使用 prop 或 從資料庫載入的資料）
  const effectiveSchedule = tour?.daily_schedule ?? dailySchedule
  const mealsFromSchedule = useMemo(() => {
    const meals: Array<{
      day_number: number
      meal_type: 'breakfast' | 'lunch' | 'dinner'
      restaurant_name: string
    }> = []

    if (effectiveSchedule.length > 0) {
      effectiveSchedule.forEach(day => {
        if (
          day.meals?.breakfast &&
          day.meals.breakfast !== COMP_TOURS_LABELS.飯店內 &&
          day.meals.breakfast !== COMP_TOURS_LABELS.機上
        ) {
          meals.push({
            day_number: day.day,
            meal_type: 'breakfast',
            restaurant_name: day.meals.breakfast,
          })
        }
        if (
          day.meals?.lunch &&
          day.meals.lunch !== COMP_TOURS_LABELS.敬請自理 &&
          day.meals.lunch !== COMP_TOURS_LABELS.機上
        ) {
          meals.push({ day_number: day.day, meal_type: 'lunch', restaurant_name: day.meals.lunch })
        }
        if (
          day.meals?.dinner &&
          day.meals.dinner !== COMP_TOURS_LABELS.敬請自理 &&
          day.meals.dinner !== COMP_TOURS_LABELS.機上
        ) {
          meals.push({
            day_number: day.day,
            meal_type: 'dinner',
            restaurant_name: day.meals.dinner,
          })
        }
      })
    }

    return meals
  }, [effectiveSchedule])

  // 計算旅遊天數
  const tourDays =
    tour?.departure_date && tour?.return_date
      ? Math.ceil(
          (new Date(tour.return_date).getTime() - new Date(tour.departure_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 1

  useEffect(() => {
    loadData()
  }, [tourId])

  const loadData = async () => {
    try {
      // 如果沒有從 props 取得 daily_schedule，則從資料庫載入
      if (!tour?.daily_schedule) {
        // 先取得 tour 的 itinerary_id
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('itinerary_id')
          .eq('id', tourId)
          .single()

        if (!tourError && tourData?.itinerary_id) {
          // 從 itineraries 載入 daily_itinerary
          const { data: itineraryData, error: itineraryError } = await supabase
            .from('itineraries')
            .select('daily_itinerary')
            .eq('id', tourData.itinerary_id)
            .single()

          if (!itineraryError && itineraryData?.daily_itinerary) {
            // 解析 daily_itinerary 並轉換格式
            const rawSchedule = itineraryData.daily_itinerary as Array<{
              day?: number
              route?: string
              meals?: { breakfast?: string; lunch?: string; dinner?: string }
              accommodation?: string
            }>
            const schedule: DailyScheduleItem[] = rawSchedule.map((item, index) => ({
              day: item.day ?? index + 1,
              route: item.route ?? '',
              meals: {
                breakfast: item.meals?.breakfast ?? '',
                lunch: item.meals?.lunch ?? '',
                dinner: item.meals?.dinner ?? '',
              },
              accommodation: item.accommodation ?? '',
            }))
            setDailySchedule(schedule)
          }
        }
      }

      // 載入餐食設定
      const { data: settings, error: settingsError } = await supabase
        .from('tour_meal_settings')
        .select(
          'id, tour_id, day_number, meal_type, restaurant_name, enabled, display_order, workspace_id, created_at, updated_at'
        )
        .eq('tour_id', tourId)
        .order('day_number')
        .order('meal_type')
        .limit(500)

      if (settingsError) throw settingsError

      // 載入桌次
      const { data: tableData, error: tableError } = await supabase
        .from('tour_tables_status')
        .select(
          'id, tour_id, table_number, capacity, assigned_count, is_full, day_number, meal_type, restaurant_name, meal_setting_id, display_order, workspace_id'
        )
        .eq('tour_id', tourId)
        .order('table_number')
        .limit(500)

      if (tableError) throw tableError

      setMealSettings((settings || []) as MealSetting[])
      setTables((tableData || []) as TableInfo[])

      // 自動展開已啟用的餐食
      const enabledIds = new Set((settings || []).filter(s => s.enabled).map(s => s.id))
      setExpandedMeals(enabledIds)
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.載入分桌資料失敗, error)
    } finally {
      setLoading(false)
    }
  }

  // 同步行程表的餐食到設定（如果尚未存在）
  const syncMealsFromSchedule = async () => {
    try {
      for (const meal of mealsFromSchedule) {
        // 檢查是否已存在
        const existing = mealSettings.find(
          s => s.day_number === meal.day_number && s.meal_type === meal.meal_type
        )
        if (!existing) {
          await createTourMealSetting({
            tour_id: tourId,
            day_number: meal.day_number,
            meal_type: meal.meal_type,
            restaurant_name: meal.restaurant_name,
            enabled: false,
          })
        }
      }
      await loadData()
      toast.success(COMP_TOURS_LABELS.已從行程表同步餐食資料)
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.同步餐食失敗_2, error)
      toast.error(COMP_TOURS_LABELS.同步餐食失敗)
    }
  }

  // 切換餐食啟用狀態
  const toggleMealEnabled = async (settingId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tour_meal_settings')
        .update({ enabled })
        .eq('id', settingId)

      if (error) throw error

      setMealSettings(prev => prev.map(s => (s.id === settingId ? { ...s, enabled } : s)))

      if (enabled) {
        setExpandedMeals(prev => new Set([...prev, settingId]))
      }
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.更新餐食設定失敗, error)
      toast.error(COMP_TOURS_LABELS.更新失敗)
    }
  }

  // 新增桌次
  const handleAddTable = async () => {
    if (!selectedMealSettingId) return

    try {
      const existingTables = tables.filter(t => t.meal_setting_id === selectedMealSettingId)
      const nextNumber = existingTables.length + 1

      await createTourTable({
        tour_id: tourId,
        meal_setting_id: selectedMealSettingId,
        table_number: nextNumber,
        capacity: newTableCapacity,
        display_order: existingTables.length,
      })

      toast.success(`已新增 ${nextNumber} 桌 (${newTableCapacity}人)`)
      setShowAddTable(false)
      loadData()
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.新增桌次失敗_2, error)
      toast.error(COMP_TOURS_LABELS.新增桌次失敗)
    }
  }

  // 刪除桌次
  const handleDeleteTable = async (tableId: string) => {
    const confirmed = await confirm(COMP_TOURS_LABELS.確定要刪除這桌嗎, {
      title: COMP_TOURS_LABELS.刪除桌次,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const { error } = await supabase.from('tour_tables').delete().eq('id', tableId)

      if (error) throw error

      globalMutate(
        (key: string) => typeof key === 'string' && key.startsWith('entity:tour_tables'),
        undefined,
        { revalidate: true }
      )
      invalidate_cache_pattern('entity:tour_tables')
      toast.success(COMP_TOURS_LABELS.已刪除桌次)
      loadData()
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.刪除桌次失敗_2, error)
      toast.error(COMP_TOURS_LABELS.刪除桌次失敗)
    }
  }

  // 開啟新增桌次對話框
  const openAddTableDialog = (mealSettingId: string) => {
    setSelectedMealSettingId(mealSettingId)
    setNewTableCapacity(10)
    setShowAddTable(true)
  }

  // 切換展開/收合
  const toggleExpand = (id: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 依天數分組餐食設定
  const settingsByDay = useMemo(() => {
    const grouped: Record<number, MealSetting[]> = {}
    mealSettings.forEach(s => {
      if (!grouped[s.day_number]) {
        grouped[s.day_number] = []
      }
      grouped[s.day_number].push(s)
    })
    return grouped
  }, [mealSettings])

  const enabledCount = mealSettings.filter(s => s.enabled).length
  const totalTables = tables.length

  return (
    <>
      {/* 工具列 */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="text-sm text-morandi-secondary">
          {enabledCount > 0
            ? `已啟用 ${enabledCount} 餐分桌，共 ${totalTables} 桌`
            : COMP_TOURS_LABELS.請勾選需要分桌的餐食}
        </div>
        {mealsFromSchedule.length > 0 && mealSettings.length === 0 && (
          <Button variant="outline" size="sm" onClick={syncMealsFromSchedule} className="gap-1">
            <Plus className="h-4 w-4" />
            {COMP_TOURS_LABELS.LABEL_869}
          </Button>
        )}
      </div>

      {/* 餐食列表 */}
      <div className="py-4 space-y-3 max-h-[350px] overflow-auto">
        {mealSettings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-morandi-muted">
            <UtensilsCrossed className="h-8 w-8 mb-2" />
            <p className="text-sm">{COMP_TOURS_LABELS.SETTINGS_7076}</p>
            {mealsFromSchedule.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={syncMealsFromSchedule}
                className="mt-3 gap-1"
              >
                <Plus className="h-4 w-4" />
                從行程帶入 {mealsFromSchedule.length} 筆餐食
              </Button>
            ) : (
              <p className="text-xs mt-1">{COMP_TOURS_LABELS.SETTINGS_4545}</p>
            )}
          </div>
        ) : (
          Object.entries(settingsByDay).map(([dayNum, daySettings]) => (
            <div key={dayNum} className="space-y-2">
              <div className="text-xs font-medium text-morandi-muted px-1">第 {dayNum} 天</div>
              {daySettings.map(setting => {
                const isExpanded = expandedMeals.has(setting.id)
                const mealTables = tables.filter(t => t.meal_setting_id === setting.id)
                const totalCapacity = mealTables.reduce((sum, t) => sum + t.capacity, 0)
                const totalAssigned = mealTables.reduce((sum, t) => sum + t.assigned_count, 0)

                return (
                  <div
                    key={setting.id}
                    className={cn(
                      'rounded-lg border transition-all',
                      setting.enabled
                        ? 'border-morandi-gold/50 bg-morandi-gold/5'
                        : 'border-border bg-card'
                    )}
                  >
                    {/* 餐食標題列 */}
                    <div className="flex items-center gap-3 p-3">
                      <Checkbox
                        checked={setting.enabled}
                        onCheckedChange={checked => toggleMealEnabled(setting.id, !!checked)}
                      />
                      <button
                        onClick={() => setting.enabled && toggleExpand(setting.id)}
                        disabled={!setting.enabled}
                        className={cn(
                          'flex-1 flex items-center gap-2 text-left',
                          !setting.enabled && 'opacity-60'
                        )}
                      >
                        {setting.enabled &&
                          (isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-morandi-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-morandi-muted" />
                          ))}
                        <span className="text-sm font-medium text-morandi-primary">
                          {MEAL_TYPE_LABELS[setting.meal_type]}
                        </span>
                        {setting.restaurant_name && (
                          <span className="text-sm text-morandi-secondary">
                            - {setting.restaurant_name}
                          </span>
                        )}
                      </button>
                      {setting.enabled && mealTables.length > 0 && (
                        <span className="text-xs text-morandi-muted">
                          {mealTables.length} 桌 / {totalAssigned}/{totalCapacity} 人
                        </span>
                      )}
                    </div>

                    {/* 桌次列表（展開時顯示） */}
                    {setting.enabled && isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/50">
                        <div className="space-y-2">
                          {mealTables.map(table => (
                            <div
                              key={table.id}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-md',
                                table.is_full ? 'bg-morandi-green/10' : 'bg-morandi-container/50'
                              )}
                            >
                              <span className="text-sm text-morandi-primary">
                                {table.table_number} 桌
                              </span>
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    'text-xs',
                                    table.is_full ? 'text-morandi-green' : 'text-morandi-secondary'
                                  )}
                                >
                                  {table.assigned_count}/{table.capacity} 人
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-morandi-muted hover:text-morandi-red"
                                  onClick={() => handleDeleteTable(table.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAddTableDialog(setting.id)}
                            className="w-full justify-center gap-1 text-morandi-secondary hover:text-morandi-primary"
                          >
                            <Plus className="h-4 w-4" />
                            {COMP_TOURS_LABELS.ADD_4886}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* 新增桌次 Dialog */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent level={3} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-morandi-primary">
              <Plus className="h-5 w-5 text-morandi-gold" />
              {COMP_TOURS_LABELS.ADD_4886}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_7499}</Label>
              <div className="flex gap-2">
                {TABLE_CAPACITY_OPTIONS.map(cap => (
                  <button
                    key={cap}
                    onClick={() => setNewTableCapacity(cap)}
                    className={cn(
                      'flex-1 py-2 rounded-md border text-sm transition-all',
                      newTableCapacity === cap
                        ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-gold'
                        : 'border-border text-morandi-secondary hover:border-morandi-gold'
                    )}
                  >
                    {cap}人
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-morandi-muted">{COMP_TOURS_LABELS.LABEL_3162}</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableCapacity}
                  onChange={e => setNewTableCapacity(parseInt(e.target.value) || 10)}
                  className="w-20 h-8"
                />
                <span className="text-xs text-morandi-muted">{COMP_TOURS_LABELS.LABEL_2543}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddTable(false)} className="gap-2">
                <X size={16} />
                {COMP_TOURS_LABELS.取消}
              </Button>
              <Button onClick={handleAddTable} className="gap-2">
                <Plus size={16} />
                {COMP_TOURS_LABELS.ADD}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
