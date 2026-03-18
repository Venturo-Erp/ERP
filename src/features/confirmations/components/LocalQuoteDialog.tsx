'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface LocalQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  transportDays: { dayNumber: number; date: string; route: string }[]
  totalPax: number | null
}

export function LocalQuoteDialog({ open, onClose, tour, transportDays, totalPax }: LocalQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 載入 LINE 群組
  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .not('group_name', 'is', null)
      if (data) setLineGroups(data.filter((g): g is { group_id: string; group_name: string } => !!g.group_name))
    }
    load()
  }, [open])

  // 行程預覽文字
  const itineraryText = useMemo(() => {
    return transportDays.map(d => 
      `Day ${d.dayNumber}（${d.date}）${d.route || '待安排'}`
    ).join('\n')
  }, [transportDays])

  const handleSend = async () => {
    if (!selectedGroupId || !tour) return
    setSending(true)
    try {
      const res = await fetch('/api/line/send-requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          senderName: '角落旅行社',
          tourCode: tour.code || '',
          tourName: tour.name || '',
          departureDate: tour.departure_date || '',
          totalPax,
          supplierName: 'Local 地接',
          items: transportDays.map(d => ({
            category: 'activity',
            title: `Day ${d.dayNumber}（${d.date}）${d.route || ''}`,
          })),
          replyUrl: `https://app.cornertravel.com.tw/public/request/${tour.id}`,
        }),
      })
      const result = await res.json()
      if (result.success || res.ok) {
        const groupName = lineGroups.find(g => g.group_id === selectedGroupId)?.group_name
        toast({ title: `✅ 已發送到 LINE「${groupName}」` })
        onClose()
      } else {
        toast({ title: '❌ LINE 發送失敗', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: '❌ 發送失敗', description: String(err), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>給 Local 報價</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 團基本資訊 */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{tour?.code}</span>
            {' '}{tour?.name}
            {totalPax && ` · ${totalPax} 人`}
          </div>

          {/* 行程預覽 */}
          <div>
            <label className="text-sm font-medium mb-1 block">行程</label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-line max-h-48 overflow-y-auto">
              {itineraryText || '尚無行程資料'}
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="text-sm font-medium mb-1 block">備註</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="給 Local 的備註..."
              rows={3}
            />
          </div>

          {/* LINE 群組選擇 */}
          <div>
            <label className="text-sm font-medium mb-1 block">發送到 LINE 群組</label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇群組" />
              </SelectTrigger>
              <SelectContent>
                {lineGroups.map(g => (
                  <SelectItem key={g.group_id} value={g.group_id}>
                    {g.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button
              onClick={handleSend}
              disabled={!selectedGroupId || sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
              發送報價需求
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
