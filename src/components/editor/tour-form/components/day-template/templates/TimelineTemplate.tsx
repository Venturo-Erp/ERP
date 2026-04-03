'use client'

import React from 'react'
import { Plus, Utensils, Building2 } from 'lucide-react'
import { DailyItinerary, Activity } from '../../../types'
import { UploadableImage } from '../UploadableImage'
import { EditableText } from '../EditableText'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

interface TimelineTemplateProps {
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

export function TimelineTemplate({
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
}: TimelineTemplateProps) {
  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden">
      {/* 標題區 */}
      <div className="p-6 bg-editor-theme-blue text-white">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-light opacity-30">
            {String(dayIndex + 1).padStart(2, '0')}
          </div>
          <div>
            <div className="text-sm opacity-80">{dateDisplay}</div>
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
      </div>

      {/* 時間軸內容 */}
      <div className="p-6">
        <div className="relative pl-8">
          {/* 時間軸線 */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-editor-theme-blue/20" />

          {/* 景點 */}
          {(editingDay.activities || []).map((act, i) => (
            <div key={i} className="relative mb-6 last:mb-0">
              {/* 時間點 */}
              <div className="absolute -left-5 w-4 h-4 rounded-full bg-editor-theme-blue border-4 border-white shadow" />

              <div className="flex gap-4 bg-muted rounded-xl p-4">
                <UploadableImage
                  src={act.image}
                  alt={act.title}
                  targetKey={{ type: 'activity', index: i }}
                  triggerUpload={triggerUpload}
                  uploading={uploading}
                  className="w-24 h-24 rounded-lg flex-shrink-0"
                  emptySize="w-24 h-24"
                />
                <div className="flex-1">
                  <EditableText
                    value={act.title}
                    fieldKey={`activity-${i}-title`}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    onChange={v => updateActivity(i, 'title', v)}
                    className="font-bold text-foreground"
                    placeholder={COMP_EDITOR_LABELS.景點名稱}
                  />
                  <EditableText
                    value={act.description}
                    fieldKey={`activity-${i}-desc`}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    onChange={v => updateActivity(i, 'description', v)}
                    className="text-sm text-morandi-secondary mt-1"
                    placeholder={COMP_EDITOR_LABELS.景點描述_2}
                    multiline
                  />
                </div>
              </div>
            </div>
          ))}

          {/* 新增按鈕 */}
          <div className="relative">
            <div className="absolute -left-5 w-4 h-4 rounded-full bg-border border-4 border-white" />
            <button
              type="button"
              onClick={addActivity}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-morandi-muted hover:border-editor-theme-blue hover:text-editor-theme-blue transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>{COMP_EDITOR_LABELS.ADD_8581}</span>
            </button>
          </div>
        </div>

        {/* 餐食 + 住宿 */}
        <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-editor-theme-blue font-medium mb-1 flex items-center gap-1">
              <Utensils size={12} /> {COMP_EDITOR_LABELS.午餐}
            </div>
            <EditableText
              value={editingDay.meals?.lunch || ''}
              fieldKey="meals-lunch"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('meals', { ...editingDay.meals, lunch: v })}
              className="text-sm text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.午餐安排}
            />
          </div>
          <div>
            <div className="text-xs text-editor-theme-blue font-medium mb-1 flex items-center gap-1">
              <Utensils size={12} /> {COMP_EDITOR_LABELS.晚餐}
            </div>
            <EditableText
              value={editingDay.meals?.dinner || ''}
              fieldKey="meals-dinner"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('meals', { ...editingDay.meals, dinner: v })}
              className="text-sm text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.晚餐安排}
            />
          </div>
          <div>
            <div className="text-xs text-editor-theme-blue font-medium mb-1 flex items-center gap-1">
              <Building2 size={12} /> {COMP_EDITOR_LABELS.住宿}
            </div>
            <EditableText
              value={editingDay.accommodation || ''}
              fieldKey="accommodation"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('accommodation', v)}
              className="text-sm text-morandi-primary"
              placeholder={COMP_EDITOR_LABELS.住宿飯店}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
