'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import { useWidgets } from '@/features/dashboard/hooks'
import { WidgetSettingsDialog, AVAILABLE_WIDGETS } from '@/features/dashboard/components'
import type { WidgetType } from '@/features/dashboard/types'
import { useI18n } from '@/lib/i18n/client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DASHBOARD_LABELS } from '@/features/dashboard/constants/labels'

// Sortable Widget Component (remains the same)
function SortableWidget({ id, widget }: { id: string; widget: (typeof AVAILABLE_WIDGETS)[0] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Component = widget.component

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${widget.span === 2 ? 'md:col-span-2' : ''} touch-none`}
      {...attributes}
      {...listeners}
    >
      <Component />
    </div>
  )
}

export function DashboardClient() {
  const router = useRouter()
  const t = useI18n()
  const { isAuthenticated, _hasHydrated, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const { activeWidgets, toggleWidget, reorderWidgets, isLoading: widgetsLoading } = useWidgets()

  // 新系統：使用 isAdmin
  const { isAdmin } = useAuthStore()

  // 過濾可渲染的 widgets（過濾掉沒權限的）
  const filteredActiveWidgets = useMemo(() => {
    return activeWidgets.filter(widgetId => {
      const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId)
      if (!widget) return false
      // 沒有權限限制的 widget 所有人都看得到
      if (!widget.requiredPermission) return true
      // admin_only 只有超級管理員看得到
      if (widget.requiredPermission === 'admin_only') {
        return isAdmin
      }
      return true
    })
  }, [activeWidgets, isAdmin])

  // 設定拖拽感應器（長按 500ms 才觸發，避免影響正常互動）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 8,
      },
    })
  )

  // 處理拖拽結束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = activeWidgets.indexOf(active.id as WidgetType)
      const newIndex = activeWidgets.indexOf(over.id as WidgetType)
      reorderWidgets(oldIndex, newIndex)
    }
  }

  useEffect(() => {
    // 等待 zustand persist hydration 完成
    if (!_hasHydrated) {
      return
    }

    // Hydration 完成後，檢查登入狀態
    if (!isAuthenticated) {
      router.replace('/login')
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, _hasHydrated, router])

  if (isLoading || widgetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold/20 mx-auto"></div>
          <p className="mt-4 text-morandi-muted">{DASHBOARD_LABELS.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <ContentPageLayout
      title={DASHBOARD_LABELS.home}
      breadcrumb={[{ label: DASHBOARD_LABELS.home, href: '/dashboard' }]}
      headerActions={
        <WidgetSettingsDialog activeWidgets={activeWidgets} onToggleWidget={toggleWidget} />
      }
      contentClassName="flex-1 overflow-auto min-h-0"
    >
      {filteredActiveWidgets.length === 0 ? (
        <Card className="p-12 text-center border-morandi-gold/20 shadow-sm rounded-2xl bg-card">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#B5986A]/10 to-[#D4C4A8]/10 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Settings className="h-8 w-8 text-morandi-gold" />
            </div>
            <h3 className="text-lg font-semibold text-morandi-primary mb-2">
              {t('dashboard.no_widgets_title')}
            </h3>
            <p className="text-sm text-morandi-muted mb-6">
              {t('dashboard.no_widgets_description')}
            </p>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredActiveWidgets} strategy={rectSortingStrategy}>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredActiveWidgets.map(widgetId => {
                const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId)
                if (!widget) return null
                return <SortableWidget key={widget.id} id={widget.id} widget={widget} />
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </ContentPageLayout>
  )
}
