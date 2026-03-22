/**
 * AddItemDialog - 新增協作確認單項目
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  tourId: string
  onSuccess: () => void
}

export function AddItemDialog({
  open,
  onOpenChange,
  requestId,
  tourId,
  onSuccess,
}: AddItemDialogProps) {
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('others')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!itemName.trim()) {
      toast({
        title: '請輸入項目名稱',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // 取得 workspace_id
      const { data: request } = await supabase
        .from('tour_requests')
        .select('workspace_id')
        .eq('id', requestId)
        .single()

      if (!request) throw new Error('找不到需求單')

      // 新增項目
      const { error } = await supabase.from('tour_request_items').insert({
        workspace_id: request.workspace_id,
        request_id: requestId,
        tour_id: tourId,
        item_name: itemName.trim(),
        item_category: itemCategory,
        source: 'manual_corner', // 我們手動追加
        handled_by: 'local',
        local_status: 'pending',
        corner_notes: notes.trim() || null,
      })

      if (error) throw error

      toast({ title: '✅ 項目已新增' })

      // 重置表單
      setItemName('')
      setItemCategory('others')
      setNotes('')

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: '新增失敗',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增項目</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="itemName">項目名稱 *</Label>
            <Input
              id="itemName"
              placeholder="例如：額外導遊費、機場稅"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="itemCategory">分類</Label>
            <select
              id="itemCategory"
              value={itemCategory}
              onChange={e => setItemCategory(e.target.value)}
              className="mt-2 w-full border rounded px-3 py-2"
            >
              <option value="transport">交通</option>
              <option value="accommodation">住宿</option>
              <option value="meals">餐食</option>
              <option value="activities">活動</option>
              <option value="guide">導遊</option>
              <option value="others">其他</option>
            </select>
          </div>

          <div>
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              placeholder="說明或特殊需求"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
