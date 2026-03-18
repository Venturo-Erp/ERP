'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, Printer, Sun, Mail, Phone, Globe, Plus, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

interface TransportQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string; return_date?: string } | null
  transportDays?: { dayNumber: number; date: string; route: string }[]
  totalPax: number | null
  coreItems?: TourItineraryItem[]
  startDate?: string | null
  supplierName: string
  vehicleDesc?: string
}

// 每天的行程結構
interface DaySchedule {
  dayNumber: number
  date: string
  weekday: string
  route: string
  breakfast: string
  lunch: string
  dinner: string
  hotel: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

// 發送方式
type DeliveryMethod = 'print' | 'line' | 'email' | 'fax' | 'tenant'

const DELIVERY_METHODS: { key: DeliveryMethod; label: string; icon: typeof Printer }[] = [
  { key: 'print', label: '列印', icon: Printer },
  { key: 'line', label: 'Line', icon: Send },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'fax', label: '傳真', icon: Phone },
  { key: 'tenant', label: '租戶', icon: Globe },
]

export function TransportQuoteDialog({
  open,
  onClose,
  tour,
  transportDays = [],
  totalPax,
  coreItems = [],
  startDate,
  supplierName,
  vehicleDesc = '',
}: TransportQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [paxInput, setPaxInput] = useState<string>(totalPax?.toString() || '')
  const [paxTiers, setPaxTiers] = useState<number[]>([20, 30, 40]) // 人數梯次
  const [newTierInput, setNewTierInput] = useState('')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null)
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

  // 重置 method
  useEffect(() => {
    if (open) setSelectedMethod(null)
  }, [open])

  // 把核心表資料組成每天行程
  const daySchedules: DaySchedule[] = useMemo(() => {
    if (!coreItems.length) {
      return transportDays.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        weekday: '',
        route: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        hotel: '',
      }))
    }

    const dayMap = new Map<number, DaySchedule>()

    for (const item of coreItems) {
      const dn = item.day_number
      if (!dn) continue
      if (!dayMap.has(dn)) {
        let dateStr = ''
        let weekday = ''
        if (startDate) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + dn - 1)
          dateStr = `${d.getMonth() + 1}/${d.getDate()}`
          weekday = WEEKDAYS[d.getDay()]
        }
        dayMap.set(dn, {
          dayNumber: dn,
          date: dateStr,
          weekday,
          route: '',
          breakfast: '',
          lunch: '',
          dinner: '',
          hotel: '',
        })
      }
    }

    const sorted = [...coreItems].sort((a, b) => {
      const da = a.day_number || 0
      const db = b.day_number || 0
      if (da !== db) return da - db
      return (a.sort_order || 0) - (b.sort_order || 0)
    })

    for (const item of sorted) {
      const dn = item.day_number
      if (!dn || !dayMap.has(dn)) continue
      const day = dayMap.get(dn)!

      if (item.category === 'accommodation') {
        day.hotel = item.resource_name || item.title || ''
      } else if (item.category === 'meals') {
        const name = item.title || ''
        if (item.sub_category === 'breakfast') day.breakfast = name
        else if (item.sub_category === 'lunch') day.lunch = name
        else if (item.sub_category === 'dinner') day.dinner = name
      } else if (item.category === 'activities' || item.category === 'transport' || item.category === 'group-transport') {
        if (item.title) {
          day.route = day.route ? `${day.route} → ${item.title}` : item.title
        }
      }
    }

    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, startDate, transportDays])

  // 列印
  const handlePrint = () => {
    // 產生公開頁面 URL
    const publicUrl = `${window.location.origin}/public/transport-quote/${tour?.id}?supplierName=${encodeURIComponent(supplierName)}&note=${encodeURIComponent(note)}&vehicleDesc=${encodeURIComponent(vehicleDesc)}`
    
    // 開啟公開頁面讓供應商填寫
    window.open(publicUrl, '_blank')
  }

  // 梯次管理
  const handleAddTier = () => {
    const num = parseInt(newTierInput)
    if (!num || num <= 0) {
      toast({ title: '請輸入有效的人數', variant: 'destructive' })
      return
    }
    if (paxTiers.includes(num)) {
      toast({ title: '此梯次已存在', variant: 'destructive' })
      return
    }
    setPaxTiers([...paxTiers, num].sort((a, b) => a - b))
    setNewTierInput('')
  }

  const handleRemoveTier = (num: number) => {
    setPaxTiers(paxTiers.filter(t => t !== num))
  }

  // LINE 發送
  const handleSendLine = async () => {
    if (!selectedGroupId || !tour) return
    setSending(true)
    try {
      const pax = paxInput ? parseInt(paxInput) : totalPax
      const res = await fetch('/api/line/send-local-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          tourCode: tour.code || '',
          tourName: tour.name || '',
          departureDate: tour.departure_date || '',
          totalPax: pax,
          tourId: tour.id,
          note,
          paxTiers, // 加上梯次資料
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

  // 發送方式處理
  const handleDelivery = (method: DeliveryMethod) => {
    if (method === 'print') {
      handlePrint()
      return
    }
    if (method === 'line') {
      setSelectedMethod('line')
      return
    }
    // email / fax / tenant 未來擴充
    toast({ title: `${method} 功能開發中`, description: '目前支援列印和 LINE' })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg">給車行報價 — 遊覽車</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {/* 團資訊條 */}
          <div className="flex items-center gap-6 px-4 py-3 bg-[#faf8f5] rounded-lg border border-[#e8e0d4]">
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">團號</span>
              <span className="font-semibold">{tour?.code || '-'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">團名</span>
              <span className="font-semibold">{tour?.name || '-'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">出發日</span>
              <span className="font-semibold">{tour?.departure_date || '-'}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">人數</span>
              <Input
                type="number"
                value={paxInput}
                onChange={e => setPaxInput(e.target.value)}
                placeholder={totalPax?.toString() || ''}
                className="h-7 w-20 text-sm"
              />
            </div>
          </div>

          {/* 行程表格（跟公開頁面一樣） */}
          {daySchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun size={40} className="mx-auto mb-3 opacity-30" />
              <p>尚無行程資料，請先到「行程」頁籤填寫</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm mb-3">
              <thead>
                <tr className="bg-[#c9a96e] text-white">
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-20">日期</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left">行程內容</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">早餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">午餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">晚餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-32">住宿</th>
                </tr>
              </thead>
              <tbody>
                {daySchedules.map((day, idx) => (
                  <tr key={day.dayNumber} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf5]'}>
                    <td className="border border-[#e8e5e0] px-3 py-2">
                      <div className="font-semibold text-[#c9a96e]">Day {day.dayNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.date}{day.weekday ? ` (${day.weekday})` : ''}
                      </div>
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 font-medium">
                      {day.route || '—'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.breakfast || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.lunch || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.dinner || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-xs">
                      {day.hotel || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 報價資訊提示（車行填寫） */}
          <div className="pt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium mb-2">📋 供應商將填寫以下資訊：</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 車資（總金額）</li>
              <li>• 是否含停車費、過路費</li>
              <li>• 是否含司機住宿（如不含，填寫住宿費金額）</li>
              <li>• 是否含小費（如不含，填寫小費金額）</li>
            </ul>
          </div>

          {/* 備註 */}
          <div className="pt-2">
            <label className="text-sm font-medium mb-1.5 block">備註</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="給 Local 的特殊需求、偏好、注意事項..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* 選擇發送方式 */}
          <div className="border-t border-[#c9a96e] pt-4 mt-2">
            <label className="text-sm font-medium mb-3 block">選擇發送方式</label>
            <div className="flex items-center gap-3">
              {DELIVERY_METHODS.map(m => {
                const Icon = m.icon
                return (
                  <button
                    key={m.key}
                    onClick={() => handleDelivery(m.key)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all
                      ${selectedMethod === m.key 
                        ? 'border-[#c9a96e] bg-[#faf8f5] text-[#8B6914]' 
                        : 'border-border hover:border-[#c9a96e] hover:bg-[#faf8f5] text-foreground'
                      }`}
                  >
                    <Icon size={15} />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* LINE 群組選擇（選了 Line 才出現） */}
            {selectedMethod === 'line' && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="選擇 LINE 群組" />
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                  發送
                </Button>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-3 pt-2 pb-1">
            <Button variant="outline" onClick={onClose}>取消</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
