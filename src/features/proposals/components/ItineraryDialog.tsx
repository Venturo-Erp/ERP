'use client'
/**
 * ItineraryDialog - 行程編輯器
 *
 * 分頁式的時間軸介面，用於編輯每日行程
 * - Tab 切換每日行程
 * - 表格式編輯（點擊儲存格直接編輯，無格線）
 *
 * 資料邏輯已抽取至 useItineraryDialogData hook
 */

import NextImage from 'next/image'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Clock,
  Plus,
  Trash2,
  X,
  Save,
  Printer,
  Upload,
  Coffee,
  UtensilsCrossed,
  Moon,
  Palette,
  Database,
  ArrowRight,
  Minus,
  Sparkles,
  Building2,
} from 'lucide-react'
import { AttractionSelector } from '@/components/editor/AttractionSelector'
import { HotelSelector } from '@/components/editor/HotelSelector'
import { ITINERARY_DIALOG_LABELS } from '../constants/labels'
import type { ProposalPackage } from '@/types/proposal.types'
import type { TimelineAttraction, TimelineItineraryData } from '@/types/timeline-itinerary.types'
import { useItineraryDialogData, type EditableField } from './useItineraryDialogData'

// 預設顏色選項
const COLOR_OPTIONS = [
  { value: '', label: ITINERARY_DIALOG_LABELS.預設, color: '#3a3633' },
  { value: '#3b82f6', label: ITINERARY_DIALOG_LABELS.藍色, color: '#3b82f6' },
  { value: '#ef4444', label: ITINERARY_DIALOG_LABELS.紅色, color: '#ef4444' },
  { value: '#22c55e', label: ITINERARY_DIALOG_LABELS.綠色, color: '#22c55e' },
  { value: '#f59e0b', label: ITINERARY_DIALOG_LABELS.橙色, color: '#f59e0b' },
  { value: '#8b5cf6', label: ITINERARY_DIALOG_LABELS.紫色, color: '#8b5cf6' },
]

interface ItineraryDialogProps {
  isOpen: boolean
  onClose: () => void
  pkg: ProposalPackage | null
  onSave?: (timelineData: TimelineItineraryData) => Promise<void>
}

export function ItineraryDialog({ isOpen, onClose, pkg, onSave }: ItineraryDialogProps) {
  const h = useItineraryDialogData(pkg, onSave)

  // 渲染儲存格
  const renderCell = (
    attraction: TimelineAttraction,
    rowIndex: number,
    field: EditableField,
    width?: string
  ) => {
    const isEditing = h.editingCell?.rowIndex === rowIndex && h.editingCell?.field === field
    let value = ''
    let placeholder = ''

    switch (field) {
      case 'startTime':
        value = attraction.startTime || ''
        placeholder = '0900'
        break
      case 'endTime':
        value = attraction.endTime || ''
        placeholder = '1200'
        break
      case 'name':
        value = attraction.name || ''
        placeholder =
          attraction.mealType && attraction.mealType !== 'none'
            ? ITINERARY_DIALOG_LABELS.餐廳名稱
            : ITINERARY_DIALOG_LABELS.景點名稱
        break
      case 'menu':
        value = attraction.menu || ''
        placeholder = ITINERARY_DIALOG_LABELS.菜色內容
        break
    }

    const isTimeField = field === 'startTime' || field === 'endTime'
    const isTextareaField = field === 'name' || field === 'menu'

    if (isEditing) {
      if (isTextareaField) {
        return (
          <textarea
            ref={h.textareaRef}
            value={value}
            onChange={e => h.updateAttractionField(rowIndex, field, e.target.value)}
            onBlur={() => h.setEditingCell(null)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                h.setEditingCell(null)
              } else if (e.key === 'Escape') {
                h.setEditingCell(null)
              }
            }}
            className={cn(
              'w-full min-h-[32px] px-2 py-1 border-none outline-none bg-morandi-gold/10 focus:ring-0 resize-none text-sm leading-tight',
              width
            )}
            rows={Math.max(1, Math.ceil(value.length / 15))}
          />
        )
      }
      return (
        <input
          ref={h.inputRef}
          value={value}
          onChange={e => {
            let newValue = e.target.value
            if (isTimeField) {
              newValue = newValue.replace(/\D/g, '').slice(0, 4)
            }
            h.updateAttractionField(rowIndex, field, newValue)
          }}
          onBlur={() => h.setEditingCell(null)}
          onKeyDown={e => h.handleKeyDown(e, rowIndex, field)}
          className={cn(
            'w-full h-8 px-2 border-none outline-none bg-morandi-gold/10 focus:ring-0',
            isTimeField && 'text-center font-mono text-xs',
            width
          )}
          maxLength={isTimeField ? 4 : undefined}
        />
      )
    }

    const textColor =
      (field === 'name' || field === 'menu') && attraction.color && value
        ? { color: attraction.color }
        : {}

    return (
      <div
        className={cn(
          'px-2 cursor-pointer hover:bg-morandi-gold/5 transition-colors',
          isTimeField
            ? 'h-8 flex items-center justify-center font-mono text-xs'
            : 'min-h-[32px] py-1 text-sm leading-tight whitespace-pre-wrap break-words',
          !value && 'text-morandi-muted/40',
          width
        )}
        style={textColor}
        onClick={() => h.handleCellClick(rowIndex, field)}
      >
        {value || placeholder}
      </div>
    )
  }

  if (!pkg) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent level={2} className={DIALOG_SIZES['4xl']}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock size={18} className="text-morandi-gold" />
              {ITINERARY_DIALOG_LABELS.時間軸行程編輯器}
            </DialogTitle>
          </DialogHeader>

          <input
            ref={h.fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={h.handleImageUpload}
            className="hidden"
          />

          {/* 標題區 */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
            <div>
              <Label className="text-xs text-morandi-primary">
                {ITINERARY_DIALOG_LABELS.行程標題}
              </Label>
              <Input
                value={h.data.title}
                onChange={e => h.setData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={ITINERARY_DIALOG_LABELS.輸入行程標題}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-morandi-primary">
                {ITINERARY_DIALOG_LABELS.副標題}
              </Label>
              <Input
                value={h.data.subtitle || ''}
                onChange={e => h.setData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder={ITINERARY_DIALOG_LABELS.輸入副標題}
                className="mt-1 h-8"
              />
            </div>
          </div>

          {/* Day 分頁 Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            {h.data.days.map((day, index) => (
              <button
                key={day.id}
                onClick={() => h.setActiveDayIndex(index)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors relative',
                  h.activeDayIndex === index
                    ? 'text-morandi-gold border-b-2 border-morandi-gold -mb-[1px]'
                    : 'text-morandi-secondary hover:text-morandi-primary'
                )}
              >
                Day {day.dayNumber}
                {day.date && (
                  <span className="ml-1 text-xs opacity-60">{h.formatDate(day.date)}</span>
                )}
              </button>
            ))}
            <button
              onClick={h.addDay}
              className="px-3 py-2 text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
              title={ITINERARY_DIALOG_LABELS.新增一天}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 當日內容 */}
          <div className="flex flex-col">
            {/* 每日標題 */}
            <div className="py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-morandi-primary">
                  {ITINERARY_DIALOG_LABELS.今日主題}
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' → ')}
                    className="p-1.5 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
                    title={ITINERARY_DIALOG_LABELS.插入箭頭}
                  >
                    <ArrowRight size={14} className="text-morandi-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' ⇀ ')}
                    className="px-2 py-1 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors font-medium"
                    title={ITINERARY_DIALOG_LABELS.插入鉤箭頭}
                  >
                    ⇀
                  </button>
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' · ')}
                    className="px-2 py-1 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors font-medium"
                    title={ITINERARY_DIALOG_LABELS.插入間隔點}
                  >
                    ·
                  </button>
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' | ')}
                    className="p-1.5 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
                    title={ITINERARY_DIALOG_LABELS.插入直線}
                  >
                    <Minus size={14} className="text-morandi-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' ⭐ ')}
                    className="p-1.5 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
                    title={ITINERARY_DIALOG_LABELS.插入星號}
                  >
                    <Sparkles size={14} className="text-morandi-gold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => h.insertSymbolToTitle(' ✈ ')}
                    className="px-2 py-1 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
                    title={ITINERARY_DIALOG_LABELS.插入飛機}
                  >
                    ✈
                  </button>
                  {h.data.days.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => h.removeDay(h.activeDayIndex)}
                      className="h-7 px-2 text-morandi-red hover:bg-morandi-red/10 ml-2"
                    >
                      <Trash2 size={14} className="mr-1" />
                      {ITINERARY_DIALOG_LABELS.刪除此天}
                    </Button>
                  )}
                </div>
              </div>
              <Input
                id="day-title-input"
                value={h.activeDay.title || ''}
                onChange={e => h.updateDayTitle(e.target.value)}
                placeholder={ITINERARY_DIALOG_LABELS.台北_福岡空港_由布院_金麟湖_阿蘇溫泉}
                className="h-8 text-sm"
              />
            </div>

            {/* 景點表格區域 */}
            <div className="h-[280px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-morandi-secondary border-b border-border/30">
                    <th className="py-2 px-1 text-center font-medium w-8"></th>
                    <th className="py-2 px-2 text-left font-medium w-16">
                      {ITINERARY_DIALOG_LABELS.開始}
                    </th>
                    <th className="py-2 px-2 text-left font-medium w-16">
                      {ITINERARY_DIALOG_LABELS.結束}
                    </th>
                    <th className="py-2 px-2 text-left font-medium">
                      {ITINERARY_DIALOG_LABELS.景點_餐廳}
                    </th>
                    <th className="py-2 px-2 text-left font-medium w-40">
                      {ITINERARY_DIALOG_LABELS.菜色}
                    </th>
                    <th className="py-2 px-2 text-center font-medium w-24">
                      {ITINERARY_DIALOG_LABELS.餐食}
                    </th>
                    <th className="py-2 px-2 text-center font-medium w-16">
                      {ITINERARY_DIALOG_LABELS.照片}
                    </th>
                    <th className="py-2 px-2 text-center font-medium w-10">
                      {ITINERARY_DIALOG_LABELS.色}
                    </th>
                    <th className="py-2 px-2 text-center font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {h.activeDay.attractions.map((attraction, rowIndex) => (
                    <tr
                      key={attraction.id}
                      className="hover:bg-morandi-container/20 transition-colors"
                    >
                      <td className="py-0.5 w-8">
                        <button
                          type="button"
                          onClick={() => h.openAttractionSelector(rowIndex)}
                          className="p-1 text-morandi-muted hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                          title={ITINERARY_DIALOG_LABELS.在此行下方插入景點}
                        >
                          <Plus size={14} />
                        </button>
                      </td>
                      <td className="py-0.5 w-16">
                        {renderCell(attraction, rowIndex, 'startTime', 'w-16')}
                      </td>
                      <td className="py-0.5 w-16">
                        {renderCell(attraction, rowIndex, 'endTime', 'w-16')}
                      </td>
                      <td className="py-0.5">{renderCell(attraction, rowIndex, 'name')}</td>
                      <td className="py-0.5 w-40">
                        {attraction.mealType && attraction.mealType !== 'none' ? (
                          renderCell(attraction, rowIndex, 'menu')
                        ) : (
                          <div className="h-8 px-2 flex items-center text-morandi-muted/30">-</div>
                        )}
                      </td>
                      <td className="py-0.5 w-24">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              h.updateAttractionField(
                                rowIndex,
                                'mealType',
                                attraction.mealType === 'breakfast' ? 'none' : 'breakfast'
                              )
                            }
                            className={cn(
                              'p-1.5 rounded transition-colors',
                              attraction.mealType === 'breakfast'
                                ? 'bg-morandi-gold text-white'
                                : 'text-morandi-muted hover:bg-morandi-container'
                            )}
                            title={ITINERARY_DIALOG_LABELS.早餐}
                          >
                            <Coffee size={14} />
                          </button>
                          <button
                            onClick={() =>
                              h.updateAttractionField(
                                rowIndex,
                                'mealType',
                                attraction.mealType === 'lunch' ? 'none' : 'lunch'
                              )
                            }
                            className={cn(
                              'p-1.5 rounded transition-colors',
                              attraction.mealType === 'lunch'
                                ? 'bg-morandi-gold text-white'
                                : 'text-morandi-muted hover:bg-morandi-container'
                            )}
                            title={ITINERARY_DIALOG_LABELS.午餐}
                          >
                            <UtensilsCrossed size={14} />
                          </button>
                          <button
                            onClick={() =>
                              h.updateAttractionField(
                                rowIndex,
                                'mealType',
                                attraction.mealType === 'dinner' ? 'none' : 'dinner'
                              )
                            }
                            className={cn(
                              'p-1.5 rounded transition-colors',
                              attraction.mealType === 'dinner'
                                ? 'bg-morandi-gold text-white'
                                : 'text-morandi-muted hover:bg-morandi-container'
                            )}
                            title={ITINERARY_DIALOG_LABELS.晚餐}
                          >
                            <Moon size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-0.5 w-16">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => h.triggerImageUpload(h.activeDay.id, attraction.id)}
                            className="p-1.5 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                            title={ITINERARY_DIALOG_LABELS.上傳照片}
                          >
                            <Upload size={14} />
                          </button>
                          {attraction.images.length > 0 && (
                            <span className="text-xs text-morandi-gold font-medium">
                              {attraction.images.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-0.5 w-10">
                        <div className="relative">
                          <button
                            onClick={() =>
                              h.setColorPickerOpen(h.colorPickerOpen === rowIndex ? null : rowIndex)
                            }
                            className="p-1.5 rounded transition-colors hover:bg-morandi-container"
                            style={{ color: attraction.color || 'var(--morandi-primary)' }}
                            title={ITINERARY_DIALOG_LABELS.選擇顏色}
                          >
                            <Palette size={14} />
                          </button>
                          {h.colorPickerOpen === rowIndex && (
                            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg p-1 flex gap-1 z-10">
                              {COLOR_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    h.updateAttractionField(rowIndex, 'color', opt.value)
                                    h.setColorPickerOpen(null)
                                  }}
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                                    attraction.color === opt.value
                                      ? 'border-morandi-gold'
                                      : 'border-transparent'
                                  )}
                                  style={{ backgroundColor: opt.color }}
                                  title={opt.label}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-0.5 w-10">
                        {h.activeDay.attractions.length > 1 && (
                          <button
                            onClick={() => h.removeAttraction(rowIndex)}
                            className="p-1.5 text-morandi-muted hover:text-morandi-red hover:bg-morandi-red/10 rounded transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="py-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => h.openAttractionSelector(null)}
                  className="gap-1 text-xs text-morandi-gold hover:text-morandi-gold-hover"
                  title={ITINERARY_DIALOG_LABELS.從景點庫選擇}
                >
                  <Plus size={12} />
                  {ITINERARY_DIALOG_LABELS.從景點庫新增}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={h.addAttraction}
                  className="gap-1 text-xs text-morandi-secondary hover:text-morandi-gold"
                >
                  <Plus size={12} />
                  {ITINERARY_DIALOG_LABELS.手動新增}
                </Button>
              </div>
            </div>

            {/* 已上傳的照片預覽 */}
            {h.activeDay.attractions.some(a => a.images.length > 0) && (
              <div className="py-3 border-t border-border/50">
                <div className="text-xs text-morandi-secondary mb-2">
                  {ITINERARY_DIALOG_LABELS.已上傳照片}
                </div>
                <div className="flex flex-wrap gap-2">
                  {h.activeDay.attractions.map((attraction, attrIndex) =>
                    attraction.images.map(img => (
                      <div key={img.id} className="relative group">
                        <NextImage
                          src={img.url}
                          alt=""
                          width={64}
                          height={64}
                          className="object-cover rounded border border-border"
                        />
                        <button
                          onClick={() => h.removeImage(attrIndex, img.id)}
                          className="absolute -top-1 -right-1 h-4 w-4 bg-morandi-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/50 text-white truncate px-0.5">
                          {attraction.name || ITINERARY_DIALOG_LABELS.景點}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 當晚住宿 */}
            <div className="py-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-morandi-gold shrink-0" />
                <Label className="text-xs text-morandi-primary shrink-0">
                  {ITINERARY_DIALOG_LABELS.當晚住宿}
                </Label>
                <Input
                  value={h.activeDay.accommodation || ''}
                  onChange={e => h.updateDayAccommodation(e.target.value)}
                  placeholder={ITINERARY_DIALOG_LABELS.輸入飯店名稱}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => h.setHotelSelectorOpen(true)}
                  className="h-8 px-2 gap-1 text-xs text-morandi-gold hover:text-morandi-gold-hover shrink-0"
                >
                  <Database size={14} />
                  {ITINERARY_DIALOG_LABELS.從飯店庫選擇}
                </Button>
              </div>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X size={16} /> {ITINERARY_DIALOG_LABELS.關閉}
              </Button>
              <Button variant="outline" onClick={h.handlePrint} className="gap-2">
                <Printer size={16} /> {ITINERARY_DIALOG_LABELS.列印}
              </Button>
              <Button
                onClick={h.handleSave}
                disabled={h.saving}
                className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Save size={16} />
                {h.saving ? ITINERARY_DIALOG_LABELS.儲存中 : ITINERARY_DIALOG_LABELS.儲存}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AttractionSelector
        isOpen={h.attractionSelectorOpen}
        onClose={() => {
          h.setAttractionSelectorOpen(false)
          h.setInsertAtRowIndex(null)
        }}
        onSelect={h.handleAttractionSelect}
        dayTitle={h.activeDay.title || ''}
      />

      <HotelSelector
        isOpen={h.hotelSelectorOpen}
        onClose={() => h.setHotelSelectorOpen(false)}
        tourCountryId={pkg?.country_id || undefined}
        onSelect={h.handleHotelSelect}
      />
    </>
  )
}
