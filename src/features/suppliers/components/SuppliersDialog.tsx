'use client'
/**
 * SuppliersDialog - 供應商對話框（僅基本資訊）
 */

import React from 'react'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LABELS } from '../constants/labels'

type SupplierFormData = {
  name: string
  bank_name: string
  bank_account: string
  notes: string
}

interface SuppliersDialogProps {
  isOpen: boolean
  onClose: () => void
  formData: SupplierFormData
  onFormFieldChange: <K extends keyof SupplierFormData>(
    field: K,
    value: SupplierFormData[K]
  ) => void
  onSubmit: () => void
  isEditMode?: boolean
}

export const SuppliersDialog: React.FC<SuppliersDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormFieldChange,
  onSubmit,
  isEditMode = false,
}) => {
  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={isEditMode ? LABELS.editSupplier : LABELS.addSupplier}
      subtitle={isEditMode ? LABELS.editSubtitle : LABELS.addSubtitle}
      onSubmit={onSubmit}
      submitLabel={isEditMode ? LABELS.saveChanges : LABELS.addSupplier}
      submitDisabled={!formData.name}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* 供應商名稱 */}
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {LABELS.supplierName} <span className="text-morandi-red">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={e => onFormFieldChange('name', e.target.value)}
            placeholder={LABELS.supplierNamePlaceholder}
            className="mt-1"
          />
        </div>

        {/* 出帳帳號資訊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.bankName}
            </label>
            <Input
              value={formData.bank_name}
              onChange={e => onFormFieldChange('bank_name', e.target.value)}
              placeholder={LABELS.bankNamePlaceholder}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.bankAccount}
            </label>
            <Input
              value={formData.bank_account}
              onChange={e => onFormFieldChange('bank_account', e.target.value)}
              placeholder={LABELS.bankAccountPlaceholder}
              className="mt-1"
            />
          </div>
        </div>

        {/* 備註 */}
        <div>
          <label className="text-sm font-medium text-morandi-primary">{LABELS.notes}</label>
          <Textarea
            value={formData.notes}
            onChange={e => onFormFieldChange('notes', e.target.value)}
            placeholder={LABELS.notesPlaceholder}
            rows={3}
            className="mt-1"
          />
        </div>
      </div>
    </FormDialog>
  )
}
