'use client'

/**
 * EmployeeForm - 統一員工表單
 *
 * mode:
 * - 'self': 員工自己編輯（只有基本資料）
 * - 'hr': HR 管理（基本資料 + 權限 + 薪資）
 */

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Camera,
  Save,
  Loader2,
  User,
  DollarSign,
  Shield,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  Heart,
  Lock,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useWorkspaceRoles } from '@/data/hooks'
import {
  ModulePermissionTable,
  type TabPermission,
  type PermissionOverride,
} from './ModulePermissionTable'

// 職務類型（從 API 取得）
interface Role {
  id: string
  name: string
  description?: string
  workspace_id: string
  is_admin?: boolean
}

interface EmployeeFormProps {
  employeeId?: string
  onSubmit: () => void
  onCancel: () => void
  mode?: 'hr' | 'self'
  onPasswordChange?: () => void
}

type TabType = 'basic' | 'permissions' | 'salary'

export function EmployeeForm({
  employeeId,
  onSubmit,
  onCancel,
  mode = 'hr',
  onPasswordChange,
}: EmployeeFormProps) {
  const {
    items: employees,
    create: createEmployee,
    update: updateEmployee,
    fetchAll,
  } = useUserStore()
  const { user } = useAuthStore()
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const { roles: cachedRoles } = useWorkspaceRoles()

  // 確保員工資料已載入
  useEffect(() => {
    if (employees.length === 0) {
      fetchAll()
    }
  }, [employees.length, fetchAll])
  const employee = employeeId ? employees.find(e => e.id === employeeId) : null
  const isEditMode = !!employeeId

  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employee?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  // 從 API 載入的職務列表和權限
  const [roles, setRoles] = useState<Role[]>([])
  const [roleTabPermissions, setRoleTabPermissions] = useState<TabPermission[]>([])
  const [personalOverrides, setPersonalOverrides] = useState<PermissionOverride[]>([])

  // 團務職務（workspace_job_roles）
  // 2026-04-18 移除：jobRoles / selectedJobRoles（原 employee_job_roles 多對多、ADR-R2 Option A 改單一職務）

  const [formData, setFormData] = useState({
    chinese_name: employee?.chinese_name || '',
    english_name: employee?.english_name || '',
    display_name: employee?.display_name || '',
    email: employee?.personal_info?.email || '',
    phone:
      (Array.isArray(employee?.personal_info?.phone)
        ? employee.personal_info.phone[0]
        : employee?.personal_info?.phone) || '',
    address: employee?.personal_info?.address || '',
    birth_date: employee?.personal_info?.birth_date || '',
    id_number: employee?.personal_info?.national_id || '',
    job_title: ((employee as unknown as Record<string, unknown>)?.job_title as string) || '',
    position: employee?.job_info?.position || '',
    hire_date: employee?.job_info?.hire_date || new Date().toISOString().split('T')[0],
    emergency_contact_name: employee?.personal_info?.emergency_contact?.name || '',
    emergency_contact_relation: employee?.personal_info?.emergency_contact?.relationship || '',
    emergency_contact_phone: employee?.personal_info?.emergency_contact?.phone || '',
    emergency_contact_address: employee?.personal_info?.emergency_contact?.address || '',
    role_id: ((employee as unknown as Record<string, unknown>)?.role_id as string) || '',
    base_salary: employee?.salary_info?.base_salary || 0,
  })

  // 2026-04-18 移除：載入 workspace_roles + employee_job_roles 的 useEffect（已改用 useWorkspaceRoles SWR hook）

  // 職務列表改用 SWR 快取
  useEffect(() => {
    if (cachedRoles.length > 0) {
      setRoles(cachedRoles as Role[])
    }
  }, [cachedRoles])

  // 當選擇職務時，載入該職務的分頁權限
  useEffect(() => {
    if (!formData.role_id) {
      setRoleTabPermissions([])
      return
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch(`/api/roles/${formData.role_id}/tab-permissions`)
        if (res.ok) {
          const data = await res.json()
          setRoleTabPermissions(data)
        }
      } catch (err) {
        logger.error('載入權限失敗:', err)
      }
    }
    fetchPermissions()
  }, [formData.role_id])

  // 載入員工的個人覆寫
  useEffect(() => {
    if (!employeeId) {
      setPersonalOverrides([])
      return
    }

    const fetchOverrides = async () => {
      try {
        const res = await fetch(`/api/employees/${employeeId}/permission-overrides`)
        if (res.ok) {
          const data = await res.json()
          setPersonalOverrides(data)
        }
      } catch (err) {
        logger.error('載入個人覆寫失敗:', err)
      }
    }
    fetchOverrides()
  }, [employeeId])

  // 當 employee 資料更新時，同步更新 formData
  useEffect(() => {
    if (employee) {
      setFormData({
        chinese_name: employee.chinese_name || '',
        english_name: employee.english_name || '',
        display_name: employee.display_name || '',
        email: employee.personal_info?.email || '',
        phone:
          (Array.isArray(employee.personal_info?.phone)
            ? employee.personal_info.phone[0]
            : employee.personal_info?.phone) || '',
        address: employee.personal_info?.address || '',
        birth_date: employee.personal_info?.birth_date || '',
        id_number: employee.personal_info?.national_id || '',
        job_title: ((employee as unknown as Record<string, unknown>).job_title as string) || '',
        position: employee.job_info?.position || '',
        hire_date: employee.job_info?.hire_date || new Date().toISOString().split('T')[0],
        emergency_contact_name: employee.personal_info?.emergency_contact?.name || '',
        emergency_contact_relation: employee.personal_info?.emergency_contact?.relationship || '',
        emergency_contact_phone: employee.personal_info?.emergency_contact?.phone || '',
        emergency_contact_address: employee.personal_info?.emergency_contact?.address || '',
        role_id: ((employee as unknown as Record<string, unknown>).role_id as string) || '',
        base_salary: employee.salary_info?.base_salary || 0,
      })
      setAvatarPreview(employee.avatar_url || null)
    }
  }, [employee])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.chinese_name || !formData.email) {
      await alertError('請填寫必填欄位（中文姓名、Email）')
      return
    }

    if (!isEditMode && !formData.role_id && mode === 'hr') {
      await alertError('請選擇職務')
      return
    }

    setSubmitting(true)
    try {
      const defaultPassword = formData.birth_date?.replace(/-/g, '') || '00000000'

      // 新增員工時自動產生員工編號
      let employeeNumber = employee?.employee_number
      if (!isEditMode) {
        // 找出最大的員工編號
        const maxNum = employees
          .map(e => parseInt(e.employee_number?.replace(/\D/g, '') || '0'))
          .reduce((max, n) => Math.max(max, n), 0)
        employeeNumber = `E${String(maxNum + 1).padStart(3, '0')}`
      }

      const payload = {
        employee_number: employeeNumber,
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        display_name: formData.display_name || formData.chinese_name,
        job_title: formData.job_title || null,
        personal_info: {
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          birth_date: formData.birth_date,
          national_id: formData.id_number,
          emergency_contact: {
            name: formData.emergency_contact_name,
            relationship: formData.emergency_contact_relation,
            phone: formData.emergency_contact_phone,
            address: formData.emergency_contact_address,
          },
        },
        // role_id 改存頂層（2026-04-18 統一、不再寫 job_info.role_id）
        role_id: formData.role_id || null,
        job_info: {
          position: formData.position,
          hire_date: formData.hire_date,
        },
        salary_info: {
          base_salary: formData.base_salary,
          allowances: employee?.salary_info?.allowances || [],
        },
        status: 'active' as const,
        // default_password 由 API 處理，不直接存 DB
      }

      if (isEditMode && employeeId) {
        await updateEmployee(employeeId, payload as unknown as Parameters<typeof updateEmployee>[1])
      } else {
        // 新增員工：用 API 建立（包含 Supabase Auth）
        const defaultPassword = '12345678'
        const res = await fetch('/api/employees/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            password: defaultPassword,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || '建立員工失敗')
        }

        // 顯示預設密碼通知
        const { alert } = await import('@/lib/ui/alert-dialog')
        await alert(
          `員工建立成功！\n\n` +
            `員工編號：${employeeNumber}\n` +
            `預設密碼：${defaultPassword}\n\n` +
            `請通知員工首次登入後修改密碼。`,
          'success',
          '新員工建立成功'
        )
      }

      // 2026-04-18 移除：employee_job_roles 多對多儲存邏輯（ADR-R2 Option A 改單一職務、role_id 已在 payload 頂層）

      // 儲存員工的個人覆寫
      if (isEditMode && employeeId) {
        const overridesToSave = personalOverrides.filter(o => o.override_type)
        try {
          await fetch(`/api/employees/${employeeId}/permission-overrides`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overrides: overridesToSave }),
          })
        } catch (err) {
          logger.warn('更新員工覆寫失敗:', err)
        }
      }

      await alertSuccess(isEditMode ? '更新成功' : '員工建立成功')
      onSubmit()
    } catch (error) {
      logger.error(isEditMode ? '更新失敗' : '建立員工失敗', error)
      await alertError(isEditMode ? '更新失敗' : '建立失敗')
    } finally {
      setSubmitting(false)
    }
  }

  // 根據 mode 決定顯示哪些分頁
  const allTabs = [
    { key: 'basic' as const, label: '基本資料', icon: User, showIn: ['hr', 'self'] },
    { key: 'permissions' as const, label: '職務權限', icon: Shield, showIn: ['hr'] },
    { key: 'salary' as const, label: '薪資設定', icon: DollarSign, showIn: ['hr'] },
  ]
  const tabs = allTabs.filter(t => t.showIn.includes(mode))
  const showTabs = tabs.length > 1

  // 取得選中職務的名稱
  const selectedRole = roles.find(r => r.id === formData.role_id)

  return (
    <form onSubmit={handleSubmit} className="h-full">
      {/* Character Card 風格 */}
      <div className="bg-card rounded-xl overflow-hidden border-l-4 border-morandi-gold h-full flex">
        {/* 左側：照片（固定寬度，高度填滿） */}
        <div className="w-72 bg-gradient-to-b from-morandi-container to-morandi-container/50 p-8 flex flex-col items-center justify-center flex-shrink-0">
          <div className="relative group mb-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-36 h-36 rounded-2xl bg-morandi-gold/10 border-4 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="預覽" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-morandi-secondary">
                  <Camera className="w-10 h-10 mb-1" />
                  <span className="text-[10px] font-semibold uppercase">上傳照片</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-morandi-gold hover:bg-morandi-gold/90 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* 員工資訊 */}
          <div className="text-center mb-6">
            <div className="inline-flex px-2 py-0.5 bg-morandi-gold/20 text-morandi-gold text-[10px] font-bold uppercase tracking-widest rounded-full mb-2">
              {isEditMode ? employee?.employee_number : '新員工'}
            </div>
            <h3 className="text-lg font-bold text-morandi-primary">
              {formData.display_name || formData.chinese_name || '未命名'}
            </h3>
          </div>

          {/* 分頁按鈕（如果有多個） */}
          {showTabs && (
            <div className="w-full space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'bg-morandi-gold/20 text-morandi-primary border border-morandi-gold/50'
                        : 'text-morandi-secondary hover:bg-morandi-container hover:text-morandi-primary'
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 右側：表單內容（可滾動） */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* 基本資料 */}
            {activeTab === 'basic' && (
              <div className="space-y-5">
                {/* 姓名區塊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5" data-tutorial="field-chinese_name">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      中文姓名 <span className="text-morandi-red">*</span>
                    </Label>
                    <Input
                      required
                      value={formData.chinese_name}
                      onChange={e => setFormData({ ...formData, chinese_name: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="例：簡威廉"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      顯示名稱
                    </Label>
                    <Input
                      value={formData.display_name}
                      onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="例：William"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      英文姓名
                    </Label>
                    <Input
                      value={formData.english_name}
                      onChange={e => setFormData({ ...formData, english_name: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="例：William Chien"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      職稱（名片用）
                    </Label>
                    <Input
                      value={formData.job_title}
                      onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="例：資深業務經理、副總經理"
                    />
                  </div>
                </div>

                {/* 職務（權限角色） */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                    職務{' '}
                    {!isEditMode && mode === 'hr' && <span className="text-morandi-red">*</span>}
                  </Label>
                  {mode === 'self' ? (
                    // 個人設定：唯讀，職務由 HR 指派不可自改
                    <div className="w-full px-3 py-2 border border-morandi-gold/20 rounded-lg bg-morandi-container/30 text-morandi-primary text-sm">
                      {roles.find(r => r.id === formData.role_id)?.name || '尚未指派'}
                      <span className="ml-2 text-xs text-morandi-muted">
                        （由主管指派，如需調整請聯絡 HR）
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.role_id}
                      onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
                    >
                      <option value="">請選擇職務</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 聯絡資訊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5" data-tutorial="field-email">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                      <Mail size={12} /> Email <span className="text-morandi-red">*</span>
                    </Label>
                    <Input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                      <Phone size={12} /> 手機
                    </Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="0912-345-678"
                    />
                  </div>
                </div>

                {/* 個人資訊 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                      <Calendar size={12} /> 生日
                    </Label>
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                      <CreditCard size={12} /> 身分證
                    </Label>
                    <Input
                      value={formData.id_number}
                      onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="A123456789"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                      <MapPin size={12} /> 地址
                    </Label>
                    <Input
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold"
                      placeholder="台北市..."
                    />
                  </div>
                </div>

                {/* 緊急聯絡人 */}
                <div className="pt-4">
                  <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                    <Heart size={14} className="text-morandi-gold" />
                    緊急聯絡人
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        姓名
                      </Label>
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={e =>
                          setFormData({ ...formData, emergency_contact_name: e.target.value })
                        }
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        關係
                      </Label>
                      <Input
                        value={formData.emergency_contact_relation}
                        onChange={e =>
                          setFormData({ ...formData, emergency_contact_relation: e.target.value })
                        }
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="例：配偶"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        電話
                      </Label>
                      <Input
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={e =>
                          setFormData({ ...formData, emergency_contact_phone: e.target.value })
                        }
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        地址
                      </Label>
                      <Input
                        value={formData.emergency_contact_address}
                        onChange={e =>
                          setFormData({ ...formData, emergency_contact_address: e.target.value })
                        }
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 職務權限 */}
            {activeTab === 'permissions' && (
              <div className="space-y-5">
                {/* 顯示目前職務 */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <span className="text-sm text-morandi-secondary">目前職務：</span>
                  <span className="px-3 py-1 bg-morandi-gold/20 text-morandi-primary font-medium rounded-lg">
                    {selectedRole?.name || '尚未設定'}
                  </span>
                  {selectedRole?.is_admin && (
                    <span className="text-xs text-morandi-green bg-morandi-green/10 px-2 py-0.5 rounded">
                      管理員擁有所有權限
                    </span>
                  )}
                </div>

                {/* 權限列表（使用共用組件） */}
                {formData.role_id ? (
                  <ModulePermissionTable
                    mode="employee"
                    rolePermissions={roleTabPermissions}
                    overrides={personalOverrides}
                    onOverridesChange={setPersonalOverrides}
                    maxHeight="400px"
                  />
                ) : (
                  <div className="text-center py-8 text-morandi-secondary">
                    請先在「基本資料」選擇職務
                  </div>
                )}
              </div>
            )}

            {/* 薪資設定 */}
            {activeTab === 'salary' && (
              <div className="space-y-5">
                {/* 基本資訊 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      入職日期
                    </Label>
                    <Input
                      type="date"
                      value={formData.hire_date || ''}
                      onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                      className="border-morandi-gold/30 focus:border-morandi-gold bg-morandi-container/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      發薪日
                    </Label>
                    <select className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary">
                      <option value="5">每月 5 日</option>
                      <option value="10">每月 10 日</option>
                      <option value="15">每月 15 日</option>
                      <option value="25">每月 25 日</option>
                      <option value="last">每月最後一天</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                      目前底薪
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-morandi-secondary">NT$</span>
                      <Input
                        type="number"
                        value={formData.base_salary}
                        onChange={e =>
                          setFormData({ ...formData, base_salary: Number(e.target.value) })
                        }
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* 調薪紀錄 */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-morandi-primary mb-3">調薪紀錄</h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-morandi-container/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">
                            生效日期
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                            調整前
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                            調整後
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                            幅度
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">
                            備註
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {employee?.salary_info?.salary_history &&
                        employee.salary_info.salary_history.length > 0 ? (
                          employee.salary_info.salary_history.map((record, idx, arr) => {
                            const prevSalary =
                              idx < arr.length - 1 ? arr[idx + 1].base_salary : null
                            return (
                              <tr key={idx} className="hover:bg-morandi-container/30">
                                <td className="px-4 py-3 text-morandi-primary">
                                  {record.effective_date}
                                </td>
                                <td className="px-4 py-3 text-right text-morandi-secondary">
                                  {prevSalary ? `NT$ ${prevSalary.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-morandi-primary font-medium">
                                  NT$ {record.base_salary.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {prevSalary && (
                                    <span
                                      className={cn(
                                        'text-xs',
                                        record.base_salary > prevSalary
                                          ? 'text-morandi-green'
                                          : 'text-morandi-red'
                                      )}
                                    >
                                      {record.base_salary > prevSalary ? '+' : ''}
                                      {(
                                        ((record.base_salary - prevSalary) / prevSalary) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-morandi-secondary text-xs">
                                  {record.reason || '-'}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-morandi-secondary"
                            >
                              尚無調薪紀錄
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0">
            {mode !== 'self' && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            {mode === 'self' && (
              <Button
                type="button"
                variant="outline"
                className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold hover:text-white"
                onClick={() => {
                  if (onPasswordChange) onPasswordChange()
                }}
                data-tutorial="btn-change-password"
              >
                <Lock className="w-4 h-4 mr-2" />
                修改密碼
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                submitting ||
                !formData.chinese_name ||
                !formData.email ||
                (!isEditMode && !formData.role_id && mode === 'hr')
              }
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isEditMode ? '儲存中...' : '建立中...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? '儲存變更' : '建立員工'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
