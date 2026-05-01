'use client'
/**
 * ImportMealsDialog - 從行程表匯入餐飲對話框
 * 可勾選要匯入的餐點（含早餐選項）
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
import { Loader2, UtensilsCrossed, Sun, Cloud, Moon, X, Download } from 'lucide-react'
import { CostItem } from '../types'
import { IMPORT_ACTIVITIES_DIALOG_LABELS, IMPORT_MEALS_DIALOG_LABELS } from '../constants/labels'
import { QUOTE_COMPONENT_LABELS } from '../constants/labels'

interface MealItem {
  day: number
  type: '早餐' | '午餐' | '晚餐'
  name: string
  note?: string
}

interface ImportMealsDialogProps {
  isOpen: boolean
  onClose: () => void
  meals: MealItem[]
  onImport: (items: CostItem[]) => void
}

function ImportMealsDialog({ isOpen, onClose, meals, onImport }: ImportMealsDialogProps) {
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set())
  const [includeBreakfast, setIncludeBreakfast] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 過濾可顯示的餐點
  const filteredMeals = useMemo(() => {
    if (includeBreakfast) {
      return meals
    }
    return meals.filter(meal => meal.type !== '早餐')
  }, [meals, includeBreakfast])

  // 重置選擇
  useEffect(() => {
    if (!isOpen) {
      setSelectedMeals(new Set())
      setIncludeBreakfast(false)
    }
  }, [isOpen])

  // 當 includeBreakfast 改變時，重新選取（排除早餐或包含早餐）
  useEffect(() => {
    setSelectedMeals(new Set())
  }, [includeBreakfast])

  const getMealKey = (meal: MealItem) => `${meal.day}-${meal.type}-${meal.name}`

  const getMealIcon = (type: string) => {
    switch (type) {
      case '早餐':
        return <Sun className="w-3.5 h-3.5 text-morandi-gold" />
      case '午餐':
        return <Cloud className="w-3.5 h-3.5 text-status-info" />
      case '晚餐':
        return <Moon className="w-3.5 h-3.5 text-cat-indigo" />
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5" />
    }
  }

  const handleToggle = (meal: MealItem) => {
    const key = getMealKey(meal)
    const newSelected = new Set(selectedMeals)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedMeals(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMeals.size === filteredMeals.length) {
      setSelectedMeals(new Set())
    } else {
      setSelectedMeals(new Set(filteredMeals.map(getMealKey)))
    }
  }

  const handleImport = () => {
    setIsLoading(true)

    const itemsToImport: CostItem[] = filteredMeals
      .filter(meal => selectedMeals.has(getMealKey(meal)))
      .map((meal, index) => ({
        id: `meal-import-${Date.now()}-${index}`,
        // 加上 Day X 餐別：前綴，讓需求確認單可以正確解析
        name: `Day ${meal.day} ${meal.type}：${meal.name}`,
        quantity: 1,
        unit_price: null,
        total: 0,
        note: '',
        is_group_cost: false,
        day: meal.day, // 保留天數資訊
      }))

    onImport(itemsToImport)
    setIsLoading(false)
    onClose()
  }

  // 按天分組
  const groupedByDay = useMemo(() => {
    const grouped: Record<number, MealItem[]> = {}
    filteredMeals.forEach(meal => {
      if (!grouped[meal.day]) {
        grouped[meal.day] = []
      }
      grouped[meal.day].push(meal)
    })
    return grouped
  }, [filteredMeals])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[var(--morandi-gold)]" />
            {IMPORT_MEALS_DIALOG_LABELS.LABEL_6478}
          </DialogTitle>
          <DialogDescription>{IMPORT_MEALS_DIALOG_LABELS.SELECT_4642}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 選項區 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeBreakfast}
                onCheckedChange={checked => setIncludeBreakfast(checked === true)}
              />
              <span>{IMPORT_MEALS_DIALOG_LABELS.LABEL_9424}</span>
            </label>
            <button
              onClick={handleSelectAll}
              className="text-xs text-[var(--morandi-gold)] hover:underline"
            >
              {selectedMeals.size === filteredMeals.length
                ? IMPORT_ACTIVITIES_DIALOG_LABELS.取消全選
                : IMPORT_ACTIVITIES_DIALOG_LABELS.全選}
            </button>
          </div>

          {/* 餐點列表 */}
          <div className="max-h-[300px] overflow-y-auto space-y-3">
            {Object.entries(groupedByDay)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, dayMeals]) => (
                <div key={day} className="space-y-1">
                  <div className="text-xs font-medium text-[var(--morandi-secondary)] px-1">
                    第 {day} 天
                  </div>
                  {dayMeals.map(meal => {
                    const key = getMealKey(meal)
                    const isSelected = selectedMeals.has(key)
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggle(meal)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-[var(--morandi-gold)]/10 border-[var(--morandi-gold)]'
                            : 'bg-card border-border hover:border-border/80'
                        }`}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        {getMealIcon(meal.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--morandi-text)] truncate">
                            {meal.name}
                          </div>
                          <div className="text-xs text-[var(--morandi-secondary)]">{meal.type}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}

            {filteredMeals.length === 0 && (
              <div className="text-center py-8">
                <UtensilsCrossed className="w-10 h-10 text-[var(--morandi-secondary)]/30 mx-auto mb-3" />
                <p className="text-sm text-[var(--morandi-secondary)]">
                  {IMPORT_MEALS_DIALOG_LABELS.NOT_FOUND_1124}
                </p>
              </div>
            )}
          </div>

          {/* 按鈕 */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 gap-1">
              <X size={16} />
              {IMPORT_MEALS_DIALOG_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedMeals.size === 0 || isLoading}
              className="flex-1 bg-[var(--morandi-gold)] hover:bg-[var(--morandi-gold-hover)] text-white gap-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
              匯入 {selectedMeals.size > 0 ? `(${selectedMeals.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
