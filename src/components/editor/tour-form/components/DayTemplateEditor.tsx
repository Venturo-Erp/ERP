'use client'

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DailyItinerary, DayDisplayStyle } from '../types'
import { DayHeader } from './day-template/DayHeader'
import { useDayTemplate } from './day-template/hooks/useDayTemplate'
import {
  SingleImageTemplate,
  MultiImageTemplate,
  CardGridTemplate,
  TimelineTemplate,
} from './day-template'

// 使用從 types.ts 引入的 DayDisplayStyle
export type { DayDisplayStyle } from '../types'

interface DayTemplateEditorProps {
  isOpen: boolean
  onClose: () => void
  dayData: DailyItinerary
  dayIndex: number
  departureDate?: string
  onSave: (updatedDay: DailyItinerary) => void
  style: DayDisplayStyle
}

// 計算該天日期
function calculateDayDate(departureDate: string | undefined, dayNumber: number): string {
  if (!departureDate) return ''
  try {
    const date = new Date(departureDate)
    if (isNaN(date.getTime())) return ''
    date.setDate(date.getDate() + (dayNumber - 1))
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return `${months[date.getMonth()]} ${date.getDate()}`
  } catch {
    return ''
  }
}

export function DayTemplateEditor({
  isOpen,
  onClose,
  dayData,
  dayIndex,
  departureDate,
  onSave,
  style,
}: DayTemplateEditorProps) {
  const {
    editingDay,
    currentStyle,
    setCurrentStyle,
    editingField,
    setEditingField,
    uploading,
    fileInputRef,
    uploadTarget,
    updateField,
    updateActivity,
    addActivity,
    handleImageUpload,
    triggerUpload,
    mainImage,
  } = useDayTemplate({ dayData, style })

  const dateDisplay = calculateDayDate(departureDate, dayIndex + 1)

  // 儲存並關閉（連同選擇的風格一起儲存）
  const handleSave = () => {
    onSave({ ...editingDay, displayStyle: currentStyle })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        {/* 隱藏的檔案上傳 input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file && uploadTarget) {
              handleImageUpload(file, uploadTarget)
            }
            e.target.value = ''
          }}
        />

        {/* 標題列 + 風格選擇器 */}
        <DayHeader
          dayIndex={dayIndex}
          currentStyle={currentStyle}
          onStyleChange={setCurrentStyle}
          onSave={handleSave}
          onClose={onClose}
        />

        {/* 預覽區域 - 根據選擇的風格切換 */}
        <div
          className="overflow-auto p-6 bg-background"
          style={{ maxHeight: 'calc(90vh - 140px)' }}
        >
          {/* 單張大圖風格 */}
          {currentStyle === 'single-image' && (
            <SingleImageTemplate
              editingDay={editingDay}
              dayIndex={dayIndex}
              dateDisplay={dateDisplay}
              mainImage={mainImage}
              editingField={editingField}
              setEditingField={setEditingField}
              updateField={updateField}
              updateActivity={updateActivity}
              addActivity={addActivity}
              triggerUpload={triggerUpload}
              uploading={uploading}
            />
          )}

          {/* 多圖輪播風格 */}
          {currentStyle === 'multi-image' && (
            <MultiImageTemplate
              editingDay={editingDay}
              dayIndex={dayIndex}
              dateDisplay={dateDisplay}
              editingField={editingField}
              setEditingField={setEditingField}
              updateField={updateField}
              updateActivity={updateActivity}
              addActivity={addActivity}
              triggerUpload={triggerUpload}
              uploading={uploading}
            />
          )}

          {/* 卡片網格風格 */}
          {currentStyle === 'card-grid' && (
            <CardGridTemplate
              editingDay={editingDay}
              dayIndex={dayIndex}
              dateDisplay={dateDisplay}
              editingField={editingField}
              setEditingField={setEditingField}
              updateField={updateField}
              updateActivity={updateActivity}
              addActivity={addActivity}
              triggerUpload={triggerUpload}
              uploading={uploading}
            />
          )}

          {/* 時間軸風格 */}
          {currentStyle === 'timeline' && (
            <TimelineTemplate
              editingDay={editingDay}
              dayIndex={dayIndex}
              dateDisplay={dateDisplay}
              editingField={editingField}
              setEditingField={setEditingField}
              updateField={updateField}
              updateActivity={updateActivity}
              addActivity={addActivity}
              triggerUpload={triggerUpload}
              uploading={uploading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
