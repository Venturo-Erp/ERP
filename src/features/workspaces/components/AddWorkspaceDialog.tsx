'use client'
/**
 * AddWorkspaceDialog - 新增公司對話框
 * 包含建立第一個管理員帳號
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Save, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import bcrypt from 'bcryptjs'
import type { WorkspaceType } from '../types'
import { WORKSPACE_TYPE_LABELS } from '../types'
import { WORKSPACES_LABELS } from '../constants/labels'

interface AddWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddWorkspaceDialog({ open, onOpenChange, onSuccess }: AddWorkspaceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'travel_agency' as WorkspaceType,
    employee_number_prefix: 'E',
    default_password: '1234',
    admin_name: '',
    admin_employee_number: '',
    admin_password: '',
  })

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      code: '',
      type: 'travel_agency',
      employee_number_prefix: 'E',
      default_password: '1234',
      admin_name: '',
      admin_employee_number: '',
      admin_password: '',
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    // 驗證
    if (!formData.name.trim()) {
      await alert(WORKSPACES_LABELS.請輸入公司名稱, 'error')
      return
    }
    if (!formData.code.trim()) {
      await alert(WORKSPACES_LABELS.請輸入公司代號, 'error')
      return
    }
    if (!formData.admin_name.trim()) {
      await alert(WORKSPACES_LABELS.請輸入管理員姓名, 'error')
      return
    }
    if (!formData.admin_employee_number.trim()) {
      await alert(WORKSPACES_LABELS.請輸入管理員帳號, 'error')
      return
    }
    if (!formData.admin_password.trim()) {
      await alert(WORKSPACES_LABELS.請輸入管理員密碼, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. 建立公司
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: formData.name.trim(),
          code: formData.code.toLowerCase().trim(),
          type: formData.type,
          is_active: true,
          employee_number_prefix: formData.employee_number_prefix.trim().toUpperCase() || 'E',
          default_password: formData.default_password.trim() || '1234',
        })
        .select('id')
        .single()

      if (wsError) {
        if (wsError.code === '23505') {
          await alert(WORKSPACES_LABELS.此公司代號已存在, 'error')
          return
        }
        throw wsError
      }

      // 2. 建立管理員帳號
      const passwordHash = await bcrypt.hash(formData.admin_password, 12) // 與 auth.ts 一致
      const employeeNumber = formData.admin_employee_number.trim().toUpperCase()
      const workspaceCode = formData.code.toLowerCase().trim()

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert({
          workspace_id: workspace.id,
          display_name: formData.admin_name.trim(),
          employee_number: employeeNumber,
          password_hash: passwordHash,
          roles: ['admin'], // 使用 roles 陣列
          status: 'active',
          employee_type: 'human',
          must_change_password: true, // 首次登入需要改密碼
        })
        .select('id')
        .single()

      if (empError) {
        // 如果建立員工失敗，刪除剛建立的公司
        // P016：走 API（DB policy 只允許 service_role）。此 rollback 情境 workspace 剛建、
        // 0 員工 + 非 Corner + 非自己登入的那家 → API 所有 guard 都會通過。
        await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
        throw empError
      }

      // 3. 建立 Supabase Auth 帳號（重要！否則無法登入）
      try {
        const authResponse = await fetch('/api/auth/create-employee-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_number: employeeNumber,
            password: formData.admin_password,
            workspace_code: workspaceCode,
          }),
        })

        if (authResponse.ok) {
          const authResult = await authResponse.json()
          logger.log(WORKSPACES_LABELS.Auth_帳號已建立, authResult)

          // 綁定 supabase_user_id
          if (authResult.data?.user?.id && employee?.id) {
            await supabase
              .from('employees')
              .update({ supabase_user_id: authResult.data.user.id })
              .eq('id', employee.id)
            logger.log(WORKSPACES_LABELS.supabase_user_id_已綁定)
          }
        } else {
          const error = await authResponse.json()
          logger.warn(WORKSPACES_LABELS.建立_Auth_帳號失敗, error)
        }
      } catch (authError) {
        logger.warn(WORKSPACES_LABELS.建立_Auth_帳號失敗_不影響公司建立, authError)
      }

      await alert(`公司「${formData.name}」已建立，管理員帳號為 ${employeeNumber}`, 'success')
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      logger.error(WORKSPACES_LABELS.建立公司失敗, error)
      await alert(WORKSPACES_LABELS.建立公司失敗_請稍後再試, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onOpenChange, onSuccess, resetForm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className={DIALOG_SIZES.md}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={20} className="text-morandi-gold" />
            {WORKSPACES_LABELS.新增公司}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 公司資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-morandi-primary border-b border-border pb-2">
              {WORKSPACES_LABELS.LABEL_2270}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>{WORKSPACES_LABELS.LABEL_20}</Label>
                <Input
                  value={formData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  placeholder={WORKSPACES_LABELS.例_角落旅遊_台北}
                />
              </div>

              <div className="space-y-2">
                <Label required>{WORKSPACES_LABELS.LABEL_3535}</Label>
                <Input
                  value={formData.code}
                  onChange={e => handleFieldChange('code', e.target.value.toLowerCase())}
                  placeholder={WORKSPACES_LABELS.例_corner_小寫}
                />
                <p className="text-xs text-morandi-secondary">{WORKSPACES_LABELS.LABEL_8377}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label required>{WORKSPACES_LABELS.LABEL_3932}</Label>
              <Select
                value={formData.type}
                onValueChange={value => handleFieldChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WORKSPACE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{WORKSPACES_LABELS.LABEL_5013}</Label>
                <Input
                  value={formData.employee_number_prefix}
                  onChange={e => handleFieldChange('employee_number_prefix', e.target.value)}
                  placeholder="E"
                  className="uppercase"
                  maxLength={5}
                />
                <p className="text-xs text-morandi-secondary">
                  編號格式：{formData.employee_number_prefix || 'E'}001
                </p>
              </div>

              <div className="space-y-2">
                <Label>{WORKSPACES_LABELS.LABEL_9036}</Label>
                <Input
                  value={formData.default_password}
                  onChange={e => handleFieldChange('default_password', e.target.value)}
                  placeholder="1234"
                />
                <p className="text-xs text-morandi-secondary">{WORKSPACES_LABELS.LABEL_9086}</p>
              </div>
            </div>
          </div>

          {/* 管理員資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-morandi-primary border-b border-border pb-2">
              {WORKSPACES_LABELS.MANAGE_9574}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>{WORKSPACES_LABELS.MANAGE_9048}</Label>
                <Input
                  value={formData.admin_name}
                  onChange={e => handleFieldChange('admin_name', e.target.value)}
                  placeholder={WORKSPACES_LABELS.例_王大明}
                />
              </div>

              <div className="space-y-2">
                <Label required>{WORKSPACES_LABELS.LABEL_2161}</Label>
                <Input
                  value={formData.admin_employee_number}
                  onChange={e => handleFieldChange('admin_employee_number', e.target.value)}
                  placeholder={WORKSPACES_LABELS.例_E001}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label required>{WORKSPACES_LABELS.LABEL_8142}</Label>
              <Input
                type="password"
                value={formData.admin_password}
                onChange={e => handleFieldChange('admin_password', e.target.value)}
                placeholder={WORKSPACES_LABELS.請設定密碼}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {WORKSPACES_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            建立公司
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
