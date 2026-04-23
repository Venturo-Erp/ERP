'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { EmployeeFull } from '@/stores/types'
import { BasicInfoFormData } from './types'
import { BASIC_INFO_LABELS } from './constants/labels'

interface EmergencyContactSectionProps {
  employee: EmployeeFull
  isEditing: boolean
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

export function EmergencyContactSection({
  employee,
  isEditing,
  formData,
  setFormData,
}: EmergencyContactSectionProps) {
  return (
    <div className="bg-morandi-container/10 rounded-lg p-4">
      <h4 className="font-medium text-morandi-primary mb-3">{BASIC_INFO_LABELS.LABEL_9309}</h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {BASIC_INFO_LABELS.LABEL_658}
          </label>
          {isEditing ? (
            <Input
              value={formData.personal_info.emergency_contact.name}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: {
                    ...formData.personal_info,
                    emergency_contact: {
                      ...formData.personal_info.emergency_contact,
                      name: e.target.value,
                    },
                  },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">
              {employee.personal_info?.emergency_contact?.name || '-'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {BASIC_INFO_LABELS.LABEL_6532}
          </label>
          {isEditing ? (
            <Input
              value={formData.personal_info.emergency_contact.relationship}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: {
                    ...formData.personal_info,
                    emergency_contact: {
                      ...formData.personal_info.emergency_contact,
                      relationship: e.target.value,
                    },
                  },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">
              {employee.personal_info?.emergency_contact?.relationship || '-'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {BASIC_INFO_LABELS.LABEL_6280}
          </label>
          {isEditing ? (
            <Input
              value={formData.personal_info.emergency_contact.phone}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: {
                    ...formData.personal_info,
                    emergency_contact: {
                      ...formData.personal_info.emergency_contact,
                      phone: e.target.value,
                    },
                  },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">
              {employee.personal_info?.emergency_contact?.phone || '-'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
