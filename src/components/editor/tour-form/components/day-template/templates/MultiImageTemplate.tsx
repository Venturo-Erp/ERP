'use client'

import React from 'react'
import { Plus, Utensils, Building2 } from 'lucide-react'
import { DailyItinerary, Activity } from '../../../types'
import { UploadableImage } from '../UploadableImage'
import { EditableText } from '../EditableText'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

interface MultiImageTemplateProps {
  editingDay: DailyItinerary
  dayIndex: number
  dateDisplay: string
  editingField: string | null
  setEditingField: (field: string | null) => void
  updateField: (field: keyof DailyItinerary, value: unknown) => void
  updateActivity: (actIndex: number, field: keyof Activity, value: string) => void
  addActivity: () => void
  triggerUpload: (target: { type: 'activity' | 'day'; index?: number }) => void
  uploading: string | null
}

export function MultiImageTemplate({
  editingDay,
  dayIndex,
  dateDisplay,
  editingField,
  setEditingField,
  updateField,
  updateActivity,
  addActivity,
  triggerUpload,
  uploading,
}: MultiImageTemplateProps) {
  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden">
      {/* 標題區 */}
      <div className="p-6 bg-gradient-to-r from-[#8da399] to-[#6b8577]">
        <div className="text-white/80 text-sm mb-1">{dateDisplay}</div>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-light text-white/30">0{dayIndex + 1}</span>
          <EditableText
            value={editingDay.title}
            fieldKey="title"
            editingField={editingField}
            setEditingField={setEditingField}
            onChange={v => updateField('title', v)}
            className="text-xl font-bold text-white"
            placeholder={COMP_EDITOR_LABELS.行程標題}
            inputClassName="bg-card/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* 圖片輪播區 */}
      <div className="p-4 bg-muted">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(editingDay.activities || []).map((act, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <UploadableImage
                src={act.image}
                alt={act.title}
                targetKey={{ type: 'activity', index: i }}
                triggerUpload={triggerUpload}
                uploading={uploading}
                className="w-40 h-28 rounded-lg"
                emptySize="w-40 h-28"
              />
              <EditableText
                value={act.title}
                fieldKey={`activity-${i}-title`}
                editingField={editingField}
                setEditingField={setEditingField}
                onChange={v => updateActivity(i, 'title', v)}
                className="text-xs text-morandi-secondary mt-1 text-center"
                placeholder={COMP_EDITOR_LABELS.景點名稱}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addActivity}
            className="flex-shrink-0 w-40 h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-morandi-muted hover:border-editor-theme-blue-light hover:text-editor-theme-blue-light transition-colors"
          >
            <Plus size={24} />
            <span className="text-xs mt-1">{COMP_EDITOR_LABELS.ADD_4351}</span>
          </button>
        </div>
      </div>

      {/* 描述 + 餐食 */}
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

        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Utensils size={14} className="text-editor-theme-blue-light" />
            <EditableText
              value={editingDay.meals?.lunch || ''}
              fieldKey="meals-lunch"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('meals', { ...editingDay.meals, lunch: v })}
              className="text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.午餐}
            />
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-editor-theme-blue-light" />
            <EditableText
              value={editingDay.accommodation || ''}
              fieldKey="accommodation"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('accommodation', v)}
              className="text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.住宿}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
