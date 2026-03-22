'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { UnifiedTraditionalView } from './UnifiedTraditionalView'

interface MealQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  meals: Array<{
    date: string
    time: string
    price?: string
    quantity: number
    note?: string
  }>
  supplierName: string
}

export function MealQuoteDialog({
  open,
  onClose,
  tour,
  totalPax,
  meals,
  supplierName,
}: MealQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [viewMode, setViewMode] = useState<'modern' | 'traditional'>('modern')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .not('group_name', 'is', null)
      if (data)
        setLineGroups(
          data.filter((g): g is { group_id: string; group_name: string } => !!g.group_name)
        )
    }
    load()
  }, [open, supabase])

  useEffect(() => {
    if (open) setSelectedMethod(null)
  }, [open])

  const handleSendLine = async () => {
    if (!selectedGroupId || !tour) return
    setSending(true)
    try {
      const res = await fetch('/api/line/send-meal-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          tourCode: tour.code || '',
          tourName: tour.name || '',
          departureDate: tour.departure_date || '',
          totalPax,
          tourId: tour.id,
          supplierName,
          meals,
          note,
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

  const handleDelivery = (method: string) => {
    if (method === 'print' || method === 'fax') {
      setViewMode('traditional')
    } else if (method === 'line') {
      setSelectedMethod('line')
    } else {
      toast({ title: `${method} 功能開發中`, description: '目前支援列印和 LINE' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>餐食需求單</DialogTitle>
        </DialogHeader>
        {/* 中間可滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {viewMode === 'traditional' ? (
            <UnifiedTraditionalView
              requestType="meal"
              tour={tour}
              totalPax={totalPax}
              supplierName={supplierName}
              items={meals}
              note={note}
              setNote={setNote}
            />
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">團號：</span>
                {tour?.code}
                <span className="ml-4 font-medium">團名：</span>
                {tour?.name}
                <span className="ml-4 font-medium">人數：</span>
                {totalPax} 人
              </div>
              <div>
                <h3 className="font-semibold mb-2">餐食需求</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-morandi-container">
                      <th className="border px-3 py-2 text-left">用餐日期</th>
                      <th className="border px-3 py-2 text-left">用餐時段</th>
                      <th className="border px-3 py-2 text-left">餐標</th>
                      <th className="border px-3 py-2 text-left">數量</th>
                      <th className="border px-3 py-2 text-left">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meals.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2">{item.date}</td>
                        <td className="border px-3 py-2">{item.time}</td>
                        <td className="border px-3 py-2">{item.price || '—'}</td>
                        <td className="border px-3 py-2">{item.quantity}</td>
                        <td className="border px-3 py-2">{item.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 固定底部：發送方式按鈕 */}
        <div className="flex-shrink-0 border-t pt-4 mt-2 space-y-3">
          {selectedMethod === 'line' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">選擇 LINE 群組：</span>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="請選擇群組" />
                </SelectTrigger>
                <SelectContent>
                  {lineGroups.map(g => (
                    <SelectItem key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendLine}
                disabled={!selectedGroupId || sending}
                className="bg-[#06c755] hover:bg-[#05b34c] text-white"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    發送中...
                  </>
                ) : (
                  '發送'
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedMethod(null)}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            </div>
          )}

          {!selectedMethod && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDelivery('print')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
                >
                  列印
                </button>
                <button
                  onClick={() => handleDelivery('line')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
                >
                  LINE
                </button>
                <button
                  onClick={() => handleDelivery('email')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
                >
                  Email
                </button>
                <button
                  onClick={() => handleDelivery('fax')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
                >
                  傳真
                </button>
                <button
                  onClick={() => handleDelivery('tenant')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
                >
                  租戶
                </button>
              </div>
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
