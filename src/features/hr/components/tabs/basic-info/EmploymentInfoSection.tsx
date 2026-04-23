'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { DateCell } from '@/components/table-cells'
import { EmployeeFull } from '@/stores/types'
import { BasicInfoFormData } from './types'
import { COMP_HR_LABELS } from '@/features/hr/constants/labels'

interface EmploymentInfoSectionProps {
  employee: EmployeeFull
  isEditing: boolean
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

export function EmploymentInfoSection({
  employee,
  isEditing,
  formData,
  setFormData,
}: EmploymentInfoSectionProps) {
  return (
    <div className="bg-morandi-container/10 rounded-lg p-4">
      <h4 className="font-medium text-morandi-primary mb-4 pt-1">{COMP_HR_LABELS.LABEL_2872}</h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_HR_LABELS.LABEL_4197}
          </label>
          {isEditing ? (
            <Input
              value={formData.job_info.position || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  job_info: { ...formData.job_info, position: e.target.value },
                })
              }
              placeholder={COMP_HR_LABELS.輸入職位}
            />
          ) : (
            <p className="text-morandi-primary py-2">
              {employee.job_info?.position || COMP_HR_LABELS.未設定}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_HR_LABELS.LABEL_9610}
          </label>
          {isEditing ? (
            <DatePicker
              value={formData.job_info.hire_date}
              onChange={date =>
                setFormData({
                  ...formData,
                  job_info: { ...formData.job_info, hire_date: date },
                })
              }
              placeholder={COMP_HR_LABELS.選擇日期}
            />
          ) : (
            <div className="py-2">
              <DateCell date={employee.job_info.hire_date} showIcon={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
