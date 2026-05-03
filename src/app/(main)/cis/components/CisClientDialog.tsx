'use client'

/**
 * CIS 客戶 Dialog（新增 + 編輯共用）
 *
 * 收集基本資料 + 旅遊類型 chips + 自由標籤。
 * 防連點：submit 過程 disabled={loading}。
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

import type { CisClient, CisClientStatus, CreateCisClientData } from '@/types/cis.types'
import { CIS_TRAVEL_TYPE_OPTIONS } from '@/types/cis.types'
import { CIS_CLIENT_FORM_LABELS as L, CIS_PAGE_LABELS as P } from '../constants/labels'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialClient: CisClient | null
  statusOptions: { value: CisClientStatus; label: string }[]
  onSubmit: (data: CreateCisClientData) => Promise<void>
}

interface FormState {
  company_name: string
  contact_name: string
  phone: string
  email: string
  address: string
  status: CisClientStatus
  travel_types: string[]
  tags_text: string
  notes: string
}

const EMPTY_FORM: FormState = {
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  status: 'lead',
  travel_types: [],
  tags_text: '',
  notes: '',
}

function fromClient(c: CisClient | null): FormState {
  if (!c) return { ...EMPTY_FORM }
  return {
    company_name: c.company_name || '',
    contact_name: c.contact_name || '',
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
    status: c.status,
    travel_types: c.travel_types || [],
    tags_text: (c.tags || []).join('、'),
    notes: c.notes || '',
  }
}

export function CisClientDialog({
  open,
  onOpenChange,
  mode,
  initialClient,
  statusOptions,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setForm(fromClient(initialClient))
  }, [open, initialClient])

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const toggleTravelType = (t: string) => {
    setForm(prev => ({
      ...prev,
      travel_types: prev.travel_types.includes(t)
        ? prev.travel_types.filter(x => x !== t)
        : [...prev.travel_types, t],
    }))
  }

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      toast.error('公司名稱必填')
      return
    }
    setSubmitting(true)
    try {
      const tags = form.tags_text
        .split(/[,，、\s]+/)
        .map(s => s.trim())
        .filter(Boolean)

      const payload: CreateCisClientData = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        status: form.status,
        travel_types: form.travel_types,
        tags,
        notes: form.notes.trim() || null,
      }

      await onSubmit(payload)
      toast.success(mode === 'create' ? L.toast_create_success : L.toast_update_success)
      onOpenChange(false)
    } catch (e) {
      toast.error(
        `${mode === 'create' ? L.toast_create_failed : L.toast_update_failed}：${(e as Error).message}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => (!submitting ? onOpenChange(v) : undefined)}>
      <DialogContent level={1} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? L.add_title : L.edit_title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* 基本資料 */}
          <section className="grid gap-3">
            <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {L.section_basic}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`${L.label_company_name} *`}>
                <Input
                  value={form.company_name}
                  onChange={e => update('company_name', e.target.value)}
                  placeholder={L.placeholder_company_name}
                  disabled={submitting}
                  autoFocus
                />
              </Field>
              <Field label={L.label_contact_name}>
                <Input
                  value={form.contact_name}
                  onChange={e => update('contact_name', e.target.value)}
                  placeholder={L.placeholder_contact_name}
                  disabled={submitting}
                />
              </Field>
              <Field label={L.label_phone}>
                <Input
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder={L.placeholder_phone}
                  disabled={submitting}
                />
              </Field>
              <Field label={L.label_email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder={L.placeholder_email}
                  disabled={submitting}
                />
              </Field>
              <Field label={L.label_address} className="col-span-2">
                <Input
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder={L.placeholder_address}
                  disabled={submitting}
                />
              </Field>
              <Field label={L.label_status}>
                <select
                  value={form.status}
                  onChange={e => update('status', e.target.value as CisClientStatus)}
                  disabled={submitting}
                  className="h-9 px-2 rounded-md border border-morandi-muted/40 bg-background text-sm text-morandi-primary focus:outline-none focus:ring-1 focus:ring-morandi-gold/40"
                >
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* 品牌標籤 */}
          <section className="grid gap-3">
            <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {L.section_brand}
            </h3>

            <Field label={L.label_travel_types}>
              <div className="flex flex-wrap gap-2">
                {CIS_TRAVEL_TYPE_OPTIONS.map(t => {
                  const on = form.travel_types.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={submitting}
                      onClick={() => toggleTravelType(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        on
                          ? 'bg-morandi-gold/15 border-morandi-gold/40 text-morandi-gold'
                          : 'bg-transparent border-morandi-muted/40 text-morandi-secondary hover:border-morandi-gold/30'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label={L.label_tags}>
              <Input
                value={form.tags_text}
                onChange={e => update('tags_text', e.target.value)}
                placeholder={L.placeholder_tags}
                disabled={submitting}
              />
            </Field>

            <Field label={L.label_notes}>
              <Textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder={L.placeholder_notes}
                disabled={submitting}
                rows={3}
              />
            </Field>
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {P.btn_cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.company_name.trim()}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? P.btn_saving : P.btn_save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-1.5 ${className || ''}`}>
      <Label className="text-xs text-morandi-primary">{label}</Label>
      {children}
    </div>
  )
}
