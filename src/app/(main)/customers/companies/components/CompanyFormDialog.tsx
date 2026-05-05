'use client'
/**
 * 企業客戶表單對話框（新增/編輯）
 */

import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { COMPANY_LABELS as L } from '../../constants/labels'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Company } from '@/stores'
import type { CreateCompanyData } from '@/types/company.types'
import { PAYMENT_METHOD_LABELS, PAYMENT_TERMS_OPTIONS } from '@/types/company.types'
import { alert } from '@/lib/ui/alert-dialog'
import { COMPANY_LABELS } from '../constants/labels'

interface CompanyFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCompanyData) => Promise<void>
  workspaceId: string
  company?: Company // 編輯模式時傳入
}

export function CompanyFormDialog({
  isOpen,
  onClose,
  onSubmit,
  workspaceId,
  company,
}: CompanyFormDialogProps) {
  const [formData, setFormData] = useState<CreateCompanyData>({
    workspace_id: workspaceId,
    company_name: '',
    tax_id: null,
    phone: null,
    email: null,
    website: null,
    invoice_title: null,
    invoice_address: null,
    invoice_email: null,
    payment_terms: 30,
    payment_method: 'transfer',
    credit_limit: 0,
    bank_name: null,
    bank_account: null,
    bank_branch: null,
    registered_address: null,
    mailing_address: null,
    vip_level: 0,
    notes: null,
  })

  // 編輯模式：填入現有資料
  useEffect(() => {
    if (company) {
      setFormData({
        workspace_id: company.workspace_id,
        company_name: company.company_name,
        tax_id: company.tax_id,
        phone: company.phone,
        email: company.email,
        website: company.website,
        invoice_title: company.invoice_title,
        invoice_address: company.invoice_address,
        invoice_email: company.invoice_email,
        payment_terms: company.payment_terms,
        payment_method: company.payment_method,
        credit_limit: company.credit_limit,
        bank_name: company.bank_name,
        bank_account: company.bank_account,
        bank_branch: company.bank_branch,
        registered_address: company.registered_address,
        mailing_address: company.mailing_address,
        vip_level: company.vip_level,
        notes: company.notes,
      })
    } else {
      // 重置表單
      setFormData({
        workspace_id: workspaceId,
        company_name: '',
        tax_id: null,
        phone: null,
        email: null,
        website: null,
        invoice_title: null,
        invoice_address: null,
        invoice_email: null,
        payment_terms: 30,
        payment_method: 'transfer',
        credit_limit: 0,
        bank_name: null,
        bank_account: null,
        bank_branch: null,
        registered_address: null,
        mailing_address: null,
        vip_level: 0,
        notes: null,
      })
    }
  }, [company, workspaceId])

  const handleSubmit = async () => {
    if (!formData.company_name.trim()) {
      await alert(L.alert_enter_name, 'warning')
      return
    }

    // Email 格式驗證（非必填，但填了要格式對）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      await alert(L.alert_invalid_email, 'warning')
      return
    }
    if (formData.invoice_email && !emailRegex.test(formData.invoice_email)) {
      await alert(L.alert_invalid_email, 'warning')
      return
    }

    // 電話格式驗證（非必填，但填了要格式對：台灣手機 09 開頭 10 碼，或市話 02-08 開頭）
    const phoneRegex = /^(09\d{8}|0[2-8]\d{7,8})$/
    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/[-\s()]/g, '')
      if (!phoneRegex.test(cleanPhone)) {
        await alert(L.alert_invalid_phone, 'warning')
        return
      }
    }

    await onSubmit(formData)
    onClose()
  }

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={company ? L.dialog_title_edit : L.dialog_title_add}
      subtitle={company ? L.dialog_subtitle_edit(company.company_name) : L.dialog_subtitle_add}
      onSubmit={handleSubmit}
      submitLabel={company ? L.btn_save : L.btn_submit_add}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* 基本資訊 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-morandi-primary border-b border-border pb-2">
            {L.section_basic}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="company_name">
                {L.label_company_name} <span className="text-morandi-red">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                placeholder={L.placeholder_company_name}
              />
            </div>

            <div>
              <Label htmlFor="tax_id">{L.label_tax_id}</Label>
              <Input
                id="tax_id"
                value={formData.tax_id || ''}
                onChange={e => setFormData({ ...formData, tax_id: e.target.value || null })}
                placeholder={COMPANY_LABELS.PLACEHOLDER_TAX_ID}
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="vip_level">{L.label_vip_level}</Label>
              <Select
                value={formData.vip_level.toString()}
                onValueChange={value => setFormData({ ...formData, vip_level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{L.option_normal}</SelectItem>
                  <SelectItem value="1">VIP 1</SelectItem>
                  <SelectItem value="2">VIP 2</SelectItem>
                  <SelectItem value="3">VIP 3</SelectItem>
                  <SelectItem value="4">VIP 4</SelectItem>
                  <SelectItem value="5">VIP 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone">{L.label_phone}</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value || null })}
                placeholder={COMPANY_LABELS.PLACEHOLDER_PHONE}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value || null })}
                placeholder={COMPANY_LABELS.PLACEHOLDER_EMAIL}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="website">{L.label_website}</Label>
              <Input
                id="website"
                value={formData.website || ''}
                onChange={e => setFormData({ ...formData, website: e.target.value || null })}
                placeholder={COMPANY_LABELS.PLACEHOLDER_WEBSITE}
              />
            </div>
          </div>
        </div>

        {/* 付款資訊 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-morandi-primary border-b border-border pb-2">
            {L.section_payment}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">{L.label_payment_method}</Label>
              <Select
                value={formData.payment_method}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    payment_method: value as 'transfer' | 'cash' | 'check' | 'credit_card',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_terms">{L.label_payment_terms}</Label>
              <Select
                value={formData.payment_terms.toString()}
                onValueChange={value =>
                  setFormData({ ...formData, payment_terms: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="credit_limit">{L.label_credit_limit}</Label>
              <Input
                id="credit_limit"
                type="number"
                value={formData.credit_limit}
                onChange={e =>
                  setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })
                }
                placeholder={COMPANY_LABELS.PLACEHOLDER_CREDIT_LIMIT}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* 發票資訊 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-morandi-primary border-b border-border pb-2">
            {L.section_invoice}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="invoice_title">{L.label_invoice_title}</Label>
              <Input
                id="invoice_title"
                value={formData.invoice_title || ''}
                onChange={e => setFormData({ ...formData, invoice_title: e.target.value || null })}
                placeholder={L.placeholder_invoice_title}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="invoice_address">{L.label_invoice_address}</Label>
              <Input
                id="invoice_address"
                value={formData.invoice_address || ''}
                onChange={e =>
                  setFormData({ ...formData, invoice_address: e.target.value || null })
                }
                placeholder={L.placeholder_invoice_address}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="invoice_email">{L.label_invoice_email}</Label>
              <Input
                id="invoice_email"
                type="email"
                value={formData.invoice_email || ''}
                onChange={e => setFormData({ ...formData, invoice_email: e.target.value || null })}
                placeholder={COMPANY_LABELS.PLACEHOLDER_INVOICE_EMAIL}
              />
            </div>
          </div>
        </div>

        {/* 備註 */}
        <div>
          <Label htmlFor="note">{COMPANY_LABELS.FORM_NOTES_LABEL}</Label>
          <Textarea
            id="note"
            value={formData.notes || ''}
            onChange={e => setFormData({ ...formData, notes: e.target.value || null })}
            placeholder={COMPANY_LABELS.FORM_NOTES_PLACEHOLDER}
            rows={3}
          />
        </div>
      </div>
    </FormDialog>
  )
}
