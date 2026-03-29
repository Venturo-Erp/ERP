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
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { ROLES, type UserRole } from '@/lib/rbac-config'
import { cn } from '@/lib/utils'

interface EmployeeFormProps {
  employeeId?: string
  onSubmit: () => void
  onCancel: () => void
  mode?: 'hr' | 'self'
}

type TabType = 'basic' | 'permissions' | 'salary'

export function EmployeeForm({ employeeId, onSubmit, onCancel, mode = 'hr' }: EmployeeFormProps) {
  const { items: employees, create: createEmployee, update: updateEmployee } = useUserStore()
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
        role: (employee.roles?.[0] as UserRole) || '',
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

    if (!isEditMode && !formData.role && mode === 'hr') {
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

  // 根據 mode 決定顯示哪些分頁
  const allTabs = [
    { key: 'basic' as const, label: '基本資料', icon: User, showIn: ['hr', 'self'] },
    { key: 'permissions' as const, label: '職務權限', icon: Shield, showIn: ['hr'] },
    { key: 'salary' as const, label: '薪資設定', icon: DollarSign, showIn: ['hr'] },
  ]
  const tabs = allTabs.filter(t => t.showIn.includes(mode))
  const showTabs = tabs.length > 1

  // RBAC 角色列表（排除 super_admin 和 bot）
  const availableRoles = Object.values(ROLES).filter(r => r.id !== 'super_admin' && r.id !== 'bot')

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* 主內容區 */}
      <div className="flex-1 overflow-y-auto">
        {/* Character Card 風格 */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border-l-4 border-morandi-gold m-6">
          {/* 頂部：照片 + 表單 */}
          <div className="flex flex-col md:flex-row">
            {/* 左側：照片 */}
            <div className="w-full md:w-72 bg-gradient-to-br from-morandi-container to-white p-8 flex flex-col items-center justify-start">
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
                <div className="inline-flex px-2 py-0.5 bg-morandi-green/20 text-morandi-green text-[10px] font-bold uppercase tracking-widest rounded-full mb-2">
                  {isEditMode ? employee?.employee_number : '新員工'}
                </div>
                <h3 className="text-lg font-bold text-morandi-primary">
                  {formData.display_name || formData.chinese_name || '未命名'}
                </h3>
                {formData.role && (
                  <p className="text-xs text-morandi-secondary mt-0.5">
                    {ROLES[formData.role]?.label}
                  </p>
                )}
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

            {/* 右側：表單內容 */}
            <div className="flex-1 p-6">
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
                      <Label className="text-xs font-semibold text-morandi-secondary uppercase">職位名稱</Label>
                      <Input
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="border-morandi-gold/30 focus:border-morandi-gold"
                        placeholder="例：業務專員"
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
                  <div className="pt-4 border-t border-morandi-border">
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
                    </div>
                  </div>
                </div>
              )}

              {/* 職務權限 */}
              {activeTab === 'permissions' && (
                <div className="space-y-5">
                  {/* 職務選擇 */}
                  <div>
                    <Label className="text-xs font-semibold text-morandi-secondary uppercase mb-2 block">
                      職務 {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full max-w-xs px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-white text-morandi-primary"
                    >
                      <option value="">請選擇職務</option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.label}</option>
                      ))}
                    </select>
                    {formData.role && (
                      <p className="text-xs text-morandi-secondary mt-1.5">
                        {ROLES[formData.role]?.description}
                      </p>
                    )}
                  </div>

                  {/* 權限開關列表 */}
                  {formData.role && (
                    <div className="pt-4 border-t border-morandi-border">
                      <h4 className="text-sm font-semibold text-morandi-primary mb-3">功能權限</h4>
                      <div className="border border-morandi-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-morandi-container/50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">功能</th>
                              <th className="px-4 py-2.5 text-center font-semibold text-morandi-secondary text-xs uppercase w-20">狀態</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-morandi-border">
                            {ROLES[formData.role]?.permissions[0] === '*' ? (
                              <tr className="bg-morandi-gold/5">
                                <td className="px-4 py-3 text-morandi-primary font-medium">所有功能</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex px-2 py-0.5 bg-morandi-green/20 text-morandi-green text-xs rounded-full">開啟</span>
                                </td>
                              </tr>
                            ) : (
                              ROLES[formData.role]?.permissions.map((perm) => (
                                <tr key={perm} className="hover:bg-morandi-container/30">
                                  <td className="px-4 py-3 text-morandi-primary">{perm}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex px-2 py-0.5 bg-morandi-green/20 text-morandi-green text-xs rounded-full">開啟</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-morandi-secondary mt-2">
                        權限由職務定義，如需調整請至「職務管理」編輯
                      </p>
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
          </div>
        </div>
      </div>

      {/* 底部按鈕 */}
      <div className="px-6 py-4 border-t border-morandi-border flex justify-end gap-3 bg-morandi-container/30 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="submit"
          disabled={submitting || !formData.chinese_name || !formData.email || (!isEditMode && !formData.role && mode === 'hr')}
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
