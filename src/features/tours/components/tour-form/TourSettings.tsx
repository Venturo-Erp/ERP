'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { useEmployeesSlim } from '@/data'
import type { NewTourData } from '../../types'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface SelectorField {
  id: string
  name: string
  level: 'tour' | 'order'
  is_required: boolean
  roles: { id: string; name: string }[]
}

interface TourSettingsProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourSettings({ newTour, setNewTour }: TourSettingsProps) {
  const { items: employees } = useEmployeesSlim()
  const [selectorFields, setSelectorFields] = useState<SelectorField[]>([])
  const [loading, setLoading] = useState(true)

  // 載入團級選人欄位
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/job-roles/selector-fields')
        if (res.ok) {
          const data: SelectorField[] = await res.json()
          setSelectorFields(data.filter(f => f.level === 'tour'))
        }
      } catch (err) {
        logger.error('Failed to fetch selector fields:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  // 所有在職員工（離職員工 status 會切到非 'active'，無需另外擋）
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.status === 'active')
  }, [employees])

  // 根據欄位映射的職務過濾員工
  const getFilteredEmployees = (field: SelectorField) => {
    if (field.roles.length === 0) return activeEmployees

    const roleIds = new Set(field.roles.map(r => r.id))
    return activeEmployees.filter(emp => {
      const empRoleId = (emp as unknown as { role_id?: string }).role_id
      return empRoleId && roleIds.has(empRoleId)
    })
  }

  const handleAssignment = (fieldId: string, employeeId: string) => {
    setNewTour(prev => ({
      ...prev,
      role_assignments: {
        ...prev.role_assignments,
        [fieldId]: employeeId || '',
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-morandi-secondary" />
      </div>
    )
  }

  // 沒有設定任何團級選人欄位
  if (selectorFields.length === 0) return null

  return (
    <div className="space-y-4">
      {selectorFields.map(field => {
        const filtered = getFilteredEmployees(field)
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {field.name}{' '}
              {field.is_required ? (
                <span className="text-morandi-red">*</span>
              ) : (
                <span className="text-morandi-secondary font-normal">(選填)</span>
              )}
            </label>
            <Combobox
              options={filtered.map(emp => ({
                value: emp.id,
                label: `${emp.display_name || emp.english_name} (${emp.employee_number})`,
              }))}
              value={newTour.role_assignments?.[field.id] || ''}
              onChange={value => handleAssignment(field.id, value)}
              placeholder={`選擇${field.name}...`}
              emptyMessage={`找不到可選的${field.name}`}
              showSearchIcon={true}
              showClearButton={true}
              disablePortal={true}
            />
          </div>
        )
      })}
    </div>
  )
}
