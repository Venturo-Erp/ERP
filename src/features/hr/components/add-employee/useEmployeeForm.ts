import { getTodayString } from '@/lib/utils/format-date'
import { logger } from '@/lib/utils/logger'
import { UI_DELAYS } from '@/lib/constants/timeouts'
import { useState } from 'react'
import { useUserStore, userStoreHelpers } from '@/stores/user-store'
import { EmployeeFormData, CreatedEmployeeInfo } from './types'
import { getCurrentWorkspaceId, isSuperAdmin } from '@/lib/workspace-helpers'
import { COMP_HR_LABELS } from '@/features/hr/constants/labels'

export function useEmployeeForm(onSubmit: () => void) {
  const { create: addUser } = useUserStore()
  const currentWorkspaceId = getCurrentWorkspaceId()
  const isSuper = isSuperAdmin()

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployeeInfo | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [formData, setFormData] = useState<EmployeeFormData>({
    english_name: '',
    display_name: '',
    chinese_name: '',
    pinyin: '',
    auth_email: '',
    defaultPassword: '00000000',
    roles: [],
    personal_info: {
      national_id: '',
      birth_date: '',
      phone: [''],
      email: '',
      address: '',
      emergency_contact: {
        name: '',
        relationship: '',
        phone: '',
      },
    },
    job_info: {
      hire_date: getTodayString(),
    },
    salary_info: {
      base_salary: 0,
      allowances: [],
      salaryHistory: [],
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.english_name.trim() || !formData.display_name.trim()) {
      alert(COMP_HR_LABELS.請填寫姓名)
      return
    }

    if (!formData.auth_email.trim()) {
      alert('請填寫登入 Email')
      return
    }

    try {
      const employee_number = userStoreHelpers.generateUserNumber()

      // 決定 workspace_id
      // super_admin 可以選擇，一般 admin 使用自己的 workspace
      const targetWorkspaceId = isSuper
        ? formData.workspace_id || currentWorkspaceId
        : currentWorkspaceId

      if (!targetWorkspaceId) {
        alert(COMP_HR_LABELS.無法取得_workspace_請重新登入)
        return
      }

      // 取得 workspace code（用於 Auth email 格式）
      const { supabase } = await import('@/lib/supabase/client')
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('code')
        .eq('id', targetWorkspaceId)
        .single()

      // 🔧 統一 ID 架構：先建立 Auth 帳號，取得 ID 後作為員工 ID
      // 這樣 employee.id = auth.uid()，不需要額外的 supabase_user_id 映射
      let authUserId: string | null = null

      try {
        const authResponse = await fetch('/api/auth/create-employee-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_number,
            password: formData.defaultPassword,
            workspace_code: workspace?.code || null,
            email: formData.auth_email || undefined,
          }),
        })

        if (authResponse.ok) {
          const authResult = await authResponse.json()
          authUserId = authResult.data?.user?.id || null
          logger.log(COMP_HR_LABELS.Auth_帳號已建立, employee_number, 'ID:', authUserId)
        } else {
          const error = await authResponse.json()
          logger.warn(COMP_HR_LABELS.建立_Auth_帳號失敗, error)
        }
      } catch (authError) {
        logger.warn(COMP_HR_LABELS.建立_Auth_帳號失敗, authError)
      }

      // 建立員工資料
      // 如果有 Auth User ID，使用它作為員工 ID（統一 ID 架構）
      // 同時設定 supabase_user_id 確保向後相容
      const dbEmployeeData = {
        ...(authUserId ? { id: authUserId } : {}), // 使用 Auth User ID 作為員工 ID
        employee_number: employee_number,
        english_name: formData.english_name,
        display_name: formData.display_name,
        chinese_name: formData.chinese_name,
        pinyin: formData.pinyin || null,
        workspace_id: targetWorkspaceId,
        supabase_user_id: authUserId, // 設定 supabase_user_id（向後相容）
        role_id: formData.role_id || undefined, // 職務 ID
        roles: formData.roles as (
          | 'admin'
          | 'employee'
          | 'user'
          | 'tour_leader'
          | 'sales'
          | 'accountant'
          | 'assistant'
          | 'super_admin'
        )[],
        personal_info: {
          national_id: formData.personal_info.national_id,
          birth_date: formData.personal_info.birth_date,
          phone: formData.personal_info.phone.filter(p => p.trim() !== ''),
          email: formData.personal_info.email,
          address: formData.personal_info.address,
          emergency_contact: {
            name: formData.personal_info.emergency_contact.name,
            relationship: formData.personal_info.emergency_contact.relationship,
            phone: formData.personal_info.emergency_contact.phone,
          },
        },
        job_info: {
          hire_date: formData.job_info.hire_date,
        },
        salary_info: {
          base_salary: formData.salary_info.base_salary,
          allowances: [],
          salary_history: [
            {
              effective_date: formData.job_info.hire_date,
              base_salary: formData.salary_info.base_salary,
              reason: COMP_HR_LABELS.入職起薪,
            },
          ],
        },
        attendance: {
          leave_records: [],
          overtime_records: [],
        },
        contracts: [],
        permissions: ['settings'],
        status: 'active' as const,
        must_change_password: true, // 新員工首次登入需要修改密碼
      }

      const newEmployee = await addUser(dbEmployeeData)

      // 自動加入該 workspace 的公開頻道（排除私密頻道和 DM）
      if (newEmployee?.id) {
        try {
          // 只取得公開頻道（排除 DIRECT 和 PRIVATE）
          const { data: channels } = await supabase
            .from('channels')
            .select('id')
            .eq('workspace_id', targetWorkspaceId)
            .in('channel_type', ['PUBLIC'])

          // 將新員工加入公開頻道
          if (channels && channels.length > 0) {
            const { createChannelMember } = await import('@/data/entities/channel-members')
            await Promise.all(
              channels.map(channel =>
                createChannelMember({
                  workspace_id: targetWorkspaceId,
                  channel_id: channel.id,
                  employee_id: newEmployee.id,
                  role: 'member',
                  status: 'active',
                })
              )
            )
            logger.log(`✅ 已將新員工加入 ${channels.length} 個公開頻道`)
          }
        } catch (channelError) {
          logger.error(COMP_HR_LABELS.加入頻道失敗_不影響員工建立, channelError)
        }
      }

      setCreatedEmployee({
        display_name: formData.display_name,
        employee_number: employee_number,
        password: formData.defaultPassword,
        email: formData.auth_email,
      })
      setShowSuccessDialog(true)
    } catch (error) {
      alert(COMP_HR_LABELS.創建員工失敗_請稍後再試)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), UI_DELAYS.SUCCESS_MESSAGE)
  }

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false)
    setCreatedEmployee(null)
    onSubmit()
  }

  return {
    formData,
    setFormData,
    showSuccessDialog,
    setShowSuccessDialog,
    createdEmployee,
    copiedField,
    handleSubmit,
    copyToClipboard,
    handleCloseSuccess,
    isSuperAdmin: isSuper, // 供表單判斷是否顯示 workspace 選擇
  }
}
