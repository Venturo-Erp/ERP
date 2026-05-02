'use client'

import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Building2,
  Phone,
  Briefcase,
  Landmark,
  Stamp,
  Save,
  Loader2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { SettingsTabs } from '../components/SettingsTabs'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CAPABILITIES, useCapabilities } from '@/lib/permissions'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { COMPANY_LABELS } from '../constants/labels'
import { TourControllerSection, TourAttributesSection } from './tour-features-section'
import { ModuleLoading } from '@/components/module-loading'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const STORAGE_BUCKET = 'company-assets'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface CompanyFormData {
  name: string
  description: string
  logo_url: string
  legal_name: string
  subtitle: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  tax_id: string
  bank_name: string
  bank_branch: string
  bank_account: string
  bank_account_name: string
  company_seal_url: string
  personal_seal_url: string
  invoice_seal_image_url: string
  contract_seal_image_url: string
  /** 預設出帳日期（0=週日 ... 4=週四 ... 6=週六）— 取代 RequestDateInput hardcoded 4 */
  default_billing_day_of_week: number
}

const INITIAL_FORM: CompanyFormData = {
  name: '',
  description: '',
  logo_url: '',
  legal_name: '',
  subtitle: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  tax_id: '',
  bank_name: '',
  bank_branch: '',
  bank_account: '',
  bank_account_name: '',
  company_seal_url: '',
  personal_seal_url: '',
  invoice_seal_image_url: '',
  contract_seal_image_url: '',
  default_billing_day_of_week: 4, // 預設週四
}

function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  fieldName,
  workspaceId,
}: {
  label: string
  hint: string
  value: string
  onChange: (url: string) => void
  fieldName: string
  workspaceId: string
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(COMPANY_LABELS.UNSUPPORTED_FORMAT)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(COMPANY_LABELS.FILE_TOO_LARGE)
        return
      }

      setUploading(true)
      try {
        const ext = file.name.split('.').pop()
        const fileName = `${workspaceId}/${fieldName}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)

        onChange(urlData.publicUrl)
      } catch (error) {
        logger.error(`${COMPANY_LABELS.UPLOAD_FAILED}:`, error)
        toast.error(COMPANY_LABELS.UPLOAD_FAILED)
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, fieldName, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  return (
    <div>
      <Label className="text-sm font-medium text-morandi-primary mb-2 block">{label}</Label>
      <p className="text-xs text-morandi-secondary mb-3">{hint}</p>

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="max-h-32 rounded-lg border border-border object-contain bg-card p-2"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-morandi-red text-white rounded-full p-1 hover:bg-morandi-red/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer',
            'hover:border-morandi-gold/50 hover:bg-morandi-gold/5 transition-colors',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-morandi-gold animate-spin" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-morandi-secondary mb-2" />
              <p className="text-sm text-morandi-secondary">{COMPANY_LABELS.CLICK_TO_UPLOAD}</p>
              <p className="text-xs text-morandi-secondary/60 mt-1">
                {COMPANY_LABELS.SUPPORTED_FORMATS}
              </p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

export default function CompanySettingsPage() {
  const { user } = useAuthStore()
  const { can } = useCapabilities()
  const [form, setForm] = useState<CompanyFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const workspaceId = user?.workspace_id

  const loadCompanyData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(
          'name, description, logo_url, legal_name, subtitle, address, phone, fax, email, website, tax_id, bank_name, bank_branch, bank_account, bank_account_name, company_seal_url, personal_seal_url, invoice_seal_image_url, contract_seal_image_url, default_billing_day_of_week'
        )
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      if (data) {
        const d = data as unknown as Record<string, string | number | null>
        setForm({
          name: (d.name as string) ?? '',
          description: (d.description as string) ?? '',
          logo_url: (d.logo_url as string) ?? '',
          legal_name: (d.legal_name as string) ?? '',
          subtitle: (d.subtitle as string) ?? '',
          address: (d.address as string) ?? '',
          phone: (d.phone as string) ?? '',
          fax: (d.fax as string) ?? '',
          email: (d.email as string) ?? '',
          website: (d.website as string) ?? '',
          tax_id: (d.tax_id as string) ?? '',
          bank_name: (d.bank_name as string) ?? '',
          bank_branch: (d.bank_branch as string) ?? '',
          bank_account: (d.bank_account as string) ?? '',
          bank_account_name: (d.bank_account_name as string) ?? '',
          company_seal_url: (d.company_seal_url as string) ?? '',
          personal_seal_url: (d.personal_seal_url as string) ?? '',
          invoice_seal_image_url: (d.invoice_seal_image_url as string) ?? '',
          contract_seal_image_url: (d.contract_seal_image_url as string) ?? '',
          default_billing_day_of_week: typeof d.default_billing_day_of_week === 'number' ? d.default_billing_day_of_week : 4,
        })
      }
    } catch (error) {
      logger.error(COMPANY_LABELS.LOAD_FAILED, error)
      toast.error(COMPANY_LABELS.LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  // 載入完成後，如果 URL 有 hash 就滾動到目標欄位並高亮
  useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    // 等 DOM 渲染完成
    const timer = setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-4', 'ring-morandi-gold', 'ring-offset-2', 'rounded-lg')
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-morandi-gold', 'ring-offset-2', 'rounded-lg')
        }, 3000)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [loading])

  const handleSave = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      const { name: _name, ...updateData } = form
      const saveData: Record<string, unknown> = {
        ...updateData,
      }
      const { error } = await supabase.from('workspaces').update(saveData).eq('id', workspaceId)

      if (error) throw error
      toast.success(COMPANY_LABELS.SAVE_SUCCESS)
    } catch (error) {
      logger.error(COMPANY_LABELS.SAVE_FAILED, error)
      toast.error(COMPANY_LABELS.SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // 權限檢查
  if (!can(CAPABILITIES.SETTINGS_MANAGE_COMPANY)) {
    return (
      <ContentPageLayout title={COMPANY_LABELS.TITLE}>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-morandi-red mb-4" />
            <p className="text-morandi-secondary">{COMPANY_LABELS.NO_PERMISSION}</p>
          </Card>
        </div>
      </ContentPageLayout>
    )
  }

  if (!workspaceId) {
    return (
      <ContentPageLayout title={COMPANY_LABELS.TITLE}>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-morandi-secondary mb-4" />
            <p className="text-morandi-secondary">{COMPANY_LABELS.NO_WORKSPACE}</p>
          </Card>
        </div>
      </ContentPageLayout>
    )
  }

  if (loading) {
    return (
      <ContentPageLayout title={COMPANY_LABELS.TITLE}>
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout title={COMPANY_LABELS.TITLE} headerActions={<SettingsTabs />}>
      <div className="settings-glass relative max-w-4xl mx-auto space-y-8 p-6">
        {/* 背景光暈 */}
        <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-morandi-gold/40 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-cat-pink/25 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-status-warning-bg/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-morandi-gold/20 rounded-full blur-3xl" />
        </div>
        <style>{`
          .settings-glass > .rounded-xl {
            background: rgba(255,255,255,0.25) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border: 1px solid rgba(255,255,255,0.4) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.2) inset !important;
          }
          .settings-glass select,
          .settings-glass input:not([type="checkbox"]):not([type="file"]),
          .settings-glass textarea {
            background-color: #ffffff !important;
            border-color: rgba(0,0,0,0.1) !important;
          }
        `}</style>
        {/* 基本資訊 */}
        <Card className="rounded-xl shadow-lg border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="h-6 w-6 text-morandi-gold" />
            <h2 className="text-xl font-semibold">{COMPANY_LABELS.BASIC_INFO}</h2>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.COMPANY_NAME}
              </Label>
              <Input value={form.name} disabled className="mt-1.5 bg-morandi-container/30" />
            </div>

            <div id="field-logo_url" className="scroll-mt-24">
              <ImageUploadField
                label={COMPANY_LABELS.LOGO}
                hint={COMPANY_LABELS.LOGO_HINT}
                value={form.logo_url}
                onChange={url => updateField('logo_url', url)}
                fieldName="logo"
                workspaceId={workspaceId}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.DESCRIPTION}
              </Label>
              <Textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder={COMPANY_LABELS.DESCRIPTION_PLACEHOLDER}
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div id="field-legal_name" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.LEGAL_NAME}
              </Label>
              <Input
                value={form.legal_name}
                onChange={e => updateField('legal_name', e.target.value)}
                placeholder={COMPANY_LABELS.LEGAL_NAME_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.SUBTITLE_LABEL}
              </Label>
              <Input
                value={form.subtitle}
                onChange={e => updateField('subtitle', e.target.value)}
                placeholder={COMPANY_LABELS.SUBTITLE_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>

        {/* 聯絡資訊 */}
        <Card className="rounded-xl shadow-lg border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <Phone className="h-6 w-6 text-morandi-gold" />
            <h2 className="text-xl font-semibold">{COMPANY_LABELS.CONTACT_INFO}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div id="field-address" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.ADDRESS}
              </Label>
              <Input
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder={COMPANY_LABELS.ADDRESS_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div id="field-phone" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.PHONE}
              </Label>
              <Input
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder={COMPANY_LABELS.PHONE_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.FAX}
              </Label>
              <Input
                value={form.fax}
                onChange={e => updateField('fax', e.target.value)}
                placeholder={COMPANY_LABELS.FAX_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div id="field-email" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.EMAIL}
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder={COMPANY_LABELS.EMAIL_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.WEBSITE}
              </Label>
              <Input
                value={form.website}
                onChange={e => updateField('website', e.target.value)}
                placeholder={COMPANY_LABELS.WEBSITE_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>

        {/* 商業資訊 */}
        <Card className="rounded-xl shadow-lg border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="h-6 w-6 text-morandi-gold" />
            <h2 className="text-xl font-semibold">{COMPANY_LABELS.BUSINESS_INFO}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div id="field-tax_id" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.TAX_ID}
              </Label>
              <Input
                value={form.tax_id}
                onChange={e => updateField('tax_id', e.target.value)}
                placeholder={COMPANY_LABELS.TAX_ID_PLACEHOLDER}
                className="mt-1.5"
                maxLength={8}
              />
            </div>
            <div id="field-default_billing_day_of_week" className="scroll-mt-24">
              <Label className="text-sm font-medium text-morandi-primary">
                預設出帳日期
              </Label>
              <select
                value={form.default_billing_day_of_week}
                onChange={e => updateField('default_billing_day_of_week', Number(e.target.value))}
                className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={0}>週日</option>
                <option value={1}>週一</option>
                <option value={2}>週二</option>
                <option value={3}>週三</option>
                <option value={4}>週四</option>
                <option value={5}>週五</option>
                <option value={6}>週六</option>
              </select>
              <p className="text-xs text-morandi-muted mt-1">
                請款 dialog 在此日期提交視為「正常出帳」、其他日期視為「特殊出帳」
              </p>
            </div>
          </div>
        </Card>

        {/* 銀行資訊 */}
        <Card className="rounded-xl shadow-lg border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <Landmark className="h-6 w-6 text-morandi-gold" />
            <h2 className="text-xl font-semibold">{COMPANY_LABELS.BANK_INFO}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.BANK_NAME}
              </Label>
              <Input
                value={form.bank_name}
                onChange={e => updateField('bank_name', e.target.value)}
                placeholder={COMPANY_LABELS.BANK_NAME_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.BANK_BRANCH}
              </Label>
              <Input
                value={form.bank_branch}
                onChange={e => updateField('bank_branch', e.target.value)}
                placeholder={COMPANY_LABELS.BANK_BRANCH_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.BANK_ACCOUNT}
              </Label>
              <Input
                value={form.bank_account}
                onChange={e => updateField('bank_account', e.target.value)}
                placeholder={COMPANY_LABELS.BANK_ACCOUNT_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {COMPANY_LABELS.BANK_ACCOUNT_NAME}
              </Label>
              <Input
                value={form.bank_account_name}
                onChange={e => updateField('bank_account_name', e.target.value)}
                placeholder={COMPANY_LABELS.BANK_ACCOUNT_NAME_PLACEHOLDER}
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>

        {/* 公司印章 */}
        <Card className="rounded-xl shadow-lg border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <Stamp className="h-6 w-6 text-morandi-gold" />
            <h2 className="text-xl font-semibold">{COMPANY_LABELS.SEAL_INFO}</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div id="field-company_seal_url" className="scroll-mt-24">
              <ImageUploadField
                label="大章（公司章）"
                hint="公司正式印章（建議 PNG 透明背景）"
                value={form.company_seal_url}
                onChange={url => updateField('company_seal_url', url)}
                fieldName="company-seal"
                workspaceId={workspaceId}
              />
            </div>
            <div id="field-personal_seal_url" className="scroll-mt-24">
              <ImageUploadField
                label="小章（負責人章）"
                hint="負責人印章（建議 PNG 透明背景）"
                value={form.personal_seal_url}
                onChange={url => updateField('personal_seal_url', url)}
                fieldName="personal-seal"
                workspaceId={workspaceId}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div id="field-invoice_seal_image_url" className="scroll-mt-24">
              <ImageUploadField
                label={COMPANY_LABELS.INVOICE_SEAL_IMAGE}
                hint={COMPANY_LABELS.INVOICE_SEAL_IMAGE_HINT}
                value={form.invoice_seal_image_url}
                onChange={url => updateField('invoice_seal_image_url', url)}
                fieldName="invoice-seal"
                workspaceId={workspaceId}
              />
            </div>
            <div id="field-contract_seal_image_url" className="scroll-mt-24">
              <ImageUploadField
                label="合約專用章"
                hint="用於電子合約（建議 PNG 透明背景）"
                value={form.contract_seal_image_url}
                onChange={url => updateField('contract_seal_image_url', url)}
                fieldName="contract-seal"
                workspaceId={workspaceId}
              />
            </div>
          </div>
        </Card>

        {/* 儲存按鈕 */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white px-8"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {COMPANY_LABELS.SAVING}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {COMPANY_LABELS.SAVE}
              </>
            )}
          </Button>
        </div>

        {/* 團控功能設定（僅有 tour_controller 功能的租戶顯示） */}
        <TourControllerSection workspaceId={workspaceId} />

        {/* 旅行屬性功能設定（僅有 tour_attributes 功能的租戶顯示） */}
        <TourAttributesSection workspaceId={workspaceId} />
      </div>
    </ContentPageLayout>
  )
}

