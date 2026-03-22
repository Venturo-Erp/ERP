'use client'
/**
 * EditWorkspaceDialog - 編輯公司設定對話框
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
import { Settings, Save, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import type { WorkspaceWithDetails } from '../types'
import { WORKSPACES_LABELS } from '../constants/labels'

interface EditWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceWithDetails | null
  onSuccess: () => void
}

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  onSuccess,
}: EditWorkspaceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    employee_number_prefix: '',
    default_password: '',
  })

  // 載入現有資料
  useEffect(() => {
    if (open && workspace) {
      setFormData({
        name: workspace.name || '',
        employee_number_prefix: workspace.employee_number_prefix || 'E',
        default_password: workspace.default_password || '1234',
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
      await alert(WORKSPACES_LABELS.請輸入公司名稱, 'error')
      return
    }
    if (!formData.employee_number_prefix.trim()) {
      await alert(WORKSPACES_LABELS.請輸入員工編號前綴, 'error')
      return
    }
    if (!formData.default_password.trim()) {
      await alert(WORKSPACES_LABELS.請輸入預設密碼, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: formData.name.trim(),
          employee_number_prefix: formData.employee_number_prefix.trim().toUpperCase(),
          default_password: formData.default_password.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace.id)

      if (error) throw error

      await alert(WORKSPACES_LABELS.設定已更新, 'success')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      logger.error(WORKSPACES_LABELS.更新公司設定失敗, error)
      await alert(WORKSPACES_LABELS.更新失敗_請稍後再試, 'error')
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
            <Settings size={20} className="text-morandi-gold" />
            {WORKSPACES_LABELS.SETTINGS_5149}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-morandi-container/30 rounded-lg">
            <p className="text-sm text-morandi-secondary">{WORKSPACES_LABELS.LABEL_5309}</p>
            <p className="font-medium text-morandi-primary">{workspace.code}</p>
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_20}</Label>
            <Input
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder={WORKSPACES_LABELS.例_角落旅遊}
            />
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_5013}</Label>
            <Input
              value={formData.employee_number_prefix}
              onChange={e => handleFieldChange('employee_number_prefix', e.target.value)}
              placeholder={WORKSPACES_LABELS.例_E_TP_JY}
              className="uppercase"
              maxLength={5}
            />
            <p className="text-xs text-morandi-secondary">
              新增員工時的編號格式：{formData.employee_number_prefix || 'E'}001,{' '}
              {formData.employee_number_prefix || 'E'}002...
            </p>
          </div>

          <div className="space-y-2">
            <Label required>{WORKSPACES_LABELS.LABEL_9036}</Label>
            <Input
              value={formData.default_password}
              onChange={e => handleFieldChange('default_password', e.target.value)}
              placeholder={WORKSPACES_LABELS.新員工的預設密碼}
            />
            <p className="text-xs text-morandi-secondary">{WORKSPACES_LABELS.ADD_6539}</p>
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
            儲存設定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
