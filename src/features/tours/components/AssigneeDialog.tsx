'use client'

/**
 * AssigneeDialog - 指派同事對話框
 * 
 * 用於將行程項目指派給特定員工負責
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { Loader2, User } from 'lucide-react'

interface AssigneeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemTitle: string
  tourId: string
  currentAssigneeId?: string | null
  onSuccess?: () => void
}

interface Employee {
  id: string
  chinese_name: string | null
  display_name: string | null
}

export function AssigneeDialog({
  open,
  onOpenChange,
  itemId,
  itemTitle,
  tourId,
  currentAssigneeId,
  onSuccess
}: AssigneeDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentAssigneeId || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 載入員工列表
  useEffect(() => {
    if (!open || !user?.workspace_id) return

    const fetchEmployees = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('id, chinese_name, display_name')
        .eq('workspace_id', user.workspace_id as string)
        .eq('status', 'active')
        .neq('employee_type', 'bot')
        .order('chinese_name')

      if (!error && data) {
        setEmployees(data)
      }
      setLoading(false)
    }

    fetchEmployees()
    setSelectedEmployeeId(currentAssigneeId || '')
  }, [open, user?.workspace_id, currentAssigneeId])

  // 儲存指派
  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)

    try {
      const now = new Date().toISOString()
      const assigneeId = selectedEmployeeId || null

      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({
          assignee_id: assigneeId,
          assigned_at: assigneeId ? now : null,
          assigned_by: assigneeId ? user.id : null,
          updated_at: now,
          updated_by: user.id
        })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      // 發送頻道通知
      if (assigneeId && user.workspace_id) {
        const assignee = employees.find(e => e.id === assigneeId)
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'task_assigned',
            tourId,
            workspaceId: user.workspace_id,
            taskName: itemTitle,
            assigneeName: assignee?.chinese_name || assignee?.display_name || '同事',
            assigneeId
          })
        }).catch(() => {})
      }

      toast({
        title: assigneeId ? '已指派' : '已取消指派',
        description: assigneeId 
          ? `${itemTitle} 已指派給 ${employees.find(e => e.id === assigneeId)?.chinese_name || '同事'}`
          : `${itemTitle} 已取消指派`
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('指派失敗:', err)
      toast({
        title: '指派失敗',
        description: '請重試',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            指派負責人
          </DialogTitle>
          <DialogDescription>
            將「{itemTitle}」指派給同事負責
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="assignee" className="text-sm font-medium">
            負責人
          </Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={loading}
          >
            <SelectTrigger id="assignee" className="mt-2">
              <SelectValue placeholder={loading ? '載入中...' : '選擇負責人'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                <span className="text-muted-foreground">（不指派）</span>
              </SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.chinese_name || emp.display_name || '未命名'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
