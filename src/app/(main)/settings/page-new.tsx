'use client'

import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useRef, useEffect } from 'react'
import { User, Camera, Mail, Phone, MapPin, Shield, Heart, LogOut, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { compressAvatarImage } from '@/lib/image-utils'
import { alertSuccess, alertError, alertWarning } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useEmployees } from '@/data/entities/employees'

export default function CharacterSettingsPage() {
  const { user, logout } = useAuthStore()
  const { items: employees, update: updateEmployee } = useEmployees()
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    display_name: '',
    chinese_name: '',
    english_name: '',
    email: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
  })

  // Load employee data
  useEffect(() => {
    if (user && employees.length > 0) {
      const emp = employees.find(e => e.id === user.id)
      if (emp) {
        setCurrentEmployee(emp)
        setFormData({
          display_name: emp.display_name || '',
          chinese_name: emp.chinese_name || '',
          english_name: emp.english_name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          address: emp.address || '',
          emergency_contact_name: emp.emergency_contact?.name || '',
          emergency_contact_relation: emp.emergency_contact?.relation || '',
          emergency_contact_phone: emp.emergency_contact?.phone || '',
        })
      }
    }
  }, [user, employees])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      await alertWarning('不支援的圖片格式')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      await alertWarning('檔案過大（最大 10MB）')
      return
    }

    setAvatarUploading(true)
    try {
      const compressedFile = await compressAvatarImage(file)
      const fileName = `${user.employee_number}_${Date.now()}.jpg`
      const filePath = `avatars/${fileName}`

      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('bucket', 'user-avatars')
      formData.append('path', filePath)

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('上傳失敗')

      const { publicUrl } = await response.json()

      await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('employee_number', user.employee_number)

      setCurrentEmployee({ ...currentEmployee, avatar_url: publicUrl })
      await alertSuccess('頭像更新成功')
    } catch (error) {
      logger.error('頭像上傳失敗:', error)
      await alertError('頭像上傳失敗')
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
        emergency_contact: {
          name: formData.emergency_contact_name,
          relation: formData.emergency_contact_relation,
          phone: formData.emergency_contact_phone,
        },
      })
      await alertSuccess('資料更新成功')
    } catch (error) {
      logger.error('更新失敗:', error)
      await alertError('資料更新失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  if (!user || !currentEmployee) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background via-surface to-surface-container overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-surface-container-highest border-b border-outline-variant px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-headline font-bold text-on-surface">角色設定</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2 text-error border-error hover:bg-error hover:text-on-error"
        >
          <LogOut className="w-4 h-4" />
          登出
        </Button>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-4rem)] p-6 overflow-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6 h-full">
          
          {/* Left Column - Avatar Card */}
          <div className="col-span-1 space-y-6">
            {/* Avatar */}
            <div className="bg-surface-container-highest rounded-xl p-6 character-card-glow">
              <div className="relative w-full aspect-square mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-primary-container flex items-center justify-center border-4 border-primary-fixed">
                  {currentEmployee.avatar_url ? (
                    <img
                      src={currentEmployee.avatar_url}
                      alt="頭像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-24 h-24 text-on-primary-container" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-3 -right-3 w-16 h-16 bg-primary hover:bg-primary-dim rounded-full flex items-center justify-center text-on-primary shadow-lg transition-all disabled:opacity-50"
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
              
              <div className="text-center">
                <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
                  {currentEmployee.display_name || currentEmployee.chinese_name}
                </h2>
                <p className="text-sm text-on-surface-variant mb-2">
                  {currentEmployee.employee_number}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container rounded-full">
                  <span className="text-xs font-medium text-on-primary-container">
                    {currentEmployee.status === 'active' ? '在職' : '離職'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-surface-container-highest rounded-xl p-6 character-card-glow">
              <h3 className="text-sm font-semibold text-on-surface-variant mb-4">職位資訊</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">部門</span>
                  <span className="text-sm font-medium text-on-surface">
                    {currentEmployee.department || '未設定'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">職位</span>
                  <span className="text-sm font-medium text-on-surface">
                    {currentEmployee.position || '未設定'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">到職日</span>
                  <span className="text-sm font-medium text-on-surface">
                    {currentEmployee.start_date || '未設定'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Basic Info */}
          <div className="col-span-1 bg-surface-container-highest rounded-xl p-6 character-card-glow">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-headline font-bold text-on-surface">基本資料</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-on-surface-variant mb-1.5">顯示名稱</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="bg-surface-container"
                />
              </div>

              <div>
                <Label className="text-sm text-on-surface-variant mb-1.5">中文姓名</Label>
                <Input
                  value={formData.chinese_name}
                  onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
                  className="bg-surface-container"
                />
              </div>

              <div>
                <Label className="text-sm text-on-surface-variant mb-1.5">英文姓名</Label>
                <Input
                  value={formData.english_name}
                  onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                  className="bg-surface-container"
                />
              </div>

              <div className="pt-4 border-t border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-primary" />
                  <Label className="text-sm text-on-surface-variant">Email</Label>
                </div>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-surface-container"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4 text-primary" />
                  <Label className="text-sm text-on-surface-variant">手機</Label>
                </div>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-surface-container"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-primary" />
                  <Label className="text-sm text-on-surface-variant">地址</Label>
                </div>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-surface-container"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Emergency Contact & Security */}
          <div className="col-span-1 space-y-6">
            {/* Emergency Contact */}
            <div className="bg-surface-container-highest rounded-xl p-6 character-card-glow">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-error" />
                <h3 className="text-lg font-headline font-bold text-on-surface">緊急聯絡人</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-on-surface-variant mb-1.5">姓名</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="bg-surface-container"
                  />
                </div>

                <div>
                  <Label className="text-sm text-on-surface-variant mb-1.5">關係</Label>
                  <Input
                    value={formData.emergency_contact_relation}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                    placeholder="例：配偶、父母、兄弟姊妹"
                    className="bg-surface-container"
                  />
                </div>

                <div>
                  <Label className="text-sm text-on-surface-variant mb-1.5">電話</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="bg-surface-container"
                  />
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-surface-container-highest rounded-xl p-6 character-card-glow">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-headline font-bold text-on-surface">帳號安全</h3>
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => window.location.href = '/settings?tab=password'}
                >
                  修改密碼
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => window.location.href = '/settings?tab=2fa'}
                >
                  雙重驗證
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-primary hover:bg-primary-dim text-on-primary font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  儲存中...
                </>
              ) : (
                '儲存變更'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
