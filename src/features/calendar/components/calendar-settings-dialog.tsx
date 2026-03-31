'use client'
/**
 * 行事曆設定 Dialog
 * 控制要顯示哪些類型的事件
 */

import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCalendarStore } from '@/stores'
import { CALENDAR_LABELS } from '@/features/calendar/constants/labels'

export function CalendarSettingsDialog() {
  const { settings, updateSettings } = useCalendarStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-morandi-gold/30 bg-card text-morandi-secondary hover:bg-morandi-gold/10 hover:text-morandi-gold hover:border-morandi-gold transition-all shadow-sm"
        >
          <Settings size={16} />
          {CALENDAR_LABELS.SETTINGS_1131}
        </Button>
      </DialogTrigger>

      <DialogContent level={1} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CALENDAR_LABELS.SETTINGS_1824}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 個人行事曆 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-personal"
              checked={settings.showPersonal}
              onCheckedChange={checked => updateSettings({ showPersonal: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-personal" className="text-base cursor-pointer">
                {CALENDAR_LABELS.LABEL_6154}
              </Label>
              <p className="text-sm text-muted-foreground">{CALENDAR_LABELS.LABEL_7691}</p>
            </div>
          </div>

          {/* 公司行事曆 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-company"
              checked={settings.showCompany}
              onCheckedChange={checked => updateSettings({ showCompany: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-company" className="text-base cursor-pointer">
                {CALENDAR_LABELS.LABEL_5445}
              </Label>
              <p className="text-sm text-muted-foreground">{CALENDAR_LABELS.LABEL_6539}</p>
            </div>
          </div>

          {/* 旅遊團 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-tours"
              checked={settings.showTours}
              onCheckedChange={checked => updateSettings({ showTours: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-tours" className="text-base cursor-pointer">
                {CALENDAR_LABELS.LABEL_8875}
              </Label>
              <p className="text-sm text-muted-foreground">{CALENDAR_LABELS.LABEL_3931}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t border-border pt-4">
          {CALENDAR_LABELS.LABEL_7348}
        </div>
      </DialogContent>
    </Dialog>
  )
}
