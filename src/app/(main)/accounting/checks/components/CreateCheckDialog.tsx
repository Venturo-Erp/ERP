'use client'

import { X } from 'lucide-react'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@supabase/ssr'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

interface CreateCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCheckDialog({ open, onOpenChange, onSuccess }: CreateCheckDialogProps) {
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    check_number: '',
    check_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    payee_name: '',
    memo: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.workspace_id) {
      toast.error('無法取得 workspace_id')
      return
    }

    if (
      !formData.check_number ||
      !formData.check_date ||
      !formData.due_date ||
      !formData.amount ||
      !formData.payee_name
    ) {
      toast.error('請填寫所有必填欄位')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('請輸入有效金額')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.from('checks').insert({
        workspace_id: user.workspace_id,
        check_number: formData.check_number,
        check_date: formData.check_date,
        due_date: formData.due_date,
        amount,
        payee_name: formData.payee_name,
        payee_type: 'other',
        status: 'pending',
        memo: formData.memo || null,
        created_by: user.id,
      })

      if (error) throw error

      toast.success('票據新增成功')
      onOpenChange(false)
      onSuccess()

      // 重置表單
      setFormData({
        check_number: '',
        check_date: new Date().toISOString().split('T')[0],
        due_date: '',
        amount: '',
        payee_name: '',
        memo: '',
      })
    } catch (error: any) {
      console.error('新增票據失敗:', error)
      if (error.code === '23505') {
        toast.error('票據號碼已存在')
      } else {
        toast.error('新增失敗：' + error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增票據/支票</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_number">票據號碼 *</Label>
              <Input
                id="check_number"
                placeholder="例如：CH20260319001"
                value={formData.check_number}
                onChange={e => setFormData({ ...formData, check_number: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">金額 *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_date">開票日期 *</Label>
              <Input
                id="check_date"
                type="date"
                value={formData.check_date}
                onChange={e => setFormData({ ...formData, check_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">到期日 *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee_name">受款人 *</Label>
            <Input
              id="payee_name"
              placeholder="例如：供應商名稱"
              value={formData.payee_name}
              onChange={e => setFormData({ ...formData, payee_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">備註</Label>
            <Textarea
              id="memo"
              placeholder="票據備註（選填）"
              value={formData.memo}
              onChange={e => setFormData({ ...formData, memo: e.target.value })}
              rows={3}
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
