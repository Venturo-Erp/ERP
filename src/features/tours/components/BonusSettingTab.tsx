'use client'

import { useState, useMemo } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import type { Tour } from '@/stores/types'
import { useTourBonusSettings, useEmployeeDictionary } from '@/data'
import {
  BONUS_TYPE_LABELS,
  BONUS_CALCULATION_LABELS,
  BONUS_TYPE_BADGE_VARIANTS,
  BONUS_TAB_LABELS,
} from '../constants/bonus-labels'
import { BonusSettingsDialog } from './BonusSettingsDialog'
import { TOURS_LABELS } from './constants/labels'

interface BonusSettingTabProps {
  tour: Tour
}

export function BonusSettingTab({ tour }: BonusSettingTabProps) {
  const { items: allSettings, loading } = useTourBonusSettings()

  const settings = useMemo(
    () => (allSettings ?? []).filter(s => s.tour_id === tour.id),
    [allSettings, tour.id]
  )
  const { get: getEmployee } = useEmployeeDictionary()

  const [dialogOpen, setDialogOpen] = useState(false)

  const getEmployeeName = (employeeId: string | null): string => {
    if (!employeeId) return BONUS_TAB_LABELS.no_employee
    const emp = getEmployee(employeeId)
    return emp?.display_name || emp?.chinese_name || employeeId
  }

  const formatBonusValue = (setting: TourBonusSetting): string => {
    const val = Number(setting.bonus)
    const calcLabel = BONUS_CALCULATION_LABELS[setting.bonus_type as BonusCalculationType]
    if (
      setting.bonus_type === BonusCalculationType.PERCENT ||
      setting.bonus_type === BonusCalculationType.MINUS_PERCENT
    ) {
      return `${val}% (${calcLabel})`
    }
    return `$${val} (${calcLabel})`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{BONUS_TAB_LABELS.title}</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1" />
          編輯獎金設定
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          {TOURS_LABELS.LOADING_9771}
        </div>
      ) : !settings || settings.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          {BONUS_TAB_LABELS.no_settings}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{BONUS_TAB_LABELS.type}</th>
                <th className="text-left px-4 py-2 font-medium">{BONUS_TAB_LABELS.bonus_value}</th>
                <th className="text-left px-4 py-2 font-medium">{BONUS_TAB_LABELS.employee}</th>
                <th className="text-left px-4 py-2 font-medium">項目說明</th>
              </tr>
            </thead>
            <tbody>
              {settings.map(s => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BONUS_TYPE_BADGE_VARIANTS[s.type as BonusSettingType] || ''}`}
                    >
                      {BONUS_TYPE_LABELS[s.type as BonusSettingType] || s.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{formatBonusValue(s)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {getEmployeeName(s.employee_id)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BonusSettingsDialog open={dialogOpen} onOpenChange={setDialogOpen} tour={tour} />
    </div>
  )
}
