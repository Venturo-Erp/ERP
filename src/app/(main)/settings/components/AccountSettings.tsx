import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Camera,
  User,
  Loader2,
  Save,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Heart,
} from 'lucide-react'
import { alertSuccess, alertError, alertWarning } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { PasswordData } from '../types'
import { supabase } from '@/lib/supabase/client'
import { compressAvatarImage } from '@/lib/image-utils'
import { LABELS } from '../constants/labels'
import { useEmployees } from '@/data/entities/employees'

interface AccountSettingsProps {
  user: {
    id: string
    employee_number: string
    display_name?: string
    chinese_name?: string
    english_name?: string
    name?: string
    email?: string
    avatar_url?: string | null
    workspace_code?: string
  } | null
  showPasswordSection: boolean
  setShowPasswordSection: (show: boolean) => void
  passwordData: PasswordData
  setPasswordData: (data: PasswordData) => void
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  passwordUpdateLoading: boolean
  setPasswordUpdateLoading: (loading: boolean) => void
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const { items: employees, update: updateEmployee, fetchAll } = useEmployees()
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentEmployee = employees.find((e) => e.id === user?.id)

  const [formData, setFormData] = useState({
    display_name: '',
    chinese_name: '',
    english_name: '',
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    id_number: '',
    bank_account: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    notes: '',
  })

  // 載入員工資料
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 當 employees 載入後更新 formData
  useEffect(() => {
    if (currentEmployee) {
      setFormData({
        display_name: currentEmployee.display_name || '',
        chinese_name: currentEmployee.chinese_name || '',
        english_name: currentEmployee.english_name || '',
        email: currentEmployee.email || '',
        phone: currentEmployee.phone || '',
        address: currentEmployee.address || '',
        birth_date: currentEmployee.birth_date || '',
        id_number: currentEmployee.id_number || '',
        bank_account: currentEmployee.bank_account || '',
        emergency_contact_name: currentEmployee.emergency_contact?.name || '',
        emergency_contact_relation: currentEmployee.emergency_contact?.relation || '',
        emergency_contact_phone: currentEmployee.emergency_contact?.phone || '',
        notes: currentEmployee.notes || '',
      })
      setCurrentAvatarUrl(currentEmployee.avatar_url || null)
    }
  }, [currentEmployee])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      await alertWarning(LABELS.UNSUPPORTED_IMAGE_FORMAT)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      await alertWarning(LABELS.FILE_SIZE_TOO_LARGE)
      return
    }

    setAvatarUploading(true)
    try {
      const compressedFile = await compressAvatarImage(file)
      const fileName = `${user.employee_number}_${Date.now()}.jpg`
      const filePath = `avatars/${fileName}`

      const formDataUpload = new FormData()
      formDataUpload.append('file', compressedFile)
      formDataUpload.append('bucket', 'user-avatars')
      formDataUpload.append('path', filePath)

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) throw new Error(LABELS.UPLOAD_FAILED)

      const { publicUrl } = await response.json()

      await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('employee_number', user.employee_number)

      setCurrentAvatarUrl(publicUrl)
      await alertSuccess(LABELS.AVATAR_UPLOAD_SUCCESS)
    } catch (error) {
      logger.error('頭像上傳失敗:', error)
      await alertError(LABELS.AVATAR_UPLOAD_FAILED)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      await updateEmployee(user.id, {
        display_name: formData.display_name,
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        birth_date: formData.birth_date,
        id_number: formData.id_number,
        bank_account: formData.bank_account,
        emergency_contact: {
          name: formData.emergency_contact_name,
          relation: formData.emergency_contact_relation,
          phone: formData.emergency_contact_phone,
        },
        notes: formData.notes,
      })
      await alertSuccess('資料更新成功')
    } catch (error) {
      logger.error('更新失敗:', error)
      await alertError('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Character Card */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border-l-4 border-morandi-gold">
        {/* Top Section: Avatar & Quick Info */}
        <div className="flex flex-col md:flex-row border-b border-morandi-border">
          {/* Avatar */}
          <div className="w-full md:w-80 bg-gradient-to-br from-morandi-container to-white p-10 flex flex-col items-center justify-center border-r border-morandi-border">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-3xl bg-morandi-gold/10 border-4 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
              >
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt="頭像"
                    className="w-full h-full object-cover"
                  />
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-4 -right-4 w-14 h-14 bg-morandi-gold hover:bg-morandi-gold/90 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50 group-hover:scale-110"
              >
                {avatarUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="mt-6 text-center">
              <div className="inline-flex px-3 py-1 bg-morandi-green/20 text-morandi-green text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
                在職中
              </div>
              <h3 className="text-xl font-bold text-morandi-primary tracking-tight">
                {user.display_name || user.chinese_name}
              </h3>
              <p className="text-sm text-morandi-secondary mt-1">{user.employee_number}</p>
            </div>
          </div>

          {/* Quick Entry */}
          <div className="flex-1 p-8 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                  顯示名稱
                </Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  className="bg-morandi-container/30 border-morandi-border rounded-xl"
                  placeholder="例：William"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                  員工編號
                </Label>
                <Input
                  value={user.employee_number}
                  disabled
                  className="bg-morandi-container/50 border-morandi-border rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                  中文姓名
                </Label>
                <Input
                  value={formData.chinese_name}
                  onChange={(e) =>
                    setFormData({ ...formData, chinese_name: e.target.value })
                  }
                  className="bg-morandi-container/30 border-morandi-border rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-morandi-secondary uppercase tracking-widest">
                  英文姓名
                </Label>
                <Input
                  value={formData.english_name}
                  onChange={(e) =>
                    setFormData({ ...formData, english_name: e.target.value })
                  }
                  className="bg-morandi-container/30 border-morandi-border rounded-xl"
                />
              </div>
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
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-morandi-container/30 border-morandi-border rounded-xl"
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
                onChange={(e) =>
                  setFormData({ ...formData, birth_date: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, id_number: e.target.value })
                }
                className="bg-morandi-container/30 border-morandi-border rounded-xl"
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
                onChange={(e) =>
                  setFormData({ ...formData, bank_account: e.target.value })
                }
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
                      setFormData({
                        ...formData,
                        emergency_contact_relation: e.target.value,
                      })
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
                      setFormData({
                        ...formData,
                        emergency_contact_phone: e.target.value,
                      })
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
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-6 bg-morandi-container/30 border-t border-morandi-border flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                儲存變更
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
