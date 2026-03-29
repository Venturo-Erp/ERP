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
import { Camera, Save, Mail, Phone, MapPin, Calendar, CreditCard, Heart, Loader2, User, DollarSign, Shield } from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// 職務類型（從 API 取得）
interface Role {
  id: string
  name: string
  description?: string
  workspace_id: string
  is_admin?: boolean
}

// 路由權限類型
interface RoutePermission {
  route: string
  name: string
  can_read: boolean
  can_write: boolean
}

// 所有可用功能（可以在這裡設定的權限）
const ALL_AVAILABLE_ROUTES: { route: string; name: string }[] = [
  { route: '/dashboard', name: '儀表板' },
  { route: '/tours', name: '報價/開團' },
  { route: '/orders', name: '訂單管理' },
  { route: '/customers', name: '顧客管理' },
  { route: '/itinerary', name: '行程管理' },
  { route: '/finance/payments', name: '收款管理' },
  { route: '/finance/requests', name: '請款管理' },
  { route: '/finance/treasury', name: '金庫' },
  { route: '/accounting', name: '會計系統' },
  { route: '/hr', name: '人資管理' },
  { route: '/database', name: '旅遊資料庫' },
  { route: '/calendar', name: '行事曆' },
  { route: '/todos', name: '待辦事項' },
  { route: '/channel', name: '頻道' },
  { route: '/settings', name: '設定' },
]

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
  const [rolePermissions, setRolePermissions] = useState<RoutePermission[]>([])

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

  // 當選擇職務時，載入該職務的權限（合併所有可用功能）
  useEffect(() => {
    if (!formData.role_id) {
      setRolePermissions([])
      return
    }
    
    const fetchPermissions = async () => {
      try {
        const res = await fetch(`/api/permissions/role-permissions?role_id=${formData.role_id}`)
        if (res.ok) {
          const data = await res.json()
          // 合併所有可用功能，標記已設定的權限
          const merged = ALL_AVAILABLE_ROUTES.map(r => {
            const existing = data.find((d: RoutePermission) => d.route === r.route)
            return {
              route: r.route,
              name: r.name,
              can_read: existing?.can_read || false,
              can_write: existing?.can_write || false,
            }
          })
          setRolePermissions(merged)
        }
      } catch (err) {
        logger.error('載入權限失敗:', err)
      }
    }
    fetchPermissions()
  }, [formData.role_id])

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

      // 如果有修改權限設定（非管理員職務），更新 role_route_permissions
      if (formData.role_id && !selectedRole?.is_admin && rolePermissions.length > 0) {
        try {
          await fetch('/api/permissions/role-permissions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role_id: formData.role_id,
              permissions: rolePermissions,
            }),
          })
        } catch (err) {
          logger.warn('更新權限失敗:', err)
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
                    selectedRole?.is_admin ? (
                      <div className="text-center py-8 text-morandi-secondary">
                        <Shield className="w-12 h-12 mx-auto mb-3 text-morandi-gold/50" />
                        <p>管理員擁有系統所有權限</p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-semibold text-morandi-primary mb-3">功能權限設定</h4>
                        <div className="border border-morandi-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-morandi-container/50">
                              <tr>
                                <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">功能</th>
                                <th className="px-4 py-2.5 text-center font-semibold text-morandi-secondary text-xs uppercase w-20">讀取</th>
                                <th className="px-4 py-2.5 text-center font-semibold text-morandi-secondary text-xs uppercase w-20">寫入</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-morandi-border">
                              {rolePermissions.map((perm) => (
                                <tr key={perm.route} className="hover:bg-morandi-container/30">
                                  <td className="px-4 py-3 text-morandi-primary">{perm.name}</td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_read}
                                      onChange={(e) => {
                                        setRolePermissions(prev => prev.map(p => 
                                          p.route === perm.route 
                                            ? { ...p, can_read: e.target.checked, can_write: e.target.checked ? p.can_write : false }
                                            : p
                                        ))
                                      }}
                                      className="w-4 h-4 text-morandi-gold border-morandi-border rounded focus:ring-morandi-gold"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_write}
                                      disabled={!perm.can_read}
                                      onChange={(e) => {
                                        setRolePermissions(prev => prev.map(p => 
                                          p.route === perm.route 
                                            ? { ...p, can_write: e.target.checked }
                                            : p
                                        ))
                                      }}
                                      className="w-4 h-4 text-morandi-gold border-morandi-border rounded focus:ring-morandi-gold disabled:opacity-30"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-morandi-secondary mt-2">
                          勾選讀取後才能勾選寫入，儲存時會更新此職務的權限設定
                        </p>
                      </div>
                    )
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
