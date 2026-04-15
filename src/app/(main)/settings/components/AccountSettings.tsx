import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateInput } from '@/components/ui/date-input'
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
import { useUserStore } from '@/stores/user-store'

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
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const { items: employees, update: updateEmployee, fetchAll } = useUserStore()
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentEmployee = employees.find(e => e.id === user?.id)

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
    emergency_contact_address: '',
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
        email: currentEmployee.personal_info?.email || currentEmployee.email || '',
        phone:
          (Array.isArray(currentEmployee.personal_info?.phone)
            ? currentEmployee.personal_info.phone[0]
            : currentEmployee.personal_info?.phone) || '',
        address: currentEmployee.personal_info?.address || '',
        birth_date: currentEmployee.personal_info?.birth_date || '',
        id_number: currentEmployee.personal_info?.national_id || '',
        bank_account: '',
        emergency_contact_name: currentEmployee.personal_info?.emergency_contact?.name || '',
        emergency_contact_relation:
          currentEmployee.personal_info?.emergency_contact?.relationship || '',
        emergency_contact_phone: currentEmployee.personal_info?.emergency_contact?.phone || '',
        emergency_contact_address: currentEmployee.personal_info?.emergency_contact?.address || '',
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

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('上傳失敗:', errorText)
        throw new Error(LABELS.UPLOAD_FAILED)
      }

      const result = await response.json()
      const publicUrl = result.data?.publicUrl || result.publicUrl

      // 立即更新顯示
      setCurrentAvatarUrl(publicUrl)

      // 更新資料庫
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('employee_number', user.employee_number)

      if (updateError) {
        logger.error('更新頭像 URL 失敗:', updateError)
      }

      // 重新載入員工資料
      await fetchAll()

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
      <div className="bg-card rounded-2xl shadow-md overflow-hidden border-l-4 border-morandi-gold">
        {/* Top Section: Avatar & Quick Info */}
        <div className="flex flex-col md:flex-row">
          {/* Avatar */}
          <div className="w-full md:w-80 bg-gradient-to-br from-morandi-container to-card p-10 flex flex-col items-center justify-center">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-3xl bg-morandi-gold/10 border-4 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
              >
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="頭像" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-morandi-secondary">
                    <Camera className="w-12 h-12 mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">上傳照片</span>
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
              <div className="inline-flex px-2 py-0.5 bg-morandi-gold/20 text-morandi-gold text-[10px] font-bold uppercase tracking-widest rounded-full mb-2">
                {currentEmployee?.job_info?.position || '員工'}
              </div>
              <h3 className="text-xl font-bold text-morandi-primary tracking-tight">
                {user.display_name || user.chinese_name}
              </h3>
            </div>
          </div>

          {/* Quick Entry */}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                  中文姓名
                </Label>
                <Input
                  value={formData.chinese_name}
                  onChange={e => setFormData({ ...formData, chinese_name: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
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
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase">
                  員工編號
                </Label>
                <Input
                  value={user.employee_number}
                  disabled
                  className="bg-morandi-container/50 border-border"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-morandi-gold" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-morandi-gold" />
                  手機
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                />
              </div>

              {/* Birth Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-morandi-gold" />
                  生日
                </Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                  placeholder="YYYY-MM-DD"
                />
              </div>

              {/* ID Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-morandi-gold" />
                  身分證
                </Label>
                <Input
                  value={formData.id_number}
                  onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-morandi-gold" />
                  地址
                </Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                />
              </div>

              {/* Bank Account */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-morandi-secondary uppercase flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-morandi-gold" />
                  銀行帳戶
                </Label>
                <Input
                  value={formData.bank_account}
                  onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                  className="border-morandi-gold/30 focus:border-morandi-gold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: 緊急聯絡人 */}
        <div className="p-6 bg-morandi-container/10">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-morandi-red" />
            <h3 className="text-sm font-bold text-morandi-primary uppercase">緊急聯絡人</h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-morandi-secondary uppercase">姓名</Label>
              <Input
                value={formData.emergency_contact_name}
                onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="border-morandi-gold/30 focus:border-morandi-gold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-morandi-secondary uppercase">關係</Label>
              <Input
                value={formData.emergency_contact_relation}
                onChange={e =>
                  setFormData({
                    ...formData,
                    emergency_contact_relation: e.target.value,
                  })
                }
                className="border-morandi-gold/30 focus:border-morandi-gold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-morandi-secondary uppercase">電話</Label>
              <Input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={e =>
                  setFormData({
                    ...formData,
                    emergency_contact_phone: e.target.value,
                  })
                }
                className="border-morandi-gold/30 focus:border-morandi-gold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-morandi-secondary uppercase">地址</Label>
              <Input
                value={formData.emergency_contact_address || ''}
                onChange={e =>
                  setFormData({ ...formData, emergency_contact_address: e.target.value })
                }
                className="border-morandi-gold/30 focus:border-morandi-gold"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end">
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
