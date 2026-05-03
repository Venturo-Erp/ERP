'use client'
/**
 * ImportActivitiesDialog - 從行程表匯入景點對話框
 * 可勾選要匯入的景點
 */

import React, { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, MapPin, X, Download } from 'lucide-react'
import { CostItem } from '../types'
import { IMPORT_ACTIVITIES_DIALOG_LABELS } from '../constants/labels'

interface ActivityItem {
  day: number
  title: string
  description?: string
}

interface ImportActivitiesDialogProps {
  isOpen: boolean
  onClose: () => void
  activities: ActivityItem[]
  onImport: (items: CostItem[]) => void
}

function ImportActivitiesDialog({
  isOpen,
  onClose,
  activities,
  onImport,
}: ImportActivitiesDialogProps) {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // 重置選擇
  useEffect(() => {
    if (!isOpen) {
      setSelectedActivities(new Set())
    }
  }, [isOpen])

  const getActivityKey = (activity: ActivityItem, index: number) =>
    `${activity.day}-${activity.title}-${index}`

  const handleToggle = (activity: ActivityItem, index: number) => {
    const key = getActivityKey(activity, index)
    const newSelected = new Set(selectedActivities)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedActivities(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedActivities.size === activities.length) {
      setSelectedActivities(new Set())
    } else {
      setSelectedActivities(new Set(activities.map((a, i) => getActivityKey(a, i))))
    }
  }

  const handleImport = () => {
    setIsLoading(true)

    const itemsToImport: CostItem[] = activities
      .filter((activity, index) => selectedActivities.has(getActivityKey(activity, index)))
      .map((activity, index) => ({
        id: `activity-import-${Date.now()}-${index}`,
        name: activity.title, // 只使用景點名稱，不加 Day X 前綴
        quantity: 1,
        unit_price: null,
        total: 0,
        note: '',
        is_group_cost: false,
      }))

    onImport(itemsToImport)
    setIsLoading(false)
    onClose()
  }

  // 按天分組
  const groupedByDay = useMemo(() => {
    const grouped: Record<number, Array<ActivityItem & { index: number }>> = {}
    activities.forEach((activity, index) => {
      if (!grouped[activity.day]) {
        grouped[activity.day] = []
      }
      grouped[activity.day].push({ ...activity, index })
    })
    return grouped
  }, [activities])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--morandi-gold)]" />
            {IMPORT_ACTIVITIES_DIALOG_LABELS.LABEL_1519}
          </DialogTitle>
          <DialogDescription>{IMPORT_ACTIVITIES_DIALOG_LABELS.SELECT_9050}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 選項區 */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSelectAll}
              className="text-xs text-[var(--morandi-gold)] hover:underline"
            >
              {selectedActivities.size === activities.length
                ? IMPORT_ACTIVITIES_DIALOG_LABELS.取消全選
                : IMPORT_ACTIVITIES_DIALOG_LABELS.全選}
            </button>
          </div>

          {/* 景點列表 */}
          <div className="max-h-[350px] overflow-y-auto space-y-3">
            {Object.entries(groupedByDay)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, dayActivities]) => (
                <div key={day} className="space-y-1">
                  <div className="text-xs font-medium text-[var(--morandi-secondary)] px-1">
                    第 {day} 天
                  </div>
                  {dayActivities.map(activity => {
                    const key = getActivityKey(activity, activity.index)
                    const isSelected = selectedActivities.has(key)
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggle(activity, activity.index)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-[var(--morandi-gold)]/10 border-[var(--morandi-gold)]'
                            : 'bg-card border-border hover:border-border/80'
                        }`}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <MapPin className="w-3.5 h-3.5 text-[var(--morandi-gold)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--morandi-text)] truncate">
                            {activity.title}
                          </div>
                          {activity.description && (
                            <div className="text-xs text-[var(--morandi-secondary)] truncate">
                              {activity.description}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}

            {activities.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-[var(--morandi-secondary)]/30 mx-auto mb-3" />
                <p className="text-sm text-[var(--morandi-secondary)]">
                  {IMPORT_ACTIVITIES_DIALOG_LABELS.NOT_FOUND_2956}
                </p>
              </div>
            )}
          </div>

          {/* 按鈕 */}
          <div className="flex gap-2 pt-2">
            <Button variant="soft-gold" onClick={onClose} className="flex-1 gap-1">
              <X size={16} />
              {IMPORT_ACTIVITIES_DIALOG_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedActivities.size === 0 || isLoading}
              className="flex-1 bg-[var(--morandi-gold)] hover:bg-[var(--morandi-gold-hover)] text-white gap-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
              匯入 {selectedActivities.size > 0 ? `(${selectedActivities.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
