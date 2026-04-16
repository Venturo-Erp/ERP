'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface DeleteTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: { id: string; name: string; code: string } | null
  onComplete: () => void
}

export function DeleteTenantDialog({
  open,
  onOpenChange,
  workspace,
  onComplete,
}: DeleteTenantDialogProps) {
  const [confirmCode, setConfirmCode] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!workspace || confirmCode !== workspace.code) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tenants/${workspace.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok || !result.success) {
        toast.error(result.message || result.error || '刪除失敗')
        return
      }
      toast.success(`租戶「${workspace.name}」已完整刪除`)
      onComplete()
    } catch (error) {
      logger.error('Delete tenant error:', error)
      toast.error('刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setConfirmCode('')
    onOpenChange(isOpen)
  }

  const isConfirmed = confirmCode === workspace?.code

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            刪除租戶
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-red-800">此操作無法復原！</p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>所有員工帳號將被永久刪除</li>
              <li>所有業務資料（旅遊團、訂單、客戶）將被刪除</li>
              <li>所有上傳的檔案將被刪除</li>
              <li>Supabase Auth 帳號將被撤銷</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-morandi-primary mb-2">
              請輸入公司代碼{' '}
              <span className="font-mono font-bold text-red-600">{workspace?.code}</span>{' '}
              確認刪除：
            </p>
            <Input
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value.toUpperCase())}
              placeholder={workspace?.code}
              className="font-mono border-red-200 focus:border-red-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!isConfirmed || deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                '確認刪除'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
