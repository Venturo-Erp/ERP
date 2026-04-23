import { useState } from 'react'
import { EmployeeFull } from '@/stores/types'
import { useUserStore, userStoreHelpers } from '@/stores/user-store'
import { BasicInfoFormData, PasswordData } from './types'
import { COMP_HR_LABELS } from '@/features/hr/constants/labels'

export function useBasicInfoForm(employee: EmployeeFull, setIsEditing: (editing: boolean) => void) {
  const { update: updateUser } = useUserStore()

  const [formData, setFormData] = useState<BasicInfoFormData>({
    display_name: employee.display_name || '',
    chinese_name: employee.chinese_name || '',
    english_name: employee.english_name || '',
    pinyin: employee.pinyin || '',
    personal_info: {
      national_id: employee.personal_info?.national_id || '',
      birth_date: employee.personal_info?.birth_date || '',
      phone: Array.isArray(employee.personal_info?.phone)
        ? employee.personal_info.phone
        : employee.personal_info?.phone
          ? [employee.personal_info.phone]
          : [''],
      email: employee.personal_info?.email || '',
      address: employee.personal_info?.address || '',
      emergency_contact: {
        name: employee.personal_info?.emergency_contact?.name || '',
        relationship: employee.personal_info?.emergency_contact?.relationship || '',
        phone: employee.personal_info?.emergency_contact?.phone || '',
      },
    },
    job_info: {
      position: employee.job_info?.position || '',
      supervisor: employee.job_info?.supervisor || '',
      hire_date: employee.job_info?.hire_date || '',
      probation_end_date: employee.job_info?.probation_end_date || '',
    },
  })

  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordData, setPasswordData] = useState<PasswordData>({
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false)

  const handleSave = async () => {
    // 只更新允許修改的欄位，不要修改 employee_number
    const updates: Partial<EmployeeFull> = {
      display_name: formData.display_name,
      chinese_name: formData.chinese_name,
      english_name: formData.english_name,
      pinyin: formData.pinyin,
      personal_info: formData.personal_info,
      job_info: formData.job_info,
    }

    try {
      await updateUser(employee.id, updates)
      setIsEditing(false)
    } catch (error) {
      alert(COMP_HR_LABELS.儲存失敗 + (error as Error).message)
    }
  }

  const handleCancel = () => {
    setFormData({
      display_name: employee.display_name || '',
      chinese_name: employee.chinese_name || '',
      english_name: employee.english_name || '',
      pinyin: employee.pinyin || '',
      personal_info: {
        national_id: employee.personal_info?.national_id || '',
        birth_date: employee.personal_info?.birth_date || '',
        phone: Array.isArray(employee.personal_info?.phone)
          ? employee.personal_info.phone
          : employee.personal_info?.phone
            ? [employee.personal_info.phone]
            : [''],
        email: employee.personal_info?.email || '',
        address: employee.personal_info?.address || '',
        emergency_contact: {
          name: employee.personal_info?.emergency_contact?.name || '',
          relationship: employee.personal_info?.emergency_contact?.relationship || '',
          phone: employee.personal_info?.emergency_contact?.phone || '',
        },
      },
      job_info: {
        position: employee.job_info?.position || '',
        supervisor: employee.job_info?.supervisor || '',
        hire_date: employee.job_info?.hire_date || '',
        probation_end_date: employee.job_info?.probation_end_date || '',
      },
    })
    setIsEditing(false)
  }

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(COMP_HR_LABELS.新密碼與確認密碼不符)
      return
    }

    if (passwordData.newPassword.length < 8) {
      alert(COMP_HR_LABELS.密碼長度至少需要8個字元)
      return
    }

    setPasswordUpdateLoading(true)

    try {
      // 呼叫 API 更新 Supabase Auth 密碼
      const response = await fetch('/api/auth/reset-employee-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          new_password: passwordData.newPassword,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        alert(COMP_HR_LABELS.密碼更新失敗 + result.error)
        return
      }

      alert(`成功更新 ${employee.display_name} 的密碼！`)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setShowPasswordSection(false)
    } catch (error) {
      alert(COMP_HR_LABELS.密碼更新失敗_請稍後再試)
    } finally {
      setPasswordUpdateLoading(false)
    }
  }

  return {
    formData,
    setFormData,
    showPasswordSection,
    setShowPasswordSection,
    passwordData,
    setPasswordData,
    showPassword,
    setShowPassword,
    passwordUpdateLoading,
    handleSave,
    handleCancel,
    handlePasswordUpdate,
  }
}
