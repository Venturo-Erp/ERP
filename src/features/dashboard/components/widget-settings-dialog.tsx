'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/stores/auth-store'
import type { WidgetType } from '../types'
import { AVAILABLE_WIDGETS } from './widget-config'
import { DASHBOARD_LABELS } from './constants/labels'

interface WidgetSettingsDialogProps {
  activeWidgets: WidgetType[]
  onToggleWidget: (widgetId: WidgetType) => void
}

export function WidgetSettingsDialog({ activeWidgets, onToggleWidget }: WidgetSettingsDialogProps) {
  // 新系統：使用 isAdmin
  const { isAdmin } = useAuthStore()

  // 過濾可見的 widgets
  const visibleWidgets = useMemo(() => {
    return AVAILABLE_WIDGETS.filter(widget => {
      // 沒有權限限制的 widget 所有人都看得到
      if (!widget.requiredPermission) return true
      // admin_only 只有超級管理員看得到
      if (widget.requiredPermission === 'admin_only') {
        return isAdmin
      }
      return true
    })
  }, [isAdmin])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-card border-morandi-gold/20 hover:border-morandi-gold transition-all rounded-xl"
        >
          <Settings className="h-4 w-4" />
          {DASHBOARD_LABELS.SETTINGS_4196}
        </Button>
      </DialogTrigger>
      <DialogContent
        level={1}
        className="sm:max-w-2xl border-morandi-gold/20 shadow-lg rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-morandi-primary">
            {DASHBOARD_LABELS.SELECT_1019}
          </DialogTitle>
          <p className="text-sm text-morandi-muted mt-1">{DASHBOARD_LABELS.LABEL_5024}</p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {visibleWidgets.map(widget => {
            const Icon = widget.icon as React.ComponentType<{ className?: string }>
            return (
              <div
                key={widget.id}
                className="flex items-center space-x-3 p-3 rounded-xl border border-morandi-gold/20 bg-card hover:border-morandi-gold cursor-pointer transition-all shadow-sm"
                onClick={() => onToggleWidget(widget.id as WidgetType)}
              >
                <Checkbox
                  checked={activeWidgets.includes(widget.id as WidgetType)}
                  onCheckedChange={() => onToggleWidget(widget.id as WidgetType)}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#B5986A]/10 to-[#D4C4A8]/10 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Icon className="h-4 w-4 text-morandi-gold" />
                  </div>
                  <span className="font-medium text-morandi-primary text-sm truncate">
                    {widget.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
