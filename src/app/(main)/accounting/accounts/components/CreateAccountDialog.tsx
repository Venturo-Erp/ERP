'use client'

import { X } from 'lucide-react'

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
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ParentAccount {
  id: string
  code: string
  name: string
  account_type: string
}

interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  parentAccount?: { id: string; code: string; name: string; account_type: string } | null
  suggestedCode?: string
}

const accountTypes = [
  { value: 'asset', label: '資產' },
  { value: 'liability', label: '負債' },
  { value: 'equity', label: '權益' },
  { value: 'revenue', label: '收入' },
  { value: 'expense', label: '費用' },
  { value: 'cost', label: '成本' },
]

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  parentAccount,
  suggestedCode,
}: CreateAccountDialogProps) {
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([])
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    description: '',
    is_active: true,
    parent_id: '',
  })

  // 當有父科目時，自動填入
  useEffect(() => {
    if (open && parentAccount) {
      setFormData(prev => ({
        ...prev,
        code: suggestedCode || '',
        account_type: parentAccount.account_type,
        parent_id: parentAccount.id,
      }))
    } else if (open && !parentAccount) {
      setFormData({
        code: '',
        name: '',
        account_type: 'asset',
        description: '',
        is_active: true,
        parent_id: '',
      })
    }
  }, [open, parentAccount, suggestedCode])

  // 載入可作為父科目的科目（只有大類和中類）
  useEffect(() => {
    if (open && user?.workspace_id) {
      loadParentAccounts()
    }
  }, [open, user?.workspace_id])

  const loadParentAccounts = async () => {
    if (!user?.workspace_id) return

    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('workspace_id', user.workspace_id)
      .order('code')

    // 過濾出可作為父科目的（大類、中類、明細）
    const filtered = (data || []).filter(d => d.code.length <= 4)
    setParentAccounts(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.workspace_id) {
      toast.error('無法取得 workspace_id')
      return
    }

    if (!formData.code || !formData.name) {
      toast.error('請填寫科目代號和名稱')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('chart_of_accounts').insert({
        workspace_id: user.workspace_id,
        code: formData.code,
        name: formData.name,
        account_type: formData.account_type,
        description: formData.description || null,
        is_active: formData.is_active,
        is_system_locked: false,
        parent_id: formData.parent_id || null,
      })

      if (error) throw error

      toast.success('科目新增成功')
      onOpenChange(false)
      onSuccess()

      // 重置表單
      setFormData({
        code: '',
        name: '',
        account_type: 'asset',
        description: '',
        is_active: true,
        parent_id: '',
      })
    } catch (error) {
      logger.error('新增科目失敗:', error)
      const err = error as { code?: string; message?: string }
      if (err.code === '23505') {
        toast.error('科目代號已存在')
      } else {
        toast.error('新增失敗：' + (err.message || '未知錯誤'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {parentAccount
              ? `新增子科目（${parentAccount.code} ${parentAccount.name}）`
              : '新增會計科目'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">科目代號 *</Label>
            <Input
              id="code"
              placeholder="例如：1100"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
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
            <Label htmlFor="parent_id">父科目（選填）</Label>
            <Select
              value={formData.parent_id || 'none'}
              onValueChange={value =>
                setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
              }
            >
              <SelectTrigger id="parent_id">
                <SelectValue placeholder="選擇父科目（可不選）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不選擇（頂層科目）</SelectItem>
                {parentAccounts
                  .filter(p => p.account_type === formData.account_type)
                  .map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.code} {parent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">選擇父科目後，新科目會顯示在該科目下方</p>
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

          <div className="flex justify-end gap-3 pt-4">
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
              {isSubmitting ? '新增中...' : '確認新增'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
