'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Camera,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Heart,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { Employee } from '@/stores/types'

interface EmployeeDetailCardProps {
  employeeId: string
  onClose: () => void
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

export function EmployeeDetailCard({ employeeId, onClose }: EmployeeDetailCardProps) {
  const { items: employees, update: updateEmployee } = useUserStore()
  const employee = employees.find((e) => e.id === employeeId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    employee?.avatar_url || null
  )

  const [formData, setFormData] = useState({
    chinese_name: employee?.chinese_name || '',
    english_name: employee?.english_name || '',
    display_name: employee?.display_name || '',
    email: employee?.personal_info?.email || '',
    phone: employee?.personal_info?.phone || '',
    address: employee?.personal_info?.address || '',
    birth_date: employee?.personal_info?.birth_date || '',
    id_number: employee?.personal_info?.national_id || '',
    bank_account: '', // TODO: 從哪裡取？
    department: '', // TODO: 從哪裡取？
    position: employee?.job_info?.position || '',
    emergency_contact_name: employee?.personal_info?.emergency_contact?.name || '',
    emergency_contact_relation: employee?.personal_info?.emergency_contact?.relationship || '',
    emergency_contact_phone: employee?.personal_info?.emergency_contact?.phone || '',
    notes: '', // TODO: 從哪裡取？
    avatar_file: null as File | null,
    base_salary: employee?.salary_info?.base_salary || 0,
    custom_permissions: {} as Record<string, { can_read: boolean; can_write: boolean }>,
  })

  if (!employee) {
    return null
  }

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

    try {
      await updateEmployee(employeeId, {
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
          },
        },
        job_info: {
          position: formData.position,
          hire_date: employee.job_info?.hire_date || '',
        },
        salary_info: {
          base_salary: formData.base_salary,
          allowances: employee.salary_info?.allowances || [],
          salary_history: employee.salary_info?.salary_history || [],
        },
      })

      await alertSuccess('更新成功')
      onClose()
    } catch (error) {
      logger.error('更新員工失敗:', error)
      await alertError('更新失敗')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="basic">基本資料</TabsTrigger>
          <TabsTrigger value="permissions">權限調整</TabsTrigger>
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
                  <div className="inline-flex px-3 py-1 bg-morandi-blue/20 text-morandi-blue text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
                    {employee.employee_number}
                  </div>
                  <h3 className="text-xl font-bold text-morandi-primary tracking-tight">
                    {employee.display_name || employee.chinese_name}
                  </h3>
                  <p className="text-sm text-morandi-secondary mt-1">{employee.job_info?.position || '職位未設定'}</p>
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                      職位
                    </Label>
                    <Input
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="bg-morandi-container/30 border-morandi-border rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-8 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3 text-morandi-gold" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                  />
                </div>

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
                  />
                </div>

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

                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-morandi-gold" />
                    地址
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-morandi-gold" />
                    身分證
                  </Label>
                  <Input
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    className="bg-morandi-container/30 border-morandi-border rounded-xl"
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
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: 權限調整 */}
        <TabsContent value="permissions" className="flex-1 overflow-y-auto">
          <div className="bg-white p-8 rounded-lg border border-morandi-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-morandi-border">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-morandi-gold" />
                  <div>
                    <h3 className="text-lg font-bold text-morandi-primary">個人權限調整</h3>
                    <p className="text-sm text-morandi-secondary mt-1">
                      職務：
                      <span className="font-semibold text-morandi-primary ml-1">
                        {employee.job_info?.position || '未設定'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-morandi-blue/10 border border-morandi-blue/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-morandi-blue shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-morandi-primary mb-1">說明</p>
                    <p className="text-xs text-morandi-secondary">
                      員工會繼承職務的預設權限。這裡可以針對特定功能額外調整權限。
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
                            <span className="font-medium text-morandi-primary">{route.name}</span>
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
                        <li>• 獎金/津貼可在此頁面設定</li>
                        <li>• 薪資資訊僅限人資/管理員查看</li>
                      </ul>
                    </div>
                  </div>
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
          onClick={onClose}
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
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              儲存變更
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
