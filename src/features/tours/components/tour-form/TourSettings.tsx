'use client'

import React, { useMemo } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { useEmployeesSlim } from '@/data'
import type { Employee } from '@/stores/types'
import type { SyncableEntity } from '@/types'
import type { NewTourData } from '../../types'
import { TOUR_SETTINGS } from '../../constants'

type EmployeeWithSync = Employee & Partial<SyncableEntity>

interface TourSettingsProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourSettings({ newTour, setNewTour }: TourSettingsProps) {
  const { items: employees } = useEmployeesSlim()

  // 篩選團控人員（目前顯示所有在職員工，未來可加「團控」職務）
  const controllers = useMemo(() => {
    return employees.filter(emp => {
      const empWithSync = emp as EmployeeWithSync
      const notDeleted = !empWithSync._deleted
      const isActive = emp.status === 'active'
      const isNotBot = emp.employee_type !== 'bot'
      return notDeleted && isActive && isNotBot
    })
  }, [employees])

  return (
    <div className="space-y-4">
      {/* 團控人員選擇（選填） */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {TOUR_SETTINGS.controller_label}{' '}
          <span className="text-morandi-secondary font-normal">
            {TOUR_SETTINGS.controller_optional}
          </span>
        </label>
        <Combobox
          options={controllers.map(emp => ({
            value: emp.id,
            label: `${emp.display_name || emp.english_name} (${emp.employee_number})`,
          }))}
          value={newTour.controller_id || ''}
          onChange={value => setNewTour(prev => ({ ...prev, controller_id: value || undefined }))}
          placeholder={TOUR_SETTINGS.controller_placeholder}
          emptyMessage={TOUR_SETTINGS.controller_empty}
          showSearchIcon={true}
          showClearButton={true}
          disablePortal={true}
        />
      </div>

    </div>
  )
}
