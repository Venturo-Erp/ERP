'use client'

import { logger } from '@/lib/utils/logger'
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Users,
  Car,
  Home,
  UtensilsCrossed,
  MapPin,
  MoreHorizontal,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Map,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CostCategory, CostItem } from '../types'
import { CostItemRow } from './CostItemRow'
import { AccommodationItemRow } from './AccommodationItemRow'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { RatesDetailDialog } from '@/features/transportation-rates/components/RatesDetailDialog'
import { TransportationRate } from '@/types/transportation-rates.types'
import type { Country as FullCountry } from '@/stores/region-store'
import { CATEGORY_SECTION_LABELS } from '../constants/labels'

const categoryIcons: Record<string, React.ElementType> = {
  transport: Car,
  'group-transport': Users,
  accommodation: Home,
  meals: UtensilsCrossed,
  activities: MapPin,
  others: MoreHorizontal,
  guide: Users,
}

interface CategoryTransportationRate {
  id: string
  country_id: string
  country_name: string
  vehicle_type: string
  price: number
  price_twd?: number
  currency: string
  unit: string
  notes: string | null
  route?: string
  category?: string
}

// 此元件只需要 Country 的部分欄位
type Country = Pick<FullCountry, 'id' | 'name' | 'emoji'>

interface CategorySectionProps {
  category: CostCategory
  accommodationTotal: number
  accommodationDays: number
  isReadOnly: boolean
  handleAddAccommodationDay: () => void
  handleAddRow: (categoryId: string, options?: { quantity?: number | null }) => void
  handleInsertItem: (categoryId: string, item: CostItem) => void
  handleAddGuideRow: (categoryId: string) => void
  handleAddTransportRow: (categoryId: string) => void
  handleAddAdultTicket: (categoryId: string) => void
  handleAddChildTicket: (categoryId: string) => void
  handleAddInfantTicket: (categoryId: string) => void
  handleAddLunchMeal?: (day?: number) => void
  handleAddDinnerMeal?: (day?: number) => void
  handleAddActivity?: (day?: number) => void
  handleUpdateItem: (
    categoryId: string,
    itemId: string,
    field: keyof CostItem,
    value: unknown
  ) => void
  handleRemoveItem: (categoryId: string, itemId: string) => void
  handleToggleVisibility?: (categoryId: string, itemId: string) => void
  // Local 報價相關
  onOpenLocalPricingDialog?: () => void
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  accommodationTotal,
  accommodationDays,
  isReadOnly,
  handleAddAccommodationDay,
  handleAddRow,
  handleInsertItem,
  handleAddGuideRow,
  handleAddTransportRow,
  handleAddAdultTicket,
  handleAddChildTicket,
  handleAddInfantTicket,
  handleAddLunchMeal,
  handleAddDinnerMeal,
  handleAddActivity,
  handleUpdateItem,
  handleRemoveItem,
  handleToggleVisibility,
  onOpenLocalPricingDialog,
}) => {
  const Icon = categoryIcons[category.id]

  // 折疊狀態
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 對話框狀態
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false)
  const [isRatesDialogOpen, setIsRatesDialogOpen] = useState(false)
  const [countries, setCountries] = useState<Array<{ name: string }>>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [transportRates, setTransportRates] = useState<CategoryTransportationRate[]>([])
  const [loading, setLoading] = useState(false)

  // 載入車資資料庫中有資料的國家列表
  const fetchCountriesWithRates = async () => {
    if (countries.length > 0) {
      setIsCountryDialogOpen(true)
      return
    }

    const { data } = await dynamicFrom('transportation_rates')
      .select('country_name')
      .eq('is_active', true)

    if (data) {
      const ratesData = data as Array<{ country_name: string }>
      const uniqueCountries = Array.from(new Set(ratesData.map(item => item.country_name))).map(
        name => ({ name })
      )
      setCountries(uniqueCountries)
      setIsCountryDialogOpen(true)
    }
  }

  // 當選擇國家時載入該國家的車資資料
  const handleCountrySelect = async (countryName: string) => {
    setSelectedCountry(countryName)
    setLoading(true)

    const { data } = await dynamicFrom('transportation_rates')
      .select('*')
      .eq('country_name', countryName)
      .eq('is_active', true)
      .order('display_order')
      .limit(500)

    if (data) {
      setTransportRates(data as CategoryTransportationRate[])
      setIsCountryDialogOpen(false)
      setIsRatesDialogOpen(true)
    }
    setLoading(false)
  }

  // 重新載入車資資料
  const refreshRates = async () => {
    if (!selectedCountry) return

    const { data } = await dynamicFrom('transportation_rates')
      .select('*')
      .eq('country_name', selectedCountry)
      .eq('is_active', true)
      .order('display_order')
      .limit(500)

    if (data) setTransportRates(data as CategoryTransportationRate[])
  }

  // 插入車資到團體分攤
  const handleInsertRate = (rate: CategoryTransportationRate) => {
    logger.log('🔄 [CategorySection] 插入車資:', rate)

    // 建立描述：使用 route（例如「包車1天（100公里／10小時）」）
    const description =
      rate.route || rate.category || rate.vehicle_type || CATEGORY_SECTION_LABELS.車資

    // 建立完整的 CostItem
    const newItem: CostItem = {
      id: `item-${Date.now()}`,
      name: description,
      quantity: 1,
      unit_price: rate.price_twd || 0,
      total: rate.price_twd || 0,
      note: rate.notes || '',
      is_group_cost: true, // 標記為團體費用
    }

    logger.log('📝 [CategorySection] 插入項目:', newItem)

    // 直接插入完整項目
    handleInsertItem('group-transport', newItem)

    // 關閉對話框
    setIsRatesDialogOpen(false)
  }

  return (
    <React.Fragment>
      {/* 分類標題行 - 有底色但無左邊框，可折疊 */}
      <tr className="bg-morandi-container/40 border-b border-morandi-container/60">
        <td colSpan={2} className="py-3 px-4 text-sm font-semibold text-morandi-charcoal">
          <div className="flex items-center space-x-2">
            {/* 折疊箭頭 */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-0.5 hover:bg-morandi-gold/10 rounded transition-colors"
              title={isCollapsed ? CATEGORY_SECTION_LABELS.展開 : CATEGORY_SECTION_LABELS.收合}
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-morandi-secondary" />
              ) : (
                <ChevronDown size={14} className="text-morandi-secondary" />
              )}
            </button>
            <Icon size={16} className="text-morandi-gold" />
            <span>{category.name}</span>

            {/* 參考報價圖示 - 僅顯示於團體分攤分類 */}
            {category.id === 'group-transport' && (
              <button
                className="p-1 hover:bg-morandi-gold/10 rounded transition-colors"
                title={CATEGORY_SECTION_LABELS.查看參考報價}
                onClick={fetchCountriesWithRates}
              >
                <DollarSign size={14} className="text-morandi-gold" />
              </button>
            )}
          </div>
        </td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4"></td>
        <td className="py-3 px-4 text-right">
          {category.id === 'accommodation' ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleAddRow(category.id)}
              disabled={isReadOnly}
              className={cn(
                'text-morandi-gold hover:bg-morandi-gold/10',
                isReadOnly && 'cursor-not-allowed opacity-60'
              )}
            >
              <Plus size={12} className="mr-1" />
              {CATEGORY_SECTION_LABELS.新增房型}
            </Button>
          ) : category.id === 'group-transport' ? (
            <div className="flex gap-1 justify-end">
              {onOpenLocalPricingDialog && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onOpenLocalPricingDialog}
                  disabled={isReadOnly}
                  className={cn(
                    'text-morandi-gold hover:bg-morandi-gold/10',
                    isReadOnly && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <MapPin size={12} className="mr-1" />
                  Local
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.ADD}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddTransportRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Car size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_138}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddGuideRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Users size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_8731}
              </Button>
            </div>
          ) : category.id === 'transport' ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddAdultTicket(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-gold hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.成人}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddChildTicket(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_475}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddInfantTicket(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_2772}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_7496}
              </Button>
            </div>
          ) : category.id === 'meals' && handleAddLunchMeal ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddLunchMeal()}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-gold hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.LABEL_5098}
              </Button>
            </div>
          ) : category.id === 'activities' && handleAddActivity ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddActivity()}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-gold hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.ADD}
              </Button>
            </div>
          ) : category.id === 'guide' ? (
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id, { quantity: null })}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-gold hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                小費
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id, { quantity: 1 })}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-secondary hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                出差費
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleAddRow(category.id)}
                disabled={isReadOnly}
                className={cn(
                  'text-morandi-gold hover:bg-morandi-gold/10',
                  isReadOnly && 'cursor-not-allowed opacity-60'
                )}
              >
                <Plus size={12} className="mr-1" />
                {CATEGORY_SECTION_LABELS.ADD}
              </Button>
            </div>
          )}
        </td>
      </tr>

      {/* 項目明細行 - 折疊時隱藏 */}
      {!isCollapsed &&
        (category.id === 'accommodation'
          ? // 住宿特殊渲染：按天分組，每天內顯示各房型
            (() => {
              const accommodationItems = category.items.filter(item => item.day !== undefined)
              const groupedByDay: Record<number, CostItem[]> = {}

              // 按天分組
              accommodationItems.forEach(item => {
                const day = item.day!
                if (!groupedByDay[day]) groupedByDay[day] = []
                groupedByDay[day].push(item)
              })

              // 找出每天的第一個飯店名稱（用於續住顯示）
              const dayHotelNames: Record<number, string> = {}
              Object.keys(groupedByDay)
                .sort((a, b) => Number(a) - Number(b))
                .forEach(dayStr => {
                  const day = Number(dayStr)
                  const dayItems = groupedByDay[day]
                  // 取第一個非續住的飯店名稱
                  const firstItem = dayItems.find(item => !item.is_same_as_previous)
                  if (firstItem) {
                    dayHotelNames[day] = firstItem.name
                  } else if (day > 1 && dayHotelNames[day - 1]) {
                    // 如果全部都是續住，則用前一天的
                    dayHotelNames[day] = dayHotelNames[day - 1]
                  }
                })

              const sortedDays = Object.keys(groupedByDay).sort((a, b) => Number(a) - Number(b))

              return sortedDays.map((dayStr, dayIndex) => {
                const day = Number(dayStr)
                const dayItems = groupedByDay[day]
                const prevDayHotelName = day > 1 ? dayHotelNames[day - 1] : undefined

                return dayItems.map((item, roomIndex) => (
                  <AccommodationItemRow
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    day={day}
                    dayIndex={dayIndex}
                    roomIndex={roomIndex}
                    roomCount={dayItems.length}
                    prevDayHotelName={prevDayHotelName}
                    isReadOnly={isReadOnly}
                    handleUpdateItem={handleUpdateItem}
                    handleRemoveItem={handleRemoveItem}
                    handleToggleVisibility={handleToggleVisibility!}
                  />
                ))
              })
            })()
          : // 一般分類的渲染
            category.items.map(item => (
              <CostItemRow
                key={item.id}
                item={item}
                categoryId={category.id}
                handleUpdateItem={handleUpdateItem}
                handleRemoveItem={handleRemoveItem}
                handleToggleVisibility={handleToggleVisibility!}
              />
            )))}

      {/* 小計行 - 只有當該分類有項目且未折疊時才顯示 */}
      {!isCollapsed && category.items.length > 0 && (
        <tr className="border-b border-morandi-container/80">
          <td
            colSpan={4}
            className="py-2 px-4 text-right text-sm font-medium text-morandi-secondary"
          >
            {CATEGORY_SECTION_LABELS.LABEL_832}
          </td>
          <td className="py-2 px-4 text-center text-sm font-bold text-morandi-primary">
            {(() => {
              if (category.id === 'accommodation') {
                return accommodationTotal.toLocaleString()
              } else if (category.id === 'transport') {
                // 機票小計：只計算成人
                const adultTicketTotal = category.items
                  .filter(item => item.name === CATEGORY_SECTION_LABELS.成人)
                  .reduce((sum, item) => sum + (item.total || 0), 0)
                return adultTicketTotal.toLocaleString()
              } else if (category.id === 'group-transport') {
                // 團體分攤：Local 報價只計算第一個砍次（最便宜的）
                let total = 0
                let hasSeenLocalPricing = false
                for (const item of category.items) {
                  if (item.name?.startsWith('Local 報價')) {
                    // Local 報價：只計算第一個（最小單位砍次）
                    if (!hasSeenLocalPricing) {
                      total += item.total || 0
                      hasSeenLocalPricing = true
                    }
                    // 其他 Local 砍次不計入小計
                  } else {
                    // 非 Local 報價：正常計算
                    total += item.total || 0
                  }
                }
                return total.toLocaleString()
              } else {
                return category.items
                  .reduce((sum, item) => sum + (item.total || 0), 0)
                  .toLocaleString()
              }
            })()}
          </td>
          <td className="py-2 px-4"></td>
        </tr>
      )}

      {/* 選擇國家對話框 */}
      <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
        <DialogContent level={1} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{CATEGORY_SECTION_LABELS.SELECT_8015}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="text-center py-8 text-morandi-secondary">
                {CATEGORY_SECTION_LABELS.LOADING_6912}
              </div>
            ) : countries.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {countries.map(country => (
                  <Button
                    key={country.name}
                    variant="outline"
                    className="h-auto py-4 text-base"
                    onClick={() => handleCountrySelect(country.name)}
                  >
                    {country.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-morandi-secondary">
                {CATEGORY_SECTION_LABELS.EMPTY_4962}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 車資管理表格對話框 */}
      {selectedCountry && (
        <RatesDetailDialog
          isOpen={isRatesDialogOpen}
          onClose={() => setIsRatesDialogOpen(false)}
          countryName={selectedCountry}
          rates={transportRates as unknown as TransportationRate[]}
          onUpdate={refreshRates}
          onInsert={handleInsertRate as unknown as (rate: TransportationRate) => void}
          isEditMode={false}
        />
      )}
    </React.Fragment>
  )
}
