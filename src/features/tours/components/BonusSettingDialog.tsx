'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import { useEmployeesSlim } from '@/data'
import {
  BONUS_TYPE_LABELS,
  BONUS_CALCULATION_LABELS,
  BONUS_TAB_LABELS,
} from '../constants/bonus-labels'

interface BonusSettingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    type: BonusSettingType
    bonus: number
    bonus_type: BonusCalculationType
    employee_id: string | null
  }) => void
  initial?: TourBonusSetting | null
}

export function BonusSettingDialog({
  open,
  onOpenChange,
  onSave,
  initial,
}: BonusSettingDialogProps) {
  const [type, setType] = useState<BonusSettingType>(initial?.type ?? BonusSettingType.PROFIT_TAX)
  const [bonus, setBonus] = useState<string>(initial ? String(initial.bonus) : '0')
  const [bonusType, setBonusType] = useState<BonusCalculationType>(
    initial?.bonus_type ?? BonusCalculationType.PERCENT
  )
  const [employeeId, setEmployeeId] = useState<string | null>(initial?.employee_id ?? null)

  const { items: employees } = useEmployeesSlim()

  useEffect(() => {
    if (initial) {
      setType(initial.type)
      setBonus(String(initial.bonus))
      setBonusType(initial.bonus_type)
      setEmployeeId(initial.employee_id)
    } else {
      setType(BonusSettingType.PROFIT_TAX)
      setBonus('0')
      setBonusType(BonusCalculationType.PERCENT)
      setEmployeeId(null)
    }
  }, [initial, open])

  const employeeOptions = (employees ?? []).map(e => ({
    value: e.id,
    label: e.display_name || e.chinese_name || e.english_name || e.id,
  }))

  const needsEmployee = type === BonusSettingType.OP_BONUS || type === BonusSettingType.SALE_BONUS

  const handleSave = () => {
    onSave({
      type,
      bonus: Number(bonus) || 0,
      bonus_type: bonusType,
      employee_id: needsEmployee ? employeeId : null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? BONUS_TAB_LABELS.edit : BONUS_TAB_LABELS.add}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 類型選擇 */}
          <div className="space-y-1.5">
            <Label>{BONUS_TAB_LABELS.type}</Label>
            <Select
              value={String(type)}
              onValueChange={v => setType(Number(v) as BonusSettingType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BONUS_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 數值輸入 */}
          <div className="space-y-1.5">
            <Label>{BONUS_TAB_LABELS.bonus_value}</Label>
            <Input
              type="number"
              value={bonus}
              onChange={e => setBonus(e.target.value)}
              min={0}
              step="0.01"
            />
          </div>

          {/* 計算方式 */}
          <div className="space-y-1.5">
            <Label>{BONUS_TAB_LABELS.calculation_type}</Label>
            <Select
              value={String(bonusType)}
              onValueChange={v => setBonusType(Number(v) as BonusCalculationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BONUS_CALCULATION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 員工選擇（OP/業務獎金需要） */}
          {needsEmployee && (
            <div className="space-y-1.5">
              <Label>{BONUS_TAB_LABELS.employee}</Label>
              <Combobox
                options={employeeOptions}
                value={employeeId ?? ''}
                onChange={val => setEmployeeId(val || null)}
                placeholder={BONUS_TAB_LABELS.employee}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
            {BONUS_TAB_LABELS.CANCEL}
          </Button>
          <Button onClick={handleSave}>{BONUS_TAB_LABELS.SAVE}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
