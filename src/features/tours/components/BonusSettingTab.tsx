'use client'

import { useState, useCallback, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import type { Tour } from '@/stores/types'
import {
  useTourBonusSettings,
  createTourBonusSetting,
  updateTourBonusSetting,
  deleteTourBonusSetting,
  invalidateTourBonusSettings,
  useWorkspaceBonusDefaults,
} from '@/data'
import { useEmployeeDictionary } from '@/data'
import {
  BONUS_TYPE_LABELS,
  BONUS_CALCULATION_LABELS,
  BONUS_TYPE_BADGE_VARIANTS,
  BONUS_TAB_LABELS,
} from '../constants/bonus-labels'
import { BonusSettingDialog } from './BonusSettingDialog'
import { TOURS_LABELS } from './constants/labels'

interface BonusSettingTabProps {
  tour: Tour
}

export function BonusSettingTab({ tour }: BonusSettingTabProps) {
  const workspace_id = useAuthStore(s => s.user?.workspace_id) ?? ''
  const { items: allSettings, loading } = useTourBonusSettings()
  const { items: defaults } = useWorkspaceBonusDefaults()

  const settings = useMemo(
    () => allSettings?.filter(s => s.tour_id === tour.id) ?? [],
    [allSettings, tour.id]
  )
  const { get: getEmployee } = useEmployeeDictionary()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TourBonusSetting | null>(null)

  const handleAdd = useCallback(() => {
    setEditing(null)
    setDialogOpen(true)
  }, [])

  const handleEdit = useCallback((setting: TourBonusSetting) => {
    setEditing(setting)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(BONUS_TAB_LABELS.confirm_delete)) return
    try {
      await deleteTourBonusSetting(id)
      await invalidateTourBonusSettings()
    } catch (err) {
      logger.error('Failed to delete bonus setting:', err)
    }
  }, [])

  const handleSave = useCallback(
    async (data: {
      type: BonusSettingType
      bonus: number
      bonus_type: BonusCalculationType
      employee_id: string | null
    }) => {
      try {
        if (editing) {
          await updateTourBonusSetting(editing.id, data)
        } else {
          await createTourBonusSetting({
            ...data,
            workspace_id,
            tour_id: tour.id,
          })
        }
        await invalidateTourBonusSettings()
      } catch (err) {
        logger.error('Failed to save bonus setting:', err)
      }
    },
    [editing, workspace_id, tour.id]
  )

  const handleCopyDefaults = useCallback(async () => {
    if (!defaults || defaults.length === 0) return
    try {
      for (const d of defaults) {
        await createTourBonusSetting({
          workspace_id,
          tour_id: tour.id,
          type: d.type,
          bonus: d.bonus,
          bonus_type: d.bonus_type,
          employee_id: d.employee_id,
        })
      }
      await invalidateTourBonusSettings()
    } catch (err) {
      logger.error('Failed to copy defaults:', err)
    }
  }, [defaults, workspace_id, tour.id])

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
        <div className="flex gap-2">
          {defaults && defaults.length > 0 && (!settings || settings.length === 0) && (
            <Button variant="soft-gold" size="sm" onClick={handleCopyDefaults}>
              {BONUS_TAB_LABELS.copy_defaults}
            </Button>
          )}
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {BONUS_TAB_LABELS.add}
          </Button>
        </div>
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
                <th className="text-right px-4 py-2 font-medium w-24" />
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
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BonusSettingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  )
}
