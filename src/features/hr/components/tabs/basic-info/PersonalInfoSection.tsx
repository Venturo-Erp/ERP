'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Calendar } from 'lucide-react'
import { DateCell } from '@/components/table-cells'
import { EmployeeFull } from '@/stores/types'
import { BasicInfoFormData } from './types'
import { COMP_HR_LABELS } from '@/features/hr/constants/labels'

interface PersonalInfoSectionProps {
  employee: EmployeeFull
  isEditing: boolean
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

export function PersonalInfoSection({
  employee,
  isEditing,
  formData,
  setFormData,
}: PersonalInfoSectionProps) {
  return (
    <div className="bg-morandi-container/10 rounded-lg p-4">
      <h4 className="font-medium text-morandi-primary mb-3">{COMP_HR_LABELS.LABEL_60}</h4>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_9773}
            </label>
            {isEditing ? (
              <Input
                value={formData.display_name}
                onChange={e => setFormData({ ...formData, display_name: e.target.value })}
              />
            ) : (
              <p className="text-morandi-primary py-2">{employee.display_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_9768}
            </label>
            {isEditing ? (
              <Input
                value={formData.chinese_name}
                onChange={e => setFormData({ ...formData, chinese_name: e.target.value })}
              />
            ) : (
              <p className="text-morandi-primary py-2">{employee.chinese_name || '-'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_739}
            </label>
            {isEditing ? (
              <Input
                value={formData.english_name}
                onChange={e => setFormData({ ...formData, english_name: e.target.value })}
              />
            ) : (
              <p className="text-morandi-primary py-2">{employee.english_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_PINYIN}
            </label>
            {isEditing ? (
              <Input
                value={formData.pinyin}
                onChange={e => setFormData({ ...formData, pinyin: e.target.value })}
              />
            ) : (
              <p className="text-morandi-primary py-2">{employee.pinyin || '-'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_4929}
            </label>
            <p className="text-morandi-primary py-2 bg-morandi-container/20 px-3 rounded">
              {employee.employee_number}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_HR_LABELS.LABEL_AUTH_EMAIL}
            </label>
            <p className="text-morandi-primary py-2 bg-morandi-container/20 px-3 rounded">
              {employee.email || '-'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_HR_LABELS.LABEL_3405}
          </label>
          {isEditing ? (
            <Input
              value={formData.personal_info.national_id}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: { ...formData.personal_info, national_id: e.target.value },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">{employee.personal_info.national_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1 flex items-center gap-1">
            <Calendar size={14} />
            {COMP_HR_LABELS.LABEL_8658}
          </label>
          {isEditing ? (
            <DatePicker
              value={formData.personal_info.birth_date}
              onChange={date =>
                setFormData({
                  ...formData,
                  personal_info: { ...formData.personal_info, birth_date: date },
                })
              }
              placeholder={COMP_HR_LABELS.選擇日期}
            />
          ) : (
            <div className="py-2">
              <DateCell date={employee.personal_info.birth_date} showIcon={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
