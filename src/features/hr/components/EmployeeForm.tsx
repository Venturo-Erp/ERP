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
import { Switch } from '@/components/ui/switch'
import { Camera, Save, Mail, Phone, MapPin, Calendar, CreditCard, Heart, Loader2, User, DollarSign, Shield, ChevronRight, ChevronDown } from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { useWorkspaceFeatures, MODULES, type ModuleDefinition } from '@/lib/permissions'

// 職務類型（從 API 取得）
interface Role {
  id: string
  name: string
  description?: string
  workspace_id: string
  is_admin?: boolean
}

// 模組分頁權限類型（新版）
interface TabPermission {
  module_code: string
  tab_code: string | null
  can_read: boolean
  can_write: boolean
}

// 個人覆寫類型（新版）
interface PermissionOverride {
  module_code: string
  tab_code: string | null
  override_type: 'grant' | 'revoke' | null
}

interface EmployeeFormProps {
  employeeId?: string
  onSubmit: () => void
  onCancel: () => void
  mode?: 'hr' | 'self'
}

type TabType = 'basic' | 'permissions' | 'salary'

export function EmployeeForm({ employeeId, onSubmit, onCancel, mode = 'hr' }: EmployeeFormProps) {
  const { items: employees, create: createEmployee, update: updateEmployee, fetchAll } = useUserStore()
  const { user } = useAuthStore()
  const { isFeatureEnabled } = useWorkspaceFeatures()
  
  // 確保員工資料已載入
  useEffect(() => {
    if (employees.length === 0) {
      fetchAll()
    }
  }, [employees.length, fetchAll])
  const employee = employeeId ? employees.find((e) => e.id === employeeId) : null
  const isEditMode = !!employeeId

  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employee?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  
  // 從 API 載入的職務列表和權限
  const [roles, setRoles] = useState<Role[]>([])
  const [roleTabPermissions, setRoleTabPermissions] = useState<TabPermission[]>([])
  const [personalOverrides, setPersonalOverrides] = useState<PermissionOverride[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])

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
    emergency_contact_address: employee?.personal_info?.emergency_contact?.address || '',
    role_id: employee?.job_info?.role_id || '',
    base_salary: employee?.salary_info?.base_salary || 0,
  })

  // 載入職務列表
  useEffect(() => {
    if (!user?.workspace_id) return
    
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/permissions/roles?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setRoles(data)
        }
      } catch (err) {
        logger.error('載入職務失敗:', err)
      }
    }
    fetchRoles()
  }, [user?.workspace_id])

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

  // 載入個人權限覆寫
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
        email: employee.personal_info?.email || employee.email || '',
        phone: (Array.isArray(employee.personal_info?.phone) ? employee.personal_info.phone[0] : employee.personal_info?.phone) || '',
        address: employee.personal_info?.address || '',
        birth_date: employee.personal_info?.birth_date || '',
        id_number: employee.personal_info?.national_id || '',
        position: employee.job_info?.position || '',
        emergency_contact_name: employee.personal_info?.emergency_contact?.name || '',
        emergency_contact_relation: employee.personal_info?.emergency_contact?.relationship || '',
        emergency_contact_phone: employee.personal_info?.emergency_contact?.phone || '',
        emergency_contact_address: employee.personal_info?.emergency_contact?.address || '',
        role_id: employee.job_info?.role_id || '',
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

      const payload = {
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        display_name: formData.display_name || formData.chinese_name,
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
        job_info: {
          position: formData.position,
          role_id: formData.role_id || undefined,
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

      // 儲存個人權限覆寫
      if (isEditMode && employeeId) {
        const overridesToSave = personalOverrides.filter(o => o.override_type)
        try {
          await fetch(`/api/employees/${employeeId}/permission-overrides`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overrides: overridesToSave }),
          })
        } catch (err) {
          logger.warn('更新個人權限覆寫失敗:', err)
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
      <div className="bg-white rounded-xl overflow-hidden border-l-4 border-morandi-gold h-full flex">
        {/* 左側：照片（固定寬度，高度填滿） */}
        <div className="w-72 bg-gradient-to-b from-morandi-container to-morandi-container/50 p-8 flex flex-col items-center flex-shrink-0">
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
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        中文姓名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.chinese_name}
                        onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="例：簡威廉"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">顯示名稱</Label>
                      <Input
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="例：William"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">英文姓名</Label>
                      <Input
                        value={formData.english_name}
                        onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="例：William Chien"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                        職務 {!isEditMode && mode === 'hr' && <span className="text-red-500">*</span>}
                      </Label>
                      <select
                        value={formData.role_id}
                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                        className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-white text-morandi-primary"
                      >
                        <option value="">請選擇職務</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
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
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-1">
                        <CreditCard size={12} /> 身分證
                      </Label>
                      <Input
                        value={formData.id_number}
                        onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                        <Label className="text-xs font-semibold text-morandi-secondary uppercase">姓名</Label>
                        <Input
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          className="border-morandi-gold/30 focus:border-morandi-gold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-morandi-secondary uppercase">關係</Label>
                        <Input
                          value={formData.emergency_contact_relation}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                          className="border-morandi-gold/30 focus:border-morandi-gold"
                          placeholder="例：配偶"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-morandi-secondary uppercase">電話</Label>
                        <Input
                          type="tel"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          className="border-morandi-gold/30 focus:border-morandi-gold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-morandi-secondary uppercase">地址</Label>
                        <Input
                          value={formData.emergency_contact_address}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_address: e.target.value })}
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
                  <div className="flex items-center gap-3 pb-4 border-b border-morandi-border">
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

                  {/* 權限列表 */}
                  {formData.role_id ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-morandi-primary">個人權限微調</h4>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-morandi-green rounded"></span>
                            開啟
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-gray-300 rounded"></span>
                            關閉
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            已覆寫
                          </span>
                        </div>
                      </div>
                      <div className="border border-morandi-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                        {/* 表頭 */}
                        <div className="flex items-center bg-morandi-container/50 sticky top-0 border-b border-morandi-border text-xs font-semibold text-morandi-secondary uppercase">
                          <div className="flex-1 px-4 py-2.5">功能模組</div>
                          <div className="w-20 px-4 py-2.5 text-center">職務</div>
                          <div className="w-20 px-4 py-2.5 text-center">個人</div>
                        </div>

                        {/* 模組列表 */}
                        {MODULES.map(module => {
                          const hasTabs = module.tabs.length > 0
                          const isExpanded = expandedModules.includes(module.code)
                          const isAdmin = selectedRole?.is_admin

                          // 檢查模組權限（無分頁）
                          const moduleRolePerm = roleTabPermissions.find(
                            p => p.module_code === module.code && p.tab_code === null
                          )
                          const moduleOverride = personalOverrides.find(
                            o => o.module_code === module.code && o.tab_code === null
                          )

                          // 計算模組是否有任何分頁開啟
                          const hasAnyTabEnabled = hasTabs && module.tabs.some(tab => {
                            const perm = roleTabPermissions.find(
                              p => p.module_code === module.code && p.tab_code === tab.code
                            )
                            const override = personalOverrides.find(
                              o => o.module_code === module.code && o.tab_code === tab.code
                            )
                            if (override?.override_type === 'grant') return true
                            if (override?.override_type === 'revoke') return false
                            return perm?.can_read || false
                          })

                          // 判斷最終狀態
                          const getEffectiveStatus = (rolePerm: boolean, override: PermissionOverride | undefined) => {
                            if (isAdmin) return true
                            if (override?.override_type === 'grant') return true
                            if (override?.override_type === 'revoke') return false
                            return rolePerm
                          }

                          const toggleOverride = (moduleCode: string, tabCode: string | null, currentRolePerm: boolean) => {
                            const existing = personalOverrides.find(
                              o => o.module_code === moduleCode && o.tab_code === tabCode
                            )
                            
                            if (existing) {
                              // 循環：null -> grant/revoke -> null
                              if (!existing.override_type) {
                                // 從 null 變成 grant 或 revoke
                                setPersonalOverrides(prev => prev.map(o =>
                                  o.module_code === moduleCode && o.tab_code === tabCode
                                    ? { ...o, override_type: currentRolePerm ? 'revoke' : 'grant' }
                                    : o
                                ))
                              } else {
                                // 從 grant/revoke 變回 null
                                setPersonalOverrides(prev => prev.map(o =>
                                  o.module_code === moduleCode && o.tab_code === tabCode
                                    ? { ...o, override_type: null }
                                    : o
                                ))
                              }
                            } else {
                              // 新增覆寫
                              setPersonalOverrides(prev => [
                                ...prev,
                                {
                                  module_code: moduleCode,
                                  tab_code: tabCode,
                                  override_type: currentRolePerm ? 'revoke' : 'grant',
                                }
                              ])
                            }
                          }

                          return (
                            <div key={module.code}>
                              {/* 模組行 */}
                              <div className={cn(
                                'flex items-center border-t border-morandi-border',
                                hasTabs ? 'bg-morandi-bg/30' : 'bg-white'
                              )}>
                                <div className="flex-1 px-4 py-3 flex items-center gap-2">
                                  {hasTabs ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedModules(prev =>
                                        prev.includes(module.code)
                                          ? prev.filter(m => m !== module.code)
                                          : [...prev, module.code]
                                      )}
                                      className="p-1 hover:bg-morandi-bg rounded"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-morandi-secondary" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-morandi-secondary" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-6" />
                                  )}
                                  <span className="font-medium text-morandi-primary text-sm">{module.name}</span>
                                </div>
                                {!hasTabs && (
                                  <>
                                    <div className="w-20 px-4 py-3 flex justify-center">
                                      <span className={cn(
                                        'w-6 h-6 rounded flex items-center justify-center text-xs',
                                        isAdmin || moduleRolePerm?.can_read
                                          ? 'bg-morandi-green/20 text-morandi-green'
                                          : 'bg-gray-100 text-gray-400'
                                      )}>
                                        {isAdmin || moduleRolePerm?.can_read ? '✓' : '—'}
                                      </span>
                                    </div>
                                    <div className="w-20 px-4 py-3 flex justify-center">
                                      {!isAdmin && (
                                        <div className="relative">
                                          <Switch
                                            checked={getEffectiveStatus(moduleRolePerm?.can_read || false, moduleOverride)}
                                            onCheckedChange={() => toggleOverride(module.code, null, moduleRolePerm?.can_read || false)}
                                            className="data-[state=checked]:bg-morandi-green"
                                          />
                                          {moduleOverride?.override_type && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                {hasTabs && (
                                  <div className="w-40 px-4 py-3 text-xs text-morandi-secondary text-center">
                                    {hasAnyTabEnabled ? '部分開啟' : '全部關閉'}
                                  </div>
                                )}
                              </div>

                              {/* 分頁行 */}
                              {hasTabs && isExpanded && module.tabs.map(tab => {
                                const tabRolePerm = roleTabPermissions.find(
                                  p => p.module_code === module.code && p.tab_code === tab.code
                                )
                                const tabOverride = personalOverrides.find(
                                  o => o.module_code === module.code && o.tab_code === tab.code
                                )

                                return (
                                  <div key={tab.code} className="flex items-center border-t border-morandi-border bg-white">
                                    <div className="flex-1 px-4 py-2.5 pl-12 flex items-center gap-2">
                                      <div className="w-1 h-4 bg-morandi-border rounded-full" />
                                      <span className="text-sm text-morandi-primary">{tab.name}</span>
                                    </div>
                                    <div className="w-20 px-4 py-2.5 flex justify-center">
                                      <span className={cn(
                                        'w-6 h-6 rounded flex items-center justify-center text-xs',
                                        isAdmin || tabRolePerm?.can_read
                                          ? 'bg-morandi-green/20 text-morandi-green'
                                          : 'bg-gray-100 text-gray-400'
                                      )}>
                                        {isAdmin || tabRolePerm?.can_read ? '✓' : '—'}
                                      </span>
                                    </div>
                                    <div className="w-20 px-4 py-2.5 flex justify-center">
                                      {!isAdmin && (
                                        <div className="relative">
                                          <Switch
                                            checked={getEffectiveStatus(tabRolePerm?.can_read || false, tabOverride)}
                                            onCheckedChange={() => toggleOverride(module.code, tab.code, tabRolePerm?.can_read || false)}
                                            className="data-[state=checked]:bg-morandi-green"
                                          />
                                          {tabOverride?.override_type && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-morandi-secondary mt-2">
                        藍點表示已覆寫職務預設。點擊開關可切換：職務預設 → 覆寫 → 職務預設
                      </p>
                    </div>
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
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">入職日期</Label>
                      <Input
                        type="date"
                        value={employee?.job_info?.hire_date || ''}
                        disabled={isEditMode}
                        onChange={(e) => {/* hire_date 在 job_info 裡 */}}
                        className="border-morandi-gold/30 focus:border-morandi-gold bg-morandi-container/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">發薪日</Label>
                      <select
                        className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-white text-morandi-primary"
                      >
                        <option value="5">每月 5 日</option>
                        <option value="10">每月 10 日</option>
                        <option value="15">每月 15 日</option>
                        <option value="25">每月 25 日</option>
                        <option value="last">每月最後一天</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">目前底薪</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-morandi-secondary">NT$</span>
                        <Input
                          type="number"
                          value={formData.base_salary}
                          onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                          className="border-morandi-gold/30 focus:border-morandi-gold"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 調薪紀錄 */}
                  <div className="pt-4 border-t border-morandi-border">
                    <h4 className="text-sm font-semibold text-morandi-primary mb-3">調薪紀錄</h4>
                    <div className="border border-morandi-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-morandi-container/50">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">生效日期</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">調整前</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">調整後</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">幅度</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">備註</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morandi-border">
                          {employee?.salary_info?.salary_history && employee.salary_info.salary_history.length > 0 ? (
                            employee.salary_info.salary_history.map((record, idx, arr) => {
                              const prevSalary = idx < arr.length - 1 ? arr[idx + 1].base_salary : null
                              return (
                                <tr key={idx} className="hover:bg-morandi-container/30">
                                  <td className="px-4 py-3 text-morandi-primary">{record.effective_date}</td>
                                  <td className="px-4 py-3 text-right text-morandi-secondary">
                                    {prevSalary ? `NT$ ${prevSalary.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right text-morandi-primary font-medium">NT$ {record.base_salary.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right">
                                    {prevSalary && (
                                      <span className={cn(
                                        'text-xs',
                                        record.base_salary > prevSalary ? 'text-morandi-green' : 'text-morandi-red'
                                      )}>
                                        {record.base_salary > prevSalary ? '+' : ''}
                                        {(((record.base_salary - prevSalary) / prevSalary) * 100).toFixed(1)}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-morandi-secondary text-xs">{record.reason || '-'}</td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-morandi-secondary">
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
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.chinese_name || !formData.email || (!isEditMode && !formData.role_id && mode === 'hr')}
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
