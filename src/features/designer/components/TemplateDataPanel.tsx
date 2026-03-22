'use client'

/**
 * 模板數據編輯面板
 *
 * 提供快速編輯模板數據的輸入框（標題、日期、目的地等）
 */

import { Label } from '@/components/ui/label'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  MapPin,
  Calendar,
  Building2,
  Hash,
  ImageIcon,
  Upload,
  Move,
  Clock,
  Utensils,
  ChevronDown,
  ChevronRight,
  Hotel,
} from 'lucide-react'
import { useState } from 'react'
import type { MealIconType, DailyItinerary } from '../templates/definitions/types'
import { TEMPLATE_DATA_PANEL_LABELS } from '@/constants/labels'

// 編輯器元件
import { TocEditor, MemoEditor, HotelEditor, DailyPageEditor, VehicleEditor } from './editors'
import { DESIGNER_LABELS } from './constants/labels'

// 重新匯出類型
export type { TocItem, SimplePage } from './editors'

// 餐食圖標選項
const MEAL_ICON_OPTIONS: { value: MealIconType; label: string }[] = [
  { value: 'bakery_dining', label: TEMPLATE_DATA_PANEL_LABELS.麵包_早餐 },
  { value: 'flight_class', label: TEMPLATE_DATA_PANEL_LABELS.機上餐 },
  { value: 'restaurant', label: TEMPLATE_DATA_PANEL_LABELS.一般餐廳 },
  { value: 'ramen_dining', label: TEMPLATE_DATA_PANEL_LABELS.拉麵_日式 },
  { value: 'soup_kitchen', label: TEMPLATE_DATA_PANEL_LABELS.湯品 },
  { value: 'skillet', label: TEMPLATE_DATA_PANEL_LABELS.鍋物 },
  { value: 'bento', label: TEMPLATE_DATA_PANEL_LABELS.便當 },
  { value: 'rice_bowl', label: TEMPLATE_DATA_PANEL_LABELS.飯類 },
  { value: 'coffee', label: TEMPLATE_DATA_PANEL_LABELS.咖啡_輕食 },
  { value: 'dinner_dining', label: TEMPLATE_DATA_PANEL_LABELS.晚餐_選項 },
]

interface SimplePage {
  id: string
  name: string
  templateKey?: string
}

interface TemplateDataPanelProps {
  templateData: Record<string, unknown> | null
  onTemplateDataChange: (newData: Record<string, unknown>) => void
  onUploadCoverImage?: () => void
  onAdjustCoverPosition?: () => void
  onUploadDailyCoverImage?: () => void
  onAdjustDailyCoverPosition?: () => void
  currentPageType?: string // 'cover' | 'toc' | 'itinerary' | 'daily' | 'memo' | 'hotel' | 'attraction' | 'vehicle' | 'table'
  currentDayIndex?: number // 當前每日行程的天數索引（0-based）
  // 目錄編輯用
  pages?: SimplePage[] // 所有頁面列表
  onApplyToc?: () => void // 套用目錄變更到頁面
}

export function TemplateDataPanel({
  templateData,
  onTemplateDataChange,
  onUploadCoverImage,
  onAdjustCoverPosition,
  onUploadDailyCoverImage,
  onAdjustDailyCoverPosition,
  currentPageType = 'cover',
  currentDayIndex,
  pages,
  onApplyToc,
}: TemplateDataPanelProps) {
  // 展開的天數索引
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  // 集合資訊抽屜
  const [meetingInfoExpanded, setMeetingInfoExpanded] = useState(false)

  if (!templateData) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h3 className="font-medium text-sm text-morandi-primary">
            {TEMPLATE_DATA_PANEL_LABELS.模板數據}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-morandi-secondary text-center">
            {TEMPLATE_DATA_PANEL_LABELS.請先選擇模板}
          </p>
        </div>
      </div>
    )
  }

  const updateField = (field: string, value: string) => {
    onTemplateDataChange({
      ...templateData,
      [field]: value,
    })
  }

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex)
      } else {
        newSet.add(dayIndex)
      }
      return newSet
    })
  }

  // 更新每日行程資料
  const updateDailyItinerary = (
    dayIndex: number,
    field:
      | keyof DailyItinerary
      | 'mealBreakfast'
      | 'mealLunch'
      | 'mealDinner'
      | 'mealIconBreakfast'
      | 'mealIconLunch'
      | 'mealIconDinner',
    value: string
  ) => {
    const currentItineraries = (templateData.dailyItineraries as DailyItinerary[]) || []
    const updatedItineraries = currentItineraries.map((day, idx) => {
      if (idx !== dayIndex) return day

      // 處理餐食欄位
      if (field.startsWith('meal') && !field.startsWith('mealIcon')) {
        const mealType = field.replace('meal', '').toLowerCase() as 'breakfast' | 'lunch' | 'dinner'
        return {
          ...day,
          meals: {
            ...day.meals,
            [mealType]: value,
          },
        }
      }

      // 處理餐食圖標欄位
      if (field.startsWith('mealIcon')) {
        const mealType = field.replace('mealIcon', '').toLowerCase() as
          | 'breakfast'
          | 'lunch'
          | 'dinner'
        return {
          ...day,
          mealIcons: {
            ...day.mealIcons,
            [mealType]: value as MealIconType,
          },
        }
      }

      // 處理其他欄位
      return {
        ...day,
        [field]: value,
      }
    })

    onTemplateDataChange({
      ...templateData,
      dailyItineraries: updatedItineraries,
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h3 className="font-medium text-sm text-morandi-primary">
          {TEMPLATE_DATA_PANEL_LABELS.模板數據}
        </h3>
        <p className="text-xs text-morandi-secondary mt-1">
          {TEMPLATE_DATA_PANEL_LABELS.修改後自動更新畫布}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 頁面類型提示 */}
        <div className="text-xs text-morandi-secondary bg-morandi-container/30 rounded px-2 py-1">
          {currentPageType === 'cover' && TEMPLATE_DATA_PANEL_LABELS.封面頁}
          {currentPageType === 'toc' && TEMPLATE_DATA_PANEL_LABELS.目錄頁}
          {currentPageType === 'itinerary' && TEMPLATE_DATA_PANEL_LABELS.行程總覽}
          {currentPageType === 'daily' && TEMPLATE_DATA_PANEL_LABELS.每日行程}
          {currentPageType === 'memo' && TEMPLATE_DATA_PANEL_LABELS.備忘錄}
          {currentPageType === 'hotel' && TEMPLATE_DATA_PANEL_LABELS.飯店介紹}
          {currentPageType === 'hotelMulti' && TEMPLATE_DATA_PANEL_LABELS.飯店介紹}
          {currentPageType === 'attraction' && TEMPLATE_DATA_PANEL_LABELS.景點介紹}
          {currentPageType === 'vehicle' && TEMPLATE_DATA_PANEL_LABELS.分車名單}
          {currentPageType === 'table' && TEMPLATE_DATA_PANEL_LABELS.分桌名單}
        </div>

        {/* 封面圖片 - 只在封面和目錄頁顯示 */}
        {(currentPageType === 'cover' || currentPageType === 'toc') && (
          <>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <ImageIcon size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.封面圖片}
              </Label>
              {templateData.coverImage ? (
                <div className="space-y-2">
                  <div
                    className="w-full aspect-[495/350] rounded-lg overflow-hidden bg-morandi-container/30 border border-border"
                    style={{
                      backgroundImage: `url(${templateData.coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs h-7"
                      onClick={onAdjustCoverPosition}
                    >
                      <Move size={12} />
                      {TEMPLATE_DATA_PANEL_LABELS.調整位置}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs h-7"
                      onClick={onUploadCoverImage}
                    >
                      <Upload size={12} />
                      {TEMPLATE_DATA_PANEL_LABELS.更換}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed gap-2"
                  onClick={onUploadCoverImage}
                >
                  <Upload size={16} />
                  {TEMPLATE_DATA_PANEL_LABELS.上傳封面圖片}
                </Button>
              )}
            </div>
            <div className="border-t border-border pt-4" />
          </>
        )}

        {/* 主標題 - 封面頁 */}
        {currentPageType === 'cover' && (
          <>
            {/* 主標題 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <FileText size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.主標題}
              </Label>
              <Input
                value={(templateData.mainTitle as string) || ''}
                onChange={e => updateField('mainTitle', e.target.value)}
                placeholder={TEMPLATE_DATA_PANEL_LABELS.輸入主標題}
                className="h-8 text-sm"
              />
            </div>

            {/* 副標題 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <FileText size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.副標題}
              </Label>
              <Input
                value={(templateData.subtitle as string) || ''}
                onChange={e => updateField('subtitle', e.target.value)}
                placeholder="Travel Handbook"
                className="h-8 text-sm"
              />
            </div>

            {/* 目的地 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.目的地}
              </Label>
              <Input
                value={(templateData.destination as string) || ''}
                onChange={e => updateField('destination', e.target.value)}
                placeholder="JAPAN, OSAKA"
                className="h-8 text-sm"
              />
            </div>

            {/* 旅遊日期 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calendar size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.旅遊日期}
              </Label>
              <Input
                value={(templateData.travelDates as string) || ''}
                onChange={e => updateField('travelDates', e.target.value)}
                placeholder="2025.01.15 - 2025.01.20"
                className="h-8 text-sm"
              />
            </div>

            {/* 公司名稱 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Building2 size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.公司名稱}
              </Label>
              <Input
                value={(templateData.companyName as string) || ''}
                onChange={e => updateField('companyName', e.target.value)}
                placeholder={COMPANY_NAME_EN}
                className="h-8 text-sm"
              />
            </div>

            {/* 團號 */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash size={12} />
                {TEMPLATE_DATA_PANEL_LABELS.團號}
              </Label>
              <Input
                value={(templateData.tourCode as string) || ''}
                onChange={e => updateField('tourCode', e.target.value)}
                placeholder="OSA250115A"
                className="h-8 text-sm"
              />
            </div>
          </>
        )}

        {/* 目錄頁 */}
        {currentPageType === 'toc' && pages && (
          <TocEditor
            templateData={templateData}
            pages={pages}
            onTemplateDataChange={onTemplateDataChange}
            onApplyToc={onApplyToc}
          />
        )}

        {/* 行程總覽頁 */}
        {currentPageType === 'itinerary' && (
          <>
            {/* 集合/領隊資訊抽屜 */}
            <div className="rounded border border-border/50 bg-morandi-container/20 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 p-2 text-left hover:bg-morandi-container/30 transition-colors"
                onClick={() => setMeetingInfoExpanded(!meetingInfoExpanded)}
              >
                {meetingInfoExpanded ? (
                  <ChevronDown size={14} className="text-morandi-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-morandi-secondary" />
                )}
                <Clock size={12} className="text-morandi-secondary" />
                <span className="text-xs font-medium text-morandi-primary flex-1">
                  {TEMPLATE_DATA_PANEL_LABELS.集合_領隊資訊}
                </span>
              </button>

              {meetingInfoExpanded && (
                <div className="p-2 pt-0 space-y-2 border-t border-border/30">
                  {/* 集合時間 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {TEMPLATE_DATA_PANEL_LABELS.集合時間}
                    </Label>
                    <Input
                      value={(templateData.meetingTime as string) || ''}
                      onChange={e => updateField('meetingTime', e.target.value)}
                      placeholder="07:30"
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* 集合地點 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {TEMPLATE_DATA_PANEL_LABELS.集合地點}
                    </Label>
                    <Input
                      value={(templateData.meetingPlace as string) || ''}
                      onChange={e => updateField('meetingPlace', e.target.value)}
                      placeholder={DESIGNER_LABELS.LABEL_8875}
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* 領隊姓名 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {TEMPLATE_DATA_PANEL_LABELS.領隊姓名}
                    </Label>
                    <Input
                      value={(templateData.leaderName as string) || ''}
                      onChange={e => updateField('leaderName', e.target.value)}
                      placeholder={DESIGNER_LABELS.LABEL_4921}
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* 領隊電話 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-morandi-primary">
                      {TEMPLATE_DATA_PANEL_LABELS.領隊電話}
                    </Label>
                    <Input
                      value={(templateData.leaderPhone as string) || ''}
                      onChange={e => updateField('leaderPhone', e.target.value)}
                      placeholder="0912-345-678"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 每日行程（可編輯） */}
            {(templateData.dailyItineraries as DailyItinerary[])?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar size={12} />
                  {TEMPLATE_DATA_PANEL_LABELS.每日行程}
                </Label>
                <div className="space-y-2">
                  {(templateData.dailyItineraries as DailyItinerary[])?.map((day, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-border/50 bg-morandi-container/20 overflow-hidden"
                    >
                      {/* 天數標題 - 可點擊展開 */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-morandi-container/30 transition-colors"
                        onClick={() => toggleDay(idx)}
                      >
                        {expandedDays.has(idx) ? (
                          <ChevronDown size={14} className="text-morandi-secondary" />
                        ) : (
                          <ChevronRight size={14} className="text-morandi-secondary" />
                        )}
                        <span className="text-xs font-medium text-morandi-primary flex-1">
                          Day {day.dayNumber}
                        </span>
                        <span className="text-xs text-morandi-secondary truncate max-w-[120px]">
                          {day.title}
                        </span>
                      </button>

                      {/* 展開的編輯區域 */}
                      {expandedDays.has(idx) && (
                        <div className="p-2 pt-0 space-y-2 border-t border-border/30">
                          {/* 行程標題 */}
                          <div className="space-y-1">
                            <Label className="text-[10px] text-morandi-primary">
                              {TEMPLATE_DATA_PANEL_LABELS.行程標題}
                            </Label>
                            <Input
                              value={day.title || ''}
                              onChange={e => updateDailyItinerary(idx, 'title', e.target.value)}
                              placeholder={TEMPLATE_DATA_PANEL_LABELS.行程標題_placeholder}
                              className="h-7 text-xs"
                            />
                          </div>

                          {/* 早餐 */}
                          <div className="space-y-1">
                            <Label className="text-[10px] text-morandi-primary flex items-center gap-1">
                              <Utensils size={10} />
                              {TEMPLATE_DATA_PANEL_LABELS.早餐}
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                value={day.meals?.breakfast || ''}
                                onChange={e =>
                                  updateDailyItinerary(idx, 'mealBreakfast', e.target.value)
                                }
                                placeholder={TEMPLATE_DATA_PANEL_LABELS.早餐_placeholder}
                                className="h-7 text-xs flex-1"
                              />
                              <Select
                                value={day.mealIcons?.breakfast || ''}
                                onValueChange={v =>
                                  updateDailyItinerary(idx, 'mealIconBreakfast', v)
                                }
                              >
                                <SelectTrigger className="h-7 w-20 text-[10px]">
                                  <SelectValue placeholder={TEMPLATE_DATA_PANEL_LABELS.圖標} />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEAL_ICON_OPTIONS.map(opt => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 午餐 */}
                          <div className="space-y-1">
                            <Label className="text-[10px] text-morandi-primary flex items-center gap-1">
                              <Utensils size={10} />
                              {DESIGNER_LABELS.LABEL_8515}
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                value={day.meals?.lunch || ''}
                                onChange={e =>
                                  updateDailyItinerary(idx, 'mealLunch', e.target.value)
                                }
                                placeholder={DESIGNER_LABELS.LABEL_4196}
                                className="h-7 text-xs flex-1"
                              />
                              <Select
                                value={day.mealIcons?.lunch || ''}
                                onValueChange={v => updateDailyItinerary(idx, 'mealIconLunch', v)}
                              >
                                <SelectTrigger className="h-7 w-20 text-[10px]">
                                  <SelectValue placeholder={DESIGNER_LABELS.LABEL_272} />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEAL_ICON_OPTIONS.map(opt => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 晚餐 */}
                          <div className="space-y-1">
                            <Label className="text-[10px] text-morandi-primary flex items-center gap-1">
                              <Utensils size={10} />
                              {DESIGNER_LABELS.LABEL_8227}
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                value={day.meals?.dinner || ''}
                                onChange={e =>
                                  updateDailyItinerary(idx, 'mealDinner', e.target.value)
                                }
                                placeholder={DESIGNER_LABELS.LABEL_2282}
                                className="h-7 text-xs flex-1"
                              />
                              <Select
                                value={day.mealIcons?.dinner || ''}
                                onValueChange={v => updateDailyItinerary(idx, 'mealIconDinner', v)}
                              >
                                <SelectTrigger className="h-7 w-20 text-[10px]">
                                  <SelectValue placeholder={DESIGNER_LABELS.LABEL_272} />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEAL_ICON_OPTIONS.map(opt => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 住宿 */}
                          <div className="space-y-1">
                            <Label className="text-[10px] text-morandi-primary flex items-center gap-1">
                              <Hotel size={10} />
                              {DESIGNER_LABELS.LABEL_8766}
                            </Label>
                            <Input
                              value={day.accommodation || ''}
                              onChange={e =>
                                updateDailyItinerary(idx, 'accommodation', e.target.value)
                              }
                              placeholder={DESIGNER_LABELS.LABEL_2362}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.LABEL_5767}</p>
          </>
        )}

        {/* 每日行程頁 */}
        {currentPageType === 'daily' && currentDayIndex !== undefined && (
          <DailyPageEditor
            templateData={templateData}
            currentDayIndex={currentDayIndex}
            onTemplateDataChange={onTemplateDataChange}
            onUploadCoverImage={onUploadDailyCoverImage}
            onAdjustCoverPosition={onAdjustDailyCoverPosition}
          />
        )}
        {currentPageType === 'daily' && currentDayIndex === undefined && (
          <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.EDIT_9488}</p>
        )}

        {/* 備忘錄頁 */}
        {currentPageType === 'memo' && (
          <MemoEditor templateData={templateData} onTemplateDataChange={onTemplateDataChange} />
        )}

        {/* 飯店介紹頁 */}
        {(currentPageType === 'hotel' || currentPageType === 'hotelMulti') && (
          <HotelEditor
            templateData={templateData}
            onTemplateDataChange={onTemplateDataChange}
            currentHotelIndex={templateData.currentHotelIndex as number | undefined}
          />
        )}

        {/* 景點介紹頁 */}
        {currentPageType === 'attraction' && (
          <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.EDIT_3995}</p>
        )}

        {/* 分車/分桌名單頁 */}
        {(currentPageType === 'vehicle' || currentPageType === 'table') && (
          <VehicleEditor
            templateData={templateData}
            onTemplateDataChange={onTemplateDataChange}
            currentVehicleIndex={templateData.currentVehiclePageIndex as number | undefined}
            pageType={currentPageType}
          />
        )}
      </div>
    </div>
  )
}
