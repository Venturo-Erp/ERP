'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Activity } from '../../types'
import { UploadableImage } from './UploadableImage'
import { EditableText } from './EditableText'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface ActivityListProps {
  activities: Activity[]
  editingField: string | null
  setEditingField: (field: string | null) => void
  updateActivity: (actIndex: number, field: keyof Activity, value: string) => void
  addActivity: () => void
  triggerUpload: (target: { type: 'activity' | 'day'; index?: number }) => void
  uploading: string | null
  variant?: 'default' | 'compact' | 'timeline'
}

export function ActivityList({
  activities,
  editingField,
  setEditingField,
  updateActivity,
  addActivity,
  triggerUpload,
  uploading,
  variant = 'default',
}: ActivityListProps) {
  if (variant === 'timeline') {
    return (
      <div className="relative pl-8">
        {/* 時間軸線 */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-editor-theme-blue/20" />

        {/* 景點 */}
        {activities.map((act, i) => (
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
    )
  }

  if (variant === 'compact') {
    return (
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
        {activities.map((act, i) => (
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
    )
  }

  // Default variant (grid)
  return (
    <div className="grid grid-cols-2 gap-4">
      {activities.map((act, i) => (
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
  )
}
