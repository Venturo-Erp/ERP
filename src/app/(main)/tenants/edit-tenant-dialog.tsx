'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useWorkspaceChannels } from '@/stores/workspace'
import { LABELS } from './constants/labels'

interface EditTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: {
    id: string
    name: string
    code?: string | null
    max_employees?: number | null
  } | null
  onComplete: () => void
}

export function EditTenantDialog({
  open,
  onOpenChange,
  workspace,
  onComplete,
}: EditTenantDialogProps) {
  const { updateWorkspace } = useWorkspaceChannels()
  const [name, setName] = useState('')
  const [maxEmployees, setMaxEmployees] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (workspace && open) {
      setName(workspace.name)
      setMaxEmployees(workspace.max_employees != null ? String(workspace.max_employees) : '')
    }
  }, [workspace, open])

  const handleSave = async () => {
    if (!workspace || !name.trim()) return

    setSaving(true)
    try {
      await updateWorkspace(workspace.id, {
        name: name.trim(),
        max_employees: maxEmployees ? parseInt(maxEmployees, 10) : null,
      } as Parameters<typeof updateWorkspace>[1])
      toast.success(LABELS.TOAST_EDIT_SUCCESS)
      onComplete()
    } catch (error) {
      logger.error('Failed to update workspace:', error)
      toast.error(LABELS.TOAST_EDIT_FAILED)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{LABELS.EDIT_TENANT}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.FIELD_NAME}{' '}
              <span className="text-morandi-red">{LABELS.FIELD_NAME_REQUIRED}</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={LABELS.FIELD_NAME_PLACEHOLDER}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">{LABELS.FIELD_CODE}</label>
            <Input value={workspace?.code || ''} disabled className="mt-1" />
            <p className="text-xs text-morandi-secondary mt-1">{LABELS.FIELD_CODE_HINT}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.FIELD_MAX_EMPLOYEES}
            </label>
            <Input
              type="number"
              min="1"
              value={maxEmployees}
              onChange={e => setMaxEmployees(e.target.value)}
              placeholder={LABELS.FIELD_MAX_EMPLOYEES_PLACEHOLDER}
              className="mt-1 max-w-[160px]"
            />
            <p className="text-xs text-morandi-secondary mt-1">{LABELS.FIELD_MAX_EMPLOYEES_HINT}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
              {LABELS.BTN_CANCEL}
            </Button>
            <Button variant="soft-gold"
              onClick={handleSave}
              disabled={saving || !name.trim()}
 
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {LABELS.BTN_SAVING}
                </>
              ) : (
                LABELS.BTN_SAVE
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
