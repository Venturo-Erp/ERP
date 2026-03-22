'use client'
/**
 * AddAdminDialog - 新增管理員對話框
 * 為現有公司新增管理員帳號
 */

import { useState, useCallback, useEffect } from 'react'
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
import { UserPlus, Save, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import bcrypt from 'bcryptjs'
import type { WorkspaceWithDetails } from '../types'
import { WORKSPACES_LABELS } from '../constants/labels'

interface AddAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceWithDetails | null
  onSuccess: () => void
}

export function AddAdminDialog({ open, onOpenChange, workspace, onSuccess }: AddAdminDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    employee_number: '',
    password: '',
  })

  // 重置表單，使用公司預設密碼
  useEffect(() => {
    if (open && workspace) {
      setFormData({
        name: '',
        employee_number: '',
        password: workspace.default_password || '1234',
      })
    }
  }, [open, workspace])

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!workspace) return

    // 驗證
    if (!formData.name.trim()) {
      await alert(WORKSPACES_LABELS.請輸入姓名, 'error')
      return
    }
    if (!formData.employee_number.trim()) {
      await alert(WORKSPACES_LABELS.請輸入員工編號, 'error')
      return
    }
    if (!formData.password.trim()) {
      await alert(WORKSPACES_LABELS.請輸入密碼, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const passwordHash = await bcrypt.hash(formData.password, 10)

      const { error } = await supabase.from('employees').insert({
        workspace_id: workspace.id,
        display_name: formData.name.trim(),
        employee_number: formData.employee_number.trim().toUpperCase(),
        password_hash: passwordHash,
        role: 'admin',
        status: 'active',
      })

      if (error) {
        if (error.code === '23505') {
          await alert(WORKSPACES_LABELS.此員工編號已存在, 'error')
          return
        }
        throw error
      }

      await alert(`管理員「${formData.name}」已新增`, 'success')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      logger.error(WORKSPACES_LABELS.新增管理員失敗, error)
      await alert(WORKSPACES_LABELS.新增失敗_請稍後再試, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [workspace, formData, onOpenChange, onSuccess])

  if (!workspace) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className={DIALOG_SIZES.sm}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} className="text-morandi-gold" />
            {WORKSPACES_LABELS.新增管理員}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-morandi-container/30 rounded-lg">
            <p className="text-sm text-morandi-secondary">{WORKSPACES_LABELS.LABEL_4033}</p>
            <p className="font-medium text-morandi-primary">{workspace.name}</p>
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_658}</Label>
            <Input
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder={WORKSPACES_LABELS.例_王大明}
            />
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_2161}</Label>
            <Input
              value={formData.employee_number}
              onChange={e => handleFieldChange('employee_number', e.target.value)}
              placeholder={WORKSPACES_LABELS.例_E002}
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_8142}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={e => handleFieldChange('password', e.target.value)}
              placeholder={WORKSPACES_LABELS.請設定密碼}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {WORKSPACES_LABELS.CANCEL}
          </Button>
          {}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            新增管理員
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
