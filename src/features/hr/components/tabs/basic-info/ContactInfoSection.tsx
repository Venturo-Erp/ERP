'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, Mail, MapPin, Plus, Trash2 } from 'lucide-react'
import { EmployeeFull } from '@/stores/types'
import { BasicInfoFormData } from './types'
import { BASIC_INFO_LABELS } from './constants/labels'

interface ContactInfoSectionProps {
  employee: EmployeeFull
  isEditing: boolean
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

export function ContactInfoSection({
  employee,
  isEditing,
  formData,
  setFormData,
}: ContactInfoSectionProps) {
  return (
    <div className="bg-morandi-container/10 rounded-lg p-4">
      <h4 className="font-medium text-morandi-primary mb-3">{BASIC_INFO_LABELS.LABEL_8029}</h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Phone size={14} />
              {BASIC_INFO_LABELS.LABEL_5110}
            </span>
            {isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const phones = Array.isArray(formData.personal_info.phone)
                    ? formData.personal_info.phone
                    : [formData.personal_info.phone]
                  setFormData({
                    ...formData,
                    personal_info: {
                      ...formData.personal_info,
                      phone: [...phones, ''],
                    },
                  })
                }}
                className="h-6 text-xs"
              >
                <Plus size={12} className="mr-1" />
                {BASIC_INFO_LABELS.ADD_3363}
              </Button>
            )}
          </label>
          {isEditing ? (
            <div className="space-y-2">
              {(Array.isArray(formData.personal_info.phone)
                ? formData.personal_info.phone
                : [formData.personal_info.phone]
              ).map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={phone}
                    onChange={e => {
                      const phones = Array.isArray(formData.personal_info.phone)
                        ? [...formData.personal_info.phone]
                        : [formData.personal_info.phone]
                      phones[index] = e.target.value
                      setFormData({
                        ...formData,
                        personal_info: { ...formData.personal_info, phone: phones },
                      })
                    }}
                    placeholder={`電話 ${index + 1}`}
                  />
                  {(Array.isArray(formData.personal_info.phone)
                    ? formData.personal_info.phone.length
                    : 1) > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const phones = Array.isArray(formData.personal_info.phone)
                          ? formData.personal_info.phone.filter((_, i) => i !== index)
                          : []
                        setFormData({
                          ...formData,
                          personal_info: { ...formData.personal_info, phone: phones },
                        })
                      }}
                      className="text-status-danger hover:text-status-danger"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(Array.isArray(employee.personal_info.phone)
                ? employee.personal_info.phone
                : [employee.personal_info.phone]
              ).map((phone, index) => (
                <p key={index} className="text-morandi-primary py-2">
                  {phone || '-'}
                </p>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1 flex items-center gap-1">
            <Mail size={14} />
            Email
          </label>
          {isEditing ? (
            <Input
              type="email"
              value={formData.personal_info.email}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: { ...formData.personal_info, email: e.target.value },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">{employee.personal_info.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1 flex items-center gap-1">
            <MapPin size={14} />
            {BASIC_INFO_LABELS.LABEL_8201}
          </label>
          {isEditing ? (
            <Input
              value={formData.personal_info.address}
              onChange={e =>
                setFormData({
                  ...formData,
                  personal_info: { ...formData.personal_info, address: e.target.value },
                })
              }
            />
          ) : (
            <p className="text-morandi-primary py-2">{employee.personal_info.address}</p>
          )}
        </div>
      </div>
    </div>
  )
}
