'use client'

import { Trash2, X } from 'lucide-react'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  description: string | null
  is_active: boolean
  is_system_locked: boolean
}

interface EditAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  account: Account | null
}

const accountTypes = [
  { value: 'asset', label: '資產' },
  { value: 'liability', label: '負債' },
  { value: 'equity', label: '權益' },
  { value: 'revenue', label: '收入' },
  { value: 'expense', label: '費用' },
  { value: 'cost', label: '成本' },
]

export function EditAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  account,
}: EditAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        description: account.description || '',
        is_active: account.is_active,
      })
    }
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account) return

    if (!formData.code || !formData.name) {
      toast.error('請填寫科目代號和名稱')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({
          code: formData.code,
          name: formData.name,
          account_type: formData.account_type,
          description: formData.description || null,
          is_active: formData.is_active,
        })
        .eq('id', account.id)

      if (error) throw error

      toast.success('科目更新成功')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      logger.error('更新科目失敗:', error)
      if (error.code === '23505') {
        toast.error('科目代號已存在')
      } else {
        toast.error('更新失敗：' + error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!account) return

    if (account.is_system_locked) {
      toast.error('系統科目無法刪除')
      return
    }

    const confirmed = confirm(
      `確定要刪除科目「${account.code} ${account.name}」嗎？\n\n` + `此操作無法復原！`
    )

    if (!confirmed) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', account.id)

      if (error) throw error

      toast.success('科目已刪除')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      logger.error('刪除科目失敗:', error)
      if (error.code === '23503') {
        toast.error('此科目已被使用，無法刪除')
      } else {
        toast.error('刪除失敗：' + error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>編輯會計科目</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {account.is_system_locked && (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
              ⚠️ 系統科目：僅可修改名稱和說明，不可刪除
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">科目代號 *</Label>
            <Input
              id="code"
              placeholder="例如：1100"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              disabled={account.is_system_locked}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">科目名稱 *</Label>
            <Input
              id="name"
              placeholder="例如：銀行存款"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">科目類型 *</Label>
            <Select
              value={formData.account_type}
              onValueChange={value => setFormData({ ...formData, account_type: value })}
              disabled={account.is_system_locked}
            >
              <SelectTrigger id="account_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">說明</Label>
            <Textarea
              id="description"
              placeholder="科目說明（選填）"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">啟用狀態</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || account.is_system_locked}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              刪除
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '更新中...' : '確認更新'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
