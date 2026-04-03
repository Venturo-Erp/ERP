'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { DailyItinerary, Activity } from '../../../types'
import { UploadableImage } from '../UploadableImage'
import { EditableText } from '../EditableText'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

interface SingleImageTemplateProps {
  editingDay: DailyItinerary
  dayIndex: number
  dateDisplay: string
  mainImage?: string
  editingField: string | null
  setEditingField: (field: string | null) => void
  updateField: (field: keyof DailyItinerary, value: unknown) => void
  updateActivity: (actIndex: number, field: keyof Activity, value: string) => void
  addActivity: () => void
  triggerUpload: (target: { type: 'activity' | 'day'; index?: number }) => void
  uploading: string | null
}

export function SingleImageTemplate({
  editingDay,
  dayIndex,
  dateDisplay,
  mainImage,
  editingField,
  setEditingField,
  updateField,
  updateActivity,
  addActivity,
  triggerUpload,
  uploading,
}: SingleImageTemplateProps) {
  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden">
      {/* 大圖區域 */}
      <div className="relative h-64">
        <UploadableImage
          src={mainImage}
          alt={editingDay.title}
          targetKey={{ type: 'activity', index: 0 }}
          triggerUpload={triggerUpload}
          uploading={uploading}
          className="w-full h-full"
          emptySize="h-64"
        />
        {/* 漸層遮罩 + 標題 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="text-sm opacity-80 mb-1">
            {dateDisplay} • Day {dayIndex + 1}
          </div>
          <EditableText
            value={editingDay.title}
            fieldKey="title"
            editingField={editingField}
            setEditingField={setEditingField}
            onChange={v => updateField('title', v)}
            className="text-2xl font-bold text-white"
            placeholder={COMP_EDITOR_LABELS.行程標題}
            inputClassName="bg-card/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-6">
        <EditableText
          value={editingDay.description || ''}
          fieldKey="description"
          editingField={editingField}
          setEditingField={setEditingField}
          onChange={v => updateField('description', v)}
          className="text-morandi-secondary mb-4"
          placeholder={COMP_EDITOR_LABELS.行程描述}
          multiline
        />

        {/* 景點列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-morandi-secondary">
              {COMP_EDITOR_LABELS.LABEL_2716}
            </span>
            <button
              type="button"
              onClick={addActivity}
              className="text-xs text-editor-theme-accent hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> {COMP_EDITOR_LABELS.新增}
            </button>
          </div>
          {(editingDay.activities || []).map((act, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
              <UploadableImage
                src={act.image}
                alt={act.title}
                targetKey={{ type: 'activity', index: i }}
                triggerUpload={triggerUpload}
                uploading={uploading}
                className="w-12 h-12 rounded-lg flex-shrink-0"
                emptySize="w-12 h-12"
              />
              <div className="flex-1">
                <EditableText
                  value={act.title}
                  fieldKey={`activity-${i}-title`}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  onChange={v => updateActivity(i, 'title', v)}
                  className="font-medium text-foreground text-sm"
                  placeholder={COMP_EDITOR_LABELS.景點名稱}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 餐食 + 住宿 */}
        <div className="mt-4 pt-4 border-t border-border/50 flex gap-4 text-sm">
          <div className="flex-1">
            <span className="text-morandi-muted">{COMP_EDITOR_LABELS.LABEL_1221}</span>
            <EditableText
              value={editingDay.meals?.lunch || ''}
              fieldKey="meals-lunch"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('meals', { ...editingDay.meals, lunch: v })}
              className="inline text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.午餐}
            />
          </div>
          <div className="flex-1">
            <span className="text-morandi-muted">{COMP_EDITOR_LABELS.LABEL_8648}</span>
            <EditableText
              value={editingDay.accommodation || ''}
              fieldKey="accommodation"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('accommodation', v)}
              className="inline text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.住宿}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
