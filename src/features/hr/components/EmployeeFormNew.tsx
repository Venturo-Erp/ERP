'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Camera, Save, Mail, Phone, MapPin, Calendar, CreditCard, Heart, Loader2, User, DollarSign, Shield } from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { ROLES, type UserRole } from '@/lib/rbac-config'
import { cn } from '@/lib/utils'

interface EmployeeFormNewProps {
  employeeId?: string
  onSubmit: () => void
  onCancel: () => void
}

type TabType = 'basic' | 'permissions' | 'salary'

export function EmployeeFormNew({ employeeId, onSubmit, onCancel }: EmployeeFormNewProps) {
  const { items: employees, create: createEmployee, update: updateEmployee } = useUserStore()
  const user = useAuthStore((state) => state.user)
  const employee = employeeId ? employees.find((e) => e.id === employeeId) : null
  const isEditMode = !!employeeId

  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employee?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  const [formData, setFormData] = useState({
    chinese_name: employee?.chinese_name || '',
    english_name: employee?.english_name || '',
    display_name: employee?.display_name || '',
    email: employee?.personal_info?.email || employee?.email || '',
    phone: (Array.isArray(employee?.personal_info?.phone) ? employee.personal_info.phone[0] : employee?.personal_info?.phone) || '',
    address: employee?.personal_info?.address || '',
    birth_date: employee?.personal_info?.birth_date || '',
    id_number: employee?.personal_info?.national_id || '',
    position: employee?.job_info?.position || '',
    emergency_contact_name: employee?.personal_info?.emergency_contact?.name || '',
    emergency_contact_relation: employee?.personal_info?.emergency_contact?.relationship || '',
    emergency_contact_phone: employee?.personal_info?.emergency_contact?.phone || '',
    role: (employee?.roles?.[0] as UserRole) || '' as UserRole | '',
    base_salary: employee?.salary_info?.base_salary || 0,
  })

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

    if (!isEditMode && !formData.role) {
      await alertError('請選擇職務')
      return
    }

    setSubmitting(true)
    try {
      const defaultPassword = formData.birth_date?.replace(/-/g, '') || '00000000'

      const payload = {
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        display_name: formData.display_name || formData.chinese_name,
        roles: formData.role ? [formData.role] : employee?.roles || [],
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
          },
        },
        job_info: {
          position: formData.position,
          hire_date: employee?.job_info?.hire_date || new Date().toISOString().split('T')[0],
        },
        salary_info: {
          base_salary: formData.base_salary,
          allowances: employee?.salary_info?.allowances || [],
        },
        status: 'active' as const,
        default_password: !isEditMode ? defaultPassword : undefined,
      }

      if (isEditMode && employeeId) {
        await updateEmployee(employeeId, payload as unknown as Parameters<typeof updateEmployee>[1])
      } else {
        await createEmployee(payload as unknown as Parameters<typeof createEmployee>[0])
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

  const tabs = [
    { key: 'basic' as const, label: '基本資料', icon: User },
    { key: 'permissions' as const, label: '職務權限', icon: Shield },
    { key: 'salary' as const, label: '薪資設定', icon: DollarSign },
  ]

  // RBAC 角色列表（排除 super_admin）
  const availableRoles = Object.values(ROLES).filter(r => r.id !== 'super_admin')

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：照片 + 分頁按鈕 */}
        <div className="w-56 bg-gradient-to-b from-morandi-container to-morandi-container/50 p-5 flex flex-col items-center border-r border-morandi-border flex-shrink-0">
          {/* 照片 */}
          <div className="relative group mb-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-2xl bg-morandi-gold/10 border-3 border-dashed border-morandi-gold/40 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="預覽" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-morandi-secondary" />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          {/* 員工資訊 */}
          <div className="text-center mb-6">
            <span className="inline-block px-2 py-0.5 bg-morandi-green/20 text-morandi-green text-[10px] font-bold uppercase rounded-full mb-1">
              {isEditMode ? employee?.employee_number : '新員工'}
            </span>
            <h3 className="text-base font-bold text-morandi-primary truncate max-w-full">
              {formData.display_name || formData.chinese_name || '未命名'}
            </h3>
            {formData.role && (
              <p className="text-xs text-morandi-secondary mt-0.5">
                {ROLES[formData.role]?.label}
              </p>
            )}
          </div>

          {/* 分頁按鈕（垂直） */}
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
        </div>

        {/* 右側：表單內容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 基本資料 */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* 姓名區塊 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                    中文姓名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    value={formData.chinese_name}
                    onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
                    placeholder="例：簡威廉"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase">顯示名稱</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="例：William"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase">英文姓名</Label>
                  <Input
                    value={formData.english_name}
                    onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                    placeholder="例：William Chien"
                  />
                </div>
              </div>

              {/* 聯絡資訊 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                    <Mail size={12} /> Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                    <CreditCard size={12} /> 身分證
                  </Label>
                  <Input
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    placeholder="A123456789"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-morandi-secondary uppercase">職位名稱</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="例：業務專員"
                  />
                </div>
              </div>

              {/* 地址 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                  <MapPin size={12} /> 地址
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="台北市..."
                />
              </div>

              {/* 緊急聯絡人 */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                  <Heart size={14} className="text-morandi-gold" />
                  緊急聯絡人
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">姓名</Label>
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">關係</Label>
                    <Input
                      value={formData.emergency_contact_relation}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                      placeholder="例：配偶"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase">電話</Label>
                    <Input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 職務權限 */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-morandi-primary mb-3">
                  選擇職務 <span className="text-red-500">*</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.id })}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-all',
                        formData.role === role.id
                          ? 'border-morandi-gold bg-morandi-gold/10'
                          : 'border-morandi-border hover:border-morandi-gold/50'
                      )}
                    >
                      <div className="font-semibold text-morandi-primary">{role.label}</div>
                      <div className="text-xs text-morandi-secondary mt-1">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {formData.role && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold text-morandi-primary mb-3">預設權限</h4>
                  <div className="flex flex-wrap gap-2">
                    {ROLES[formData.role]?.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-morandi-gold/10 text-morandi-primary text-xs rounded"
                      >
                        {perm === '*' ? '所有權限' : perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 薪資設定 */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase">底薪</Label>
                <Input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-morandi-secondary">
                津貼等詳細薪資設定，請在員工建立後於人資系統中編輯。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 底部按鈕 */}
      <div className="px-6 py-4 border-t border-morandi-border flex justify-end gap-3 bg-morandi-container/30">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="submit"
          disabled={submitting || !formData.chinese_name || !formData.email || (!isEditMode && !formData.role)}
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
    </form>
  )
}
