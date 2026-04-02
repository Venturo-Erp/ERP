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

interface ActivityQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  activities: Array<{
    time: string
    venue: string
    quantity: number
    note?: string
  }>
  supplierName: string
  resourceId?: string | null
}

export function ActivityQuoteDialog({
  open,
  onClose,
  tour,
  totalPax,
  activities,
  supplierName,
  resourceId,
}: ActivityQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [viewMode, setViewMode] = useState<'modern' | 'traditional'>('traditional')
  const [editableItems, setEditableItems] = useState(activities)
  const [supplierInfo, setSupplierInfo] = useState<{
    contact?: string
    phone?: string
    fax?: string
  }>({})

  // 當 activities 變化時更新
  useEffect(() => {
    setEditableItems(activities)
  }, [activities])

  const handleItemChange = (idx: number, field: string, value: unknown) => {
    setEditableItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleInfoChange = (field: 'contact' | 'phone' | 'fax', value: string) => {
    setSupplierInfo(prev => ({ ...prev, [field]: value }))
  }

  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 原始資料（用於比對是否有變化）
  const [originalInfo, setOriginalInfo] = useState<typeof supplierInfo>({})

  // 從 attractions 表讀取活動資料
  useEffect(() => {
    if (!open) return
    const loadAttractionInfo = async () => {
      if (resourceId) {
        // 有 resourceId，從 attractions 表讀取
        const { data } = await supabase
          .from('attractions')
          .select('contact_name, phone, fax')
          .eq('id', resourceId)
          .maybeSingle() as { data: { contact_name?: string; phone?: string; fax?: string } | null; error: unknown }
        if (data) {
          const info = {
            contact: data.contact_name || undefined,
            phone: data.phone || undefined,
            fax: data.fax || undefined,
          }
          setSupplierInfo(info)
          setOriginalInfo(info)
          return
        }
      }
      // 沒有 resourceId 或找不到，清空
      setSupplierInfo({})
      setOriginalInfo({})
    }
    loadAttractionInfo()
  }, [open, resourceId, supabase])

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
      const res = await fetch('/api/line/send-activity-quote', {
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
          activities,
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

  // 檢查活動資料是否有變化
  const hasInfoChanged = () => {
    return (
      supplierInfo.contact !== originalInfo.contact ||
      supplierInfo.phone !== originalInfo.phone ||
      supplierInfo.fax !== originalInfo.fax
    )
  }

  // 更新活動資料到 attractions 表
  const updateAttractionInfo = async () => {
    if (!resourceId) return
    const { error } = await supabase
      .from('attractions')
      .update({
        contact_name: supplierInfo.contact || null,
        phone: supplierInfo.phone || null,
        fax: supplierInfo.fax || null,
      })
      .eq('id', resourceId)
    if (error) {
      toast({ title: '❌ 更新失敗', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: '✅ 活動資料已更新' })
      setOriginalInfo({ ...supplierInfo })
    }
  }

  const handleDelivery = async (method: string) => {
    // 檢查是否有變化，提示是否更新
    if (resourceId && hasInfoChanged()) {
      const confirmed = window.confirm('活動資料已修改，是否更新到資料庫？')
      if (confirmed) {
        await updateAttractionInfo()
      }
    }

    if (method === 'print' || method === 'fax') {
      // 直接列印 Dialog 內容
      window.print()
    } else if (method === 'line') {
      setSelectedMethod('line')
    } else {
      toast({ title: `${method} 功能開發中`, description: '目前支援列印和 LINE' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader>
          <DialogTitle>活動需求單</DialogTitle>
        </DialogHeader>
        {/* 中間可滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {viewMode === 'traditional' ? (
            <UnifiedTraditionalView
              requestType="activity"
              tour={tour}
              totalPax={totalPax}
              supplierName={supplierName}
              contact={supplierInfo.contact}
              phone={supplierInfo.phone}
              fax={supplierInfo.fax}
              items={editableItems}
              note={note}
              setNote={setNote}
              onItemChange={handleItemChange}
              onInfoChange={handleInfoChange}
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
                <h3 className="font-semibold mb-2">活動需求</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-morandi-container">
                      <th className="border px-3 py-2 text-left">活動時間</th>
                      <th className="border px-3 py-2 text-left">場地名稱</th>
                      <th className="border px-3 py-2 text-left">數量</th>
                      <th className="border px-3 py-2 text-left">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2">{item.time}</td>
                        <td className="border px-3 py-2">{item.venue}</td>
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
        <div className="flex-shrink-0 border-t border-border pt-4 mt-2 space-y-3">
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
