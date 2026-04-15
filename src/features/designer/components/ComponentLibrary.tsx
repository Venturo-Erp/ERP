'use client'

/**
 * 元件庫
 *
 * 側邊欄顯示所有設計元件，按分類組織。
 * 使用者點擊元件即可加到當前畫布頁面。
 */

import { useState, useMemo } from 'react'
import {
  Search,
  BookOpen,
  Calendar,
  Info,
  LayoutTemplate,
  Wrench,
  ChevronDown,
  ChevronRight,
  Plane,
  Hotel,
  UtensilsCrossed,
  MapPin,
  PanelTop,
  PanelBottom,
  Minus,
  List,
  StickyNote,
  QrCode,
  Bus,
  Clock,
  Table,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ALL_COMPONENTS,
  COMPONENT_CATEGORIES,
  getComponentsByCategory,
  searchComponents,
} from './design-components'
import type { DesignComponent, ComponentCategory } from './design-components'
import type { CanvasElement } from './types'
import { DESIGNER_LABELS } from './constants/labels'

// 圖示映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  BookOpen,
  Calendar,
  Info,
  Layout: LayoutTemplate,
  Wrench,
  Plane,
  Hotel,
  UtensilsCrossed,
  MapPin,
  PanelTop,
  PanelBottom,
  Minus,
  List,
  StickyNote,
  QrCode,
  Bus,
  Clock,
  Table,
}

// 分類圖示映射
const CATEGORY_ICONS: Record<
  ComponentCategory,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  cover: BookOpen,
  itinerary: Calendar,
  info: Info,
  layout: LayoutTemplate,
  utility: Wrench,
}

interface ComponentLibraryProps {
  onInsertComponent: (elements: CanvasElement[], componentName?: string) => void
  templateData?: Record<string, unknown> | null
}

export function ComponentLibrary({ onInsertComponent, templateData }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<ComponentCategory>>(
    new Set(['cover', 'itinerary', 'info', 'layout', 'utility'])
  )

  const filteredComponents = useMemo(() => {
    if (searchQuery.trim()) {
      return searchComponents(searchQuery)
    }
    return null // null = show by category
  }, [searchQuery])

  const toggleCategory = (cat: ComponentCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleInsert = (component: DesignComponent) => {
    const BLEED = 32
    const CONTENT_WIDTH = 559 - BLEED * 2
    const elements = component.generate({
      width: CONTENT_WIDTH,
      x: BLEED,
      y: 100,
      data: templateData || undefined,
    })
    onInsertComponent(elements, component.name)
  }

  const renderComponentItem = (comp: DesignComponent) => {
    const IconComp = ICON_MAP[comp.icon]

    return (
      <button
        key={comp.id}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-morandi-container/60 transition-colors text-left group"
        onClick={() => handleInsert(comp)}
        title={comp.description}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
            'bg-morandi-container/50 group-hover:bg-morandi-container'
          )}
        >
          {IconComp ? (
            <IconComp size={16} className="text-morandi-secondary" />
          ) : (
            <LayoutTemplate size={16} className="text-morandi-secondary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-morandi-primary truncate">{comp.name}</div>
          <div className="text-[11px] text-morandi-secondary truncate">{comp.description}</div>
        </div>
      </button>
    )
  }

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* 標題 */}
      <div className="p-3 border-b border-border h-[42px] flex items-center">
        <h3 className="font-medium text-sm text-morandi-primary">{DESIGNER_LABELS.LABEL_7516}</h3>
      </div>

      {/* 風格切換 + 搜尋 */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-morandi-secondary" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={DESIGNER_LABELS.SEARCH_3877}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* 元件列表 */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filteredComponents ? (
            // 搜尋結果
            <div className="px-2">
              {filteredComponents.length === 0 ? (
                <p className="text-xs text-morandi-secondary text-center py-6">
                  {DESIGNER_LABELS.NOT_FOUND_3128}
                </p>
              ) : (
                filteredComponents.map(renderComponentItem)
              )}
            </div>
          ) : (
            // 分類顯示
            COMPONENT_CATEGORIES.map(cat => {
              const CatIcon = CATEGORY_ICONS[cat.id]
              const components = getComponentsByCategory(cat.id)
              const isExpanded = expandedCategories.has(cat.id)

              return (
                <div key={cat.id}>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-morandi-container/30 transition-colors"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-morandi-secondary" />
                    ) : (
                      <ChevronRight size={14} className="text-morandi-secondary" />
                    )}
                    <CatIcon size={14} className="text-morandi-gold" />
                    <span className="text-xs font-semibold text-morandi-primary">{cat.name}</span>
                    <span className="text-[10px] text-morandi-secondary ml-auto">
                      {components.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-2 pb-1">{components.map(renderComponentItem)}</div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
