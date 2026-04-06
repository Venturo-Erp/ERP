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
  FolderTree,
  Plus,
  Pencil,
  Trash2,
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
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { COMPANY_LABELS } from '../constants/labels'
import { useWorkspaceFeatures } from '@/lib/permissions'
import {
  useDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  invalidateDepartments,
} from '@/data'
import type { Department } from '@/data'

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
            className="max-h-32 rounded-lg border border-border object-contain bg-white p-2"
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
  const { user, isAdmin } = useAuthStore()
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
          'name, description, logo_url, legal_name, subtitle, address, phone, fax, email, website, tax_id, bank_name, bank_branch, bank_account, bank_account_name, company_seal_url, personal_seal_url, invoice_seal_image_url, contract_seal_image_url'
        )
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      if (data) {
        const d = data as unknown as Record<string, string | null>
        setForm({
          name: d.name ?? '',
          description: d.description ?? '',
          logo_url: d.logo_url ?? '',
          legal_name: d.legal_name ?? '',
          subtitle: d.subtitle ?? '',
          address: d.address ?? '',
          phone: d.phone ?? '',
          fax: d.fax ?? '',
          email: d.email ?? '',
          website: d.website ?? '',
          tax_id: d.tax_id ?? '',
          bank_name: d.bank_name ?? '',
          bank_branch: d.bank_branch ?? '',
          bank_account: d.bank_account ?? '',
          bank_account_name: d.bank_account_name ?? '',
          company_seal_url: d.company_seal_url ?? '',
          personal_seal_url: d.personal_seal_url ?? '',
          invoice_seal_image_url: d.invoice_seal_image_url ?? '',
          contract_seal_image_url: d.contract_seal_image_url ?? '',
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

  const handleSave = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      const { name: _name, ...updateData } = form
      const { error } = await supabase.from('workspaces').update(updateData).eq('id', workspaceId)

      if (error) throw error
      toast.success(COMPANY_LABELS.SAVE_SUCCESS)
    } catch (error) {
      logger.error(COMPANY_LABELS.SAVE_FAILED, error)
      toast.error(COMPANY_LABELS.SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof CompanyFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // 權限檢查
  if (!isAdmin) {
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
        <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-morandi-gold" />
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout title={COMPANY_LABELS.TITLE} headerActions={<SettingsTabs />}>
      <div className="settings-glass relative max-w-4xl mx-auto space-y-8 p-6">
        {/* 背景光暈 */}
        <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-morandi-gold/40 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-rose-300/25 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
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

            <ImageUploadField
              label={COMPANY_LABELS.LOGO}
              hint={COMPANY_LABELS.LOGO_HINT}
              value={form.logo_url}
              onChange={url => updateField('logo_url', url)}
              fieldName="logo"
              workspaceId={workspaceId}
            />

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

            <div>
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
            <div>
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
            <div>
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
            <div>
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
          <div>
            <Label className="text-sm font-medium text-morandi-primary">
              {COMPANY_LABELS.TAX_ID}
            </Label>
            <Input
              value={form.tax_id}
              onChange={e => updateField('tax_id', e.target.value)}
              placeholder={COMPANY_LABELS.TAX_ID_PLACEHOLDER}
              className="mt-1.5 max-w-xs"
              maxLength={8}
            />
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
            <ImageUploadField
              label="大章（公司章）"
              hint="公司正式印章（建議 PNG 透明背景）"
              value={form.company_seal_url}
              onChange={url => updateField('company_seal_url', url)}
              fieldName="company-seal"
              workspaceId={workspaceId}
            />
            <ImageUploadField
              label="小章（負責人章）"
              hint="負責人印章（建議 PNG 透明背景）"
              value={form.personal_seal_url}
              onChange={url => updateField('personal_seal_url', url)}
              fieldName="personal-seal"
              workspaceId={workspaceId}
            />
          </div>
          <div className="grid grid-cols-2 gap-6 mt-6">
            <ImageUploadField
              label={COMPANY_LABELS.INVOICE_SEAL_IMAGE}
              hint={COMPANY_LABELS.INVOICE_SEAL_IMAGE_HINT}
              value={form.invoice_seal_image_url}
              onChange={url => updateField('invoice_seal_image_url', url)}
              fieldName="invoice-seal"
              workspaceId={workspaceId}
            />
            <ImageUploadField
              label="合約專用章"
              hint="用於電子合約（建議 PNG 透明背景）"
              value={form.contract_seal_image_url}
              onChange={url => updateField('contract_seal_image_url', url)}
              fieldName="contract-seal"
              workspaceId={workspaceId}
            />
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

        {/* 部門管理（僅有 departments 功能的租戶顯示） */}
        <DepartmentsSection workspaceId={workspaceId} />
      </div>
    </ContentPageLayout>
  )
}

// ============================================
// 部門管理區塊（僅 departments 功能開啟時顯示）
// ============================================
function DepartmentsSection({ workspaceId }: { workspaceId: string }) {
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasDepartments = isFeatureEnabled('departments')
  const { items: departments = [], loading } = useDepartments()
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  if (!hasDepartments) return null

  const handleAdd = async () => {
    if (!name.trim() || !code.trim()) return
    setSaving(true)
    try {
      await createDepartment({ name: name.trim(), code: code.trim().toUpperCase() } as Parameters<
        typeof createDepartment
      >[0])
      await invalidateDepartments()
      setName('')
      setCode('')
      setIsAdding(false)
      toast.success('部門已新增')
    } catch {
      toast.error('新增失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingDept || !name.trim() || !code.trim()) return
    setSaving(true)
    try {
      await updateDepartment(editingDept.id, { name: name.trim(), code: code.trim().toUpperCase() })
      await invalidateDepartments()
      setEditingDept(null)
      setName('')
      setCode('')
      toast.success('部門已更新')
    } catch {
      toast.error('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`確定要刪除「${dept.name}」嗎？`)) return
    try {
      await deleteDepartment(dept.id)
      await invalidateDepartments()
      toast.success('部門已刪除')
    } catch {
      toast.error('刪除失敗')
    }
  }

  const startEdit = (dept: Department) => {
    setEditingDept(dept)
    setName(dept.name)
    setCode(dept.code)
    setIsAdding(false)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingDept(null)
    setName('')
    setCode('')
  }

  const cancel = () => {
    setIsAdding(false)
    setEditingDept(null)
    setName('')
    setCode('')
  }

  return (
    <Card className="rounded-xl shadow-lg border border-border p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderTree className="h-6 w-6 text-morandi-gold" />
          <h2 className="text-xl font-semibold">部門管理</h2>
        </div>
        {!isAdding && !editingDept && (
          <Button
            onClick={startAdd}
            size="sm"
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            新增部門
          </Button>
        )}
      </div>

      {/* 部門列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-morandi-gold" />
        </div>
      ) : departments.length === 0 && !isAdding ? (
        <p className="text-sm text-morandi-secondary text-center py-8">尚未建立部門</p>
      ) : (
        <div className="space-y-2">
          {departments.map(dept => (
            <div
              key={dept.id}
              className="flex items-center justify-between px-4 py-3 bg-morandi-bg rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold bg-morandi-gold/10 text-morandi-gold px-2 py-1 rounded">
                  {dept.code}
                </span>
                <span className="text-sm font-medium">{dept.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(dept)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(dept)}
                  className="text-morandi-red hover:text-morandi-red"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯表單 */}
      {(isAdding || editingDept) && (
        <div className="mt-4 p-4 border border-morandi-gold/30 rounded-lg bg-morandi-gold/5">
          <h3 className="text-sm font-semibold mb-3">{editingDept ? '編輯部門' : '新增部門'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">部門名稱</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：勁揚旅行社"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">部門代號（團號前綴）</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="例如：JY"
                className="mt-1"
                maxLength={5}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={cancel}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={editingDept ? handleUpdate : handleAdd}
              disabled={saving || !name.trim() || !code.trim()}
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingDept ? '更新' : '新增'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
