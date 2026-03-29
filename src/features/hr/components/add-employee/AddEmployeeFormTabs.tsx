'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Camera,
  Save,
  X,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Heart,
  Shield,
  Lock,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { AddEmployeeFormProps } from './types'
import { useAuthStore } from '@/stores/auth-store'
import { useEffect } from 'react'

interface WorkspaceRole {
  id: string
  name: string
  description: string | null
  is_admin: boolean
}

const PERMISSION_ROUTES = [
  { route: '/tours', name: '旅遊團' },
  { route: '/orders', name: '訂單' },
  { route: '/quotes', name: '報價單' },
  { route: '/finance/payments', name: '收款管理' },
  { route: '/finance/requests', name: '請款管理' },
  { route: '/finance/treasury', name: '金庫管理' },
  { route: '/accounting', name: '會計系統' },
  { route: '/database', name: '資料管理' },
  { route: '/customers', name: '顧客管理' },
  { route: '/hr', name: '人資管理' },
  { route: '/calendar', name: '行事曆' },
  { route: '/channel', name: '工作空間' },
  { route: '/todos', name: '待辦事項' },
  { route: '/itinerary', name: '行程管理' },
  { route: '/settings', name: '設定' },
]

export function AddEmployeeFormTabs({ onSubmit, onCancel }: AddEmployeeFormProps) {
  const { create: createEmployee } = useUserStore()
  const user = useAuthStore((state) => state.user)
  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('basic')

  const [formData, setFormData] = useState({
    chinese_name: '',
    english_name: '',
    display_name: '',
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    id_number: '',
    bank_account: '',
    department: '',
    position: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    notes: '',
    avatar_file: null as File | null,
    role_id: '',
    base_salary: 0,
    custom_permissions: {} as Record<string, { can_read: boolean; can_write: boolean }>,
  })

  // 載入角色列表
  useEffect(() => {
    async function loadRoles() {
      if (!user?.workspace_id) return

      try {
        const res = await fetch(`/api/permissions/roles?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setWorkspaceRoles(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        logger.error('載入角色失敗:', error)
      }
      setLoadingRoles(false)
    }

    loadRoles()
  }, [user?.workspace_id])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, avatar_file: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePermissionChange = (route: string, type: 'read' | 'write', checked: boolean) => {
    const current = formData.custom_permissions[route] || { can_read: false, can_write: false }
    setFormData({
      ...formData,
      custom_permissions: {
        ...formData.custom_permissions,
        [route]: {
          ...current,
          [`can_${type}`]: checked,
        },
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.chinese_name || !formData.email) {
      await alertError('請填寫必填欄位（中文姓名、Email）')
      return
    }

    if (!formData.role_id) {
      await alertError('請選擇角色')
      return
    }

    setSubmitting(true)
    try {
      // TODO: 上傳頭像
      // const avatarUrl = formData.avatar_file ? await uploadAvatar(formData.avatar_file) : null

      // 生成預設密碼（西元生日）
      const defaultPassword = formData.birth_date
        ? formData.birth_date.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
        : '00000000'

      await createEmployee({
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        display_name: formData.display_name || formData.chinese_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        birth_date: formData.birth_date,
        id_number: formData.id_number,
        bank_account: formData.bank_account,
        department: formData.department,
        position: formData.position,
        emergency_contact: {
          name: formData.emergency_contact_name,
          relation: formData.emergency_contact_relation,
          phone: formData.emergency_contact_phone,
        },
        notes: formData.notes,
        status: 'active',
        role_id: formData.role_id,
        custom_permissions: formData.custom_permissions,
        base_salary: formData.base_salary,
        default_password: defaultPassword, // 西元生日
        // avatar_url: avatarUrl,
      })

      await alertSuccess('員工建立成功')
      onSubmit()
    } catch (error) {
      logger.error('建立員工失敗:', error)
      await alertError('建立失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="basic">基本資料</TabsTrigger>
          <TabsTrigger value="permissions">職務 & 權限</TabsTrigger>
          <TabsTrigger value="salary">薪資設定</TabsTrigger>
        </TabsList>

        {/* Tab 1: 基本資料（角色卡） */}
        <TabsContent value="basic" className="flex-1 overflow-y-auto">
          <div className="bg-white overflow-hidden border-l-4 border-morandi-gold rounded-lg">
            <div className="flex flex-col md:flex-row border-b border-morandi-border">
              {/* Avatar */}
              <div className="w-full md:w-80 bg-gradient-to-br from-morandi-container to-morandi-container/30 p-10 flex flex-col items-center justify-center border-r border-morandi-border">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-48 rounded-3xl bg-morandi-gold/10 border-4 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="預覽" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-morandi-secondary">
                        <Camera className="w-12 h-12 mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          上傳照片
                        </span>
                        <p className="text-[10px] mt-1 opacity-60">JPG, PNG, GIF</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-morandi-gold rounded-full flex items-center justify-center text-white shadow-lg">
                    <Camera className="w-6 h-6" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div className="mt-6 text-center">
                  <div className="inline-flex px-3 py-1 bg-morandi-green/20 text-morandi-green text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
                    新員工
                  </div>
                  <h3 className="text-xl font-bold text-morandi-primary tracking-tight">
                    {formData.display_name || formData.chinese_name || '未命名'}
                  </h3>
                  <p className="text-sm text-morandi-secondary mt-1">系統將自動生成員工編號</p>
                </div>
              </div>

              {/* Quick Entry */}
              <div className="flex-1 p-8 lg:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-1">
                      中文姓名 <span className="text-morandi-red">*</span>
                    </Label>
                    <Input
                      required
                      value={formData.chinese_name}
                      onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
                      className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      placeholder="例：簡威廉"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                      顯示名稱
                    </Label>
                    <Input
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      placeholder="例：William"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                      英文姓名
                    </Label>
                    <Input
                      value={formData.english_name}
                      onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                      className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      placeholder="例：William Chien"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                      部門
                    </Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="bg-morandi-container/30 border-morandi-border rounded-xl">
                        <SelectValue placeholder="選擇部門" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="營運">營運</SelectItem>
                        <SelectItem value="業務">業務</SelectItem>
                        <SelectItem value="技術">技術</SelectItem>
                        <SelectItem value="客服">客服</SelectItem>
                        <SelectItem value="財務">財務</SelectItem>
                        <SelectItem value="人資">人資</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                      職位
                    </Label>
                    <Input
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      placeholder="例：業務專員"
                    />
                  </div>
                </div>

                {/* 職務選擇 */}
                <div className="mt-8 pt-6 border-t border-morandi-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-morandi-gold" />
                    <h3 className="text-sm font-bold text-morandi-primary uppercase tracking-widest">
                      選擇職務 <span className="text-morandi-red">*</span>
                    </h3>
                  </div>
                  {loadingRoles ? (
                    <p className="text-sm text-morandi-secondary">載入中...</p>
                  ) : workspaceRoles.length === 0 ? (
                    <div className="text-sm text-morandi-secondary bg-morandi-container/30 p-4 rounded-lg">
                      <p>尚未建立職務</p>
                      <p className="text-xs mt-1">請先到「設定 &gt; 角色管理」建立職務</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workspaceRoles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => setFormData({ ...formData, role_id: role.id })}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            formData.role_id === role.id
                              ? 'border-morandi-gold bg-morandi-gold/5'
                              : 'border-morandi-border hover:border-morandi-gold/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-morandi-primary">{role.name}</h4>
                              {role.description && (
                                <p className="text-sm text-morandi-secondary mt-1">
                                  {role.description}
                                </p>
                              )}
                            </div>
                            {role.is_admin && (
                              <span className="text-xs bg-morandi-gold/20 text-morandi-gold px-2 py-1 rounded-full">
                                管理員
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-8 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3 text-morandi-gold" />
                    Email <span className="text-morandi-red">*</span>
                  </Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    placeholder="name@company.com"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <Phone className="w-3 h-3 text-morandi-gold" />
                    手機
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    placeholder="0912-345-678"
                  />
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-morandi-gold" />
                    生日
                  </Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                  />
                </div>

                {/* Address */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-morandi-gold" />
                    地址
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    placeholder="完整地址"
                  />
                </div>

                {/* ID Number */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-morandi-gold" />
                    身分證
                  </Label>
                  <Input
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    placeholder="A123456789"
                  />
                </div>

                {/* Bank Account */}
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-morandi-gold" />
                    銀行帳戶
                  </Label>
                  <Input
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    placeholder="銀行代碼-帳號"
                  />
                </div>

                {/* Emergency Contact */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-6 border-t border-morandi-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-4 h-4 text-morandi-red" />
                    <h3 className="text-sm font-bold text-morandi-primary uppercase tracking-widest">
                      緊急聯絡人
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                        姓名
                      </Label>
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={(e) =>
                          setFormData({ ...formData, emergency_contact_name: e.target.value })
                        }
                        className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                        關係
                      </Label>
                      <Input
                        value={formData.emergency_contact_relation}
                        onChange={(e) =>
                          setFormData({ ...formData, emergency_contact_relation: e.target.value })
                        }
                        className="bg-morandi-container/30 border-morandi-border rounded-xl"
                        placeholder="例：配偶、父母"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                        電話
                      </Label>
                      <Input
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, emergency_contact_phone: e.target.value })
                        }
                        className="bg-morandi-container/30 border-morandi-border rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                    備註
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl resize-none"
                    placeholder="特殊需求、醫療資訊等..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: 權限調整 */}
        <TabsContent value="permissions" className="flex-1 overflow-y-auto">
          <div className="bg-white p-8 rounded-lg border border-morandi-border">
            {!formData.role_id ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-morandi-secondary/30 mx-auto mb-4" />
                <p className="text-morandi-secondary">請先在「基本資料」選擇職務</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-morandi-border">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-morandi-gold" />
                    <div>
                      <h3 className="text-lg font-bold text-morandi-primary">
                        個人權限調整
                      </h3>
                      <p className="text-sm text-morandi-secondary mt-1">
                        已選擇職務：
                        <span className="font-semibold text-morandi-primary ml-1">
                          {workspaceRoles.find((r) => r.id === formData.role_id)?.name}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-morandi-blue/10 border border-morandi-blue/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-morandi-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-morandi-primary mb-1">
                        說明
                      </p>
                      <p className="text-xs text-morandi-secondary">
                        員工會繼承職務的預設權限。這裡可以針對特定功能額外調整權限（例如：業務額外給予「人資」權限）
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-morandi-container/50">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm text-morandi-primary">
                          功能模組
                        </th>
                        <th className="text-center p-4 font-semibold text-sm text-morandi-primary w-32">
                          可讀取
                        </th>
                        <th className="text-center p-4 font-semibold text-sm text-morandi-primary w-32">
                          可寫入
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_ROUTES.map((route, index) => {
                        const perm = formData.custom_permissions[route.route]
                        return (
                          <tr
                            key={route.route}
                            className={`${
                              index % 2 === 0 ? 'bg-white' : 'bg-morandi-container/10'
                            } hover:bg-morandi-gold/5 transition-colors`}
                          >
                            <td className="p-4">
                              <span className="font-medium text-morandi-primary">
                                {route.name}
                              </span>
                            </td>
                            <td className="text-center p-4">
                              <Checkbox
                                checked={perm?.can_read || false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(route.route, 'read', v as boolean)
                                }
                              />
                            </td>
                            <td className="text-center p-4">
                              <Checkbox
                                checked={perm?.can_write || false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(route.route, 'write', v as boolean)
                                }
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: 薪資設定 */}
        <TabsContent value="salary" className="flex-1">
          <div className="bg-white p-8 rounded-lg border border-morandi-border">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-morandi-gold" />
                <Label className="text-base font-bold text-morandi-primary">薪資資訊</Label>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-morandi-primary mb-2">
                    底薪（月薪）
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary">
                      NT$
                    </span>
                    <Input
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) =>
                        setFormData({ ...formData, base_salary: Number(e.target.value) })
                      }
                      className="bg-morandi-container/30 border-morandi-border rounded-xl pl-12"
                      placeholder="30000"
                    />
                  </div>
                  <p className="text-xs text-morandi-secondary mt-2">
                    每月固定薪資（不含獎金/津貼）
                  </p>
                </div>

                <div className="bg-morandi-blue/10 border border-morandi-blue/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-morandi-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-morandi-primary mb-1">
                        薪資說明
                      </p>
                      <ul className="text-xs text-morandi-secondary space-y-1">
                        <li>• 底薪為每月固定薪資</li>
                        <li>• 獎金/津貼可在員工詳情頁設定</li>
                        <li>• 薪資資訊僅限人資/管理員查看</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-morandi-container/30 rounded-lg p-4 border border-morandi-border">
                  <p className="text-sm font-semibold text-morandi-primary mb-2">
                    🔐 預設密碼
                  </p>
                  <p className="text-xs text-morandi-secondary">
                    系統將自動使用員工的<strong>西元生日</strong>作為預設密碼
                    <br />
                    例：生日 1990/08/15 → 預設密碼 <code className="bg-morandi-container px-1 py-0.5 rounded">19900815</code>
                    <br />
                    <br />
                    員工首次登入後會被要求修改密碼
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions Bar */}
      <div className="px-8 py-6 bg-morandi-container/30 border-t border-morandi-border flex justify-between items-center mt-4">
        <Button
          type="button"
          variant="outline"
          className="text-morandi-secondary border-morandi-border"
          onClick={onCancel}
        >
          <X className="w-4 h-4 mr-2" />
          取消
        </Button>
        <div className="flex items-center gap-3">
          {activeTab !== 'basic' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const tabs = ['basic', 'permissions', 'salary']
                const currentIndex = tabs.indexOf(activeTab)
                if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1])
              }}
            >
              上一步
            </Button>
          )}
          {activeTab !== 'salary' ? (
            <Button
              type="button"
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
              onClick={() => {
                const tabs = ['basic', 'permissions', 'salary']
                const currentIndex = tabs.indexOf(activeTab)
                if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1])
              }}
            >
              下一步
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting || !formData.chinese_name || !formData.email || !formData.role_id}
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white font-semibold"
            >
              {submitting ? '建立中...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  建立員工
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
