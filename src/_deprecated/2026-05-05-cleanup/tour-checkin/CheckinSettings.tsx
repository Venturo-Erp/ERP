'use client'

import { Switch } from '@/components/ui/switch'
import { Users, UserCheck, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMP_TOURS_LABELS, CHECKIN_SETTINGS_LABELS } from '../../constants/labels'

interface CheckinStats {
  total: number
  checkedIn: number
  notCheckedIn: number
}

interface CheckinSettingsProps {
  enableCheckin: boolean
  onToggle: (enabled: boolean) => void
  stats: CheckinStats
}

export function CheckinSettings({ enableCheckin, onToggle, stats }: CheckinSettingsProps) {
  const percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 報到設定 */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-morandi-secondary mb-3">
          {CHECKIN_SETTINGS_LABELS.報到設定}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                enableCheckin ? 'bg-morandi-green/20' : 'bg-morandi-muted/20'
              )}
            >
              <UserCheck
                size={20}
                className={enableCheckin ? 'text-morandi-green' : 'text-morandi-muted'}
              />
            </div>
            <div>
              <p className="font-medium text-morandi-primary">
                {CHECKIN_SETTINGS_LABELS.啟用報到功能}
              </p>
              <p className="text-xs text-morandi-secondary">
                {enableCheckin
                  ? COMP_TOURS_LABELS.旅客可掃描_QR_Code_報到
                  : COMP_TOURS_LABELS.報到功能已關閉}
              </p>
            </div>
          </div>
          <Switch checked={enableCheckin} onCheckedChange={onToggle} />
        </div>
      </div>

      {/* 報到統計 */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-morandi-secondary mb-3">
          {CHECKIN_SETTINGS_LABELS.報到統計}
        </h3>
        <div className="space-y-3">
          {/* 進度條 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-morandi-primary">
                  {CHECKIN_SETTINGS_LABELS.已報到(stats.checkedIn, stats.total)}
                </span>
                <span className="text-sm font-bold text-morandi-gold">{percentage}%</span>
              </div>
              <div className="h-2 bg-morandi-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-morandi-gold transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 統計數字 */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-morandi-secondary">
                <Users size={14} />
                <span className="text-xs">{CHECKIN_SETTINGS_LABELS.總人數}</span>
              </div>
              <p className="text-lg font-bold text-morandi-primary">{stats.total}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-morandi-green">
                <UserCheck size={14} />
                <span className="text-xs">{CHECKIN_SETTINGS_LABELS.已報到_簡稱}</span>
              </div>
              <p className="text-lg font-bold text-morandi-green">{stats.checkedIn}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-morandi-red">
                <UserX size={14} />
                <span className="text-xs">{CHECKIN_SETTINGS_LABELS.未報到}</span>
              </div>
              <p className="text-lg font-bold text-morandi-red">{stats.notCheckedIn}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
