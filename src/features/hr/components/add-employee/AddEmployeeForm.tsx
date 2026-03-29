'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'
import { useUserStore } from '@/stores/user-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { AddEmployeeFormProps } from './types'

export function AddEmployeeForm({ onSubmit, onCancel }: AddEmployeeFormProps) {
  const { create: createEmployee } = useUserStore()
  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.chinese_name || !formData.email) {
      await alertError('請填寫必填欄位（中文姓名、Email）')
      return
    }

    setSubmitting(true)
    try {
      // TODO: 上傳頭像到 Supabase Storage
      // const avatarUrl = formData.avatar_file ? await uploadAvatar(formData.avatar_file) : null

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
        // avatar_url: avatarUrl,
      })

      await alertSuccess('角色建立成功', '員工已加入系統')
      onSubmit()
    } catch (error) {
      logger.error('建立員工失敗:', error)
      await alertError('建立失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Character Card */}
      <div className="bg-white overflow-hidden border-l-4 border-morandi-gold flex-1 overflow-y-auto">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row border-b border-morandi-border">
          {/* Avatar Section */}
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
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-8 lg:p-10 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                備註 & 特殊需求
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-morandi-container/30 border-morandi-border rounded-xl resize-none"
                placeholder="特殊需求、醫療資訊、設備偏好等..."
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="px-8 py-6 bg-morandi-container/50 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-morandi-border">
        <div className="flex items-center gap-2 text-morandi-secondary">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium">資料加密儲存，自動生成員工編號</span>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none text-morandi-secondary border-morandi-border"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button
            type="submit"
            disabled={submitting || !formData.chinese_name || !formData.email}
            className="flex-1 sm:flex-none bg-morandi-gold hover:bg-morandi-gold/90 text-white font-semibold shadow-lg"
          >
            {submitting ? (
              '建立中...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                儲存角色
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
