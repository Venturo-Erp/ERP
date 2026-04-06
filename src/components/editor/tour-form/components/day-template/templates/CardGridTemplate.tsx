'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { DailyItinerary, Activity } from '../../../types'
import { UploadableImage } from '../UploadableImage'
import { EditableText } from '../EditableText'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

interface CardGridTemplateProps {
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

export function CardGridTemplate({
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
}: CardGridTemplateProps) {
  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden">
      {/* 標題 */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-morandi-container flex flex-col items-center justify-center text-white">
            <span className="text-2xl font-bold">{dayIndex + 1}</span>
            <span className="text-[10px] opacity-80">{dateDisplay}</span>
          </div>
          <div>
            <EditableText
              value={editingDay.title}
              fieldKey="title"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('title', v)}
              className="text-xl font-bold text-foreground"
              placeholder={COMP_EDITOR_LABELS.行程標題}
            />
            <EditableText
              value={editingDay.description || ''}
              fieldKey="description"
              editingField={editingField}
              setEditingField={setEditingField}
              onChange={v => updateField('description', v)}
              className="text-sm text-morandi-secondary mt-1"
              placeholder={COMP_EDITOR_LABELS.簡短描述}
            />
          </div>
        </div>
      </div>

      {/* 景點卡片網格 */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {(editingDay.activities || []).map((act, i) => (
            <div key={i} className="group relative bg-muted rounded-xl overflow-hidden">
              <UploadableImage
                src={act.image}
                alt={act.title}
                targetKey={{ type: 'activity', index: i }}
                triggerUpload={triggerUpload}
                uploading={uploading}
                className="w-full h-32"
                emptySize="h-32"
              />
              <div className="p-3">
                <EditableText
                  value={act.title}
                  fieldKey={`activity-${i}-title`}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  onChange={v => updateActivity(i, 'title', v)}
                  className="font-medium text-foreground text-sm"
                  placeholder={COMP_EDITOR_LABELS.景點名稱}
                />
                <EditableText
                  value={act.description}
                  fieldKey={`activity-${i}-desc`}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  onChange={v => updateActivity(i, 'description', v)}
                  className="text-xs text-morandi-secondary mt-1"
                  placeholder={COMP_EDITOR_LABELS.景點描述}
                />
              </div>
            </div>
          ))}
          {/* 新增卡片 */}
          <button
            type="button"
            onClick={addActivity}
            className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-morandi-muted hover:border-morandi-container hover:text-morandi-container transition-colors"
          >
            <Plus size={28} />
            <span className="text-sm mt-1">{COMP_EDITOR_LABELS.ADD_14}</span>
          </button>
        </div>
      </div>

      {/* 底部：餐食 + 住宿 */}
      <div className="px-6 py-4 bg-morandi-container/5 border-t border-morandi-container/20 flex gap-6">
        <div className="flex-1">
          <div className="text-xs text-morandi-container font-medium mb-1">
            {COMP_EDITOR_LABELS.LABEL_9126}
          </div>
          <div className="flex gap-4 text-sm">
            <span>
              早：
              <EditableText
                value={editingDay.meals?.breakfast || ''}
                fieldKey="meals-breakfast"
                editingField={editingField}
                setEditingField={setEditingField}
                onChange={v => updateField('meals', { ...editingDay.meals, breakfast: v })}
                className="inline text-morandi-primary"
                placeholder={COMP_EDITOR_LABELS.飯店內}
              />
            </span>
            <span>
              午：
              <EditableText
                value={editingDay.meals?.lunch || ''}
                fieldKey="meals-lunch"
                editingField={editingField}
                setEditingField={setEditingField}
                onChange={v => updateField('meals', { ...editingDay.meals, lunch: v })}
                className="inline text-morandi-primary"
                placeholder={COMP_EDITOR_LABELS.午餐}
              />
            </span>
            <span>
              晚：
              <EditableText
                value={editingDay.meals?.dinner || ''}
                fieldKey="meals-dinner"
                editingField={editingField}
                setEditingField={setEditingField}
                onChange={v => updateField('meals', { ...editingDay.meals, dinner: v })}
                className="inline text-morandi-primary"
                placeholder={COMP_EDITOR_LABELS.晚餐}
              />
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-morandi-container font-medium mb-1">
            {COMP_EDITOR_LABELS.住宿}
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
  )
}
