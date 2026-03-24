'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmployeeFormData } from './types'
import { COMP_HR_LABELS } from '@/features/hr/constants/labels'
import { useAuthStore } from '@/stores/auth-store'

interface WorkspaceRole {
  id: string
  name: string
  description: string | null
  is_admin: boolean
}

interface PasswordAndRoleFieldsProps {
  formData: EmployeeFormData
  setFormData: (data: EmployeeFormData) => void
}

export function PasswordAndRoleFields({ formData, setFormData }: PasswordAndRoleFieldsProps) {
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore(state => state.user)

  // 載入工作空間的職務列表
  useEffect(() => {
    async function loadRoles() {
      if (!user?.workspace_id) return

      try {
        const res = await fetch(`/api/permissions/roles?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setWorkspaceRoles(data.roles || [])
        }
      } catch (error) {
        console.error('載入職務失敗:', error)
      }
      setLoading(false)
    }

    loadRoles()
  }, [user?.workspace_id])

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {COMP_HR_LABELS.LABEL_9167}
        </label>
        <Input
          type="text"
          value={formData.defaultPassword}
          onChange={e => setFormData({ ...formData, defaultPassword: e.target.value })}
          placeholder={COMP_HR_LABELS.請設定預設密碼}
          required
        />
        <p className="text-xs text-morandi-muted mt-1">{COMP_HR_LABELS.LABEL_3681}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-2">
          職務
        </label>
        {loading ? (
          <p className="text-sm text-morandi-muted">載入中...</p>
        ) : workspaceRoles.length === 0 ? (
          <div className="text-sm text-morandi-muted">
            <p>尚未建立職務</p>
            <p className="text-xs mt-1">請先到「設定 &gt; 角色管理」建立職務</p>
          </div>
        ) : (
          <>
            <Select
              value={formData.role_id || ''}
              onValueChange={value => setFormData({ ...formData, role_id: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇職務..." />
              </SelectTrigger>
              <SelectContent>
                {workspaceRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                    {role.is_admin && (
                      <span className="ml-2 text-xs text-morandi-gold">（管理員）</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-morandi-muted mt-2">
              職務決定員工的系統權限
            </p>
          </>
        )}
      </div>
    </>
  )
}
