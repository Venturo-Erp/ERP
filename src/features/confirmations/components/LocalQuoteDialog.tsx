'use client'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Loader2, Printer, Sun, Mail, Phone, Globe, Plus, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

interface LocalQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: {
    id: string
    code: string
    name: string
    departure_date?: string
    return_date?: string
  } | null
  transportDays: { dayNumber: number; date: string; route: string }[]
  totalPax: number | null
  coreItems?: TourItineraryItem[]
  startDate?: string | null
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

export function LocalQuoteDialog({
  open,
  onClose,
  tour,
  transportDays,
  totalPax,
  coreItems = [],
  startDate,
}: LocalQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [paxInput, setPaxInput] = useState<string>(totalPax?.toString() || '')
  const [paxTiers, setPaxTiers] = useState<number[]>([]) // 人數梯次（從報價單讀取，沒有就空白）
  const [newTierInput, setNewTierInput] = useState('')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 載入 LINE 群組 + 砍次資料
  useEffect(() => {
    if (!open) return
    const load = async () => {
      // 載入 LINE 群組
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .not('group_name', 'is', null)
      if (data)
        setLineGroups(
          data.filter((g): g is { group_id: string; group_name: string } => !!g.group_name)
        )

      // 載入砍次資料（從 quotes 表）
      if (tour?.id) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('tier_pricings')
          .eq('tour_id', tour.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (quotes?.tier_pricings && Array.isArray(quotes.tier_pricings)) {
          // 提取人數（pax），忽略 0 和 1（可能是預設值）
          const tiers = quotes.tier_pricings
            .map((t: any) => t.pax)
            .filter((p: any) => typeof p === 'number' && p > 1)
          if (tiers.length > 0) {
            setPaxTiers(tiers)
          }
        }
      }
    }
    load()
  }, [open, tour?.id])

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
      } else if (
        item.category === 'activities' ||
        item.category === 'transport' ||
        item.category === 'group-transport'
      ) {
        if (item.title) {
          day.route = day.route ? `${day.route} → ${item.title}` : item.title
        }
      }
    }

    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, startDate, transportDays])

  // 列印
  const handlePrint = () => {
    const pax = paxInput || totalPax || '-'
    const tableRows = daySchedules
      .map((day, idx) => {
        return `<tr style="background: ${idx % 2 === 0 ? '#fff' : '#fafaf5'}">
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px;">
          <div style="font-weight: 600; color: #c9a96e;">Day ${day.dayNumber}</div>
          <div style="font-size: 12px; color: #999;">${day.date}${day.weekday ? ` (${day.weekday})` : ''}</div>
        </td>
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px; font-weight: 500;">${day.route || '—'}</td>
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px; text-align: center; font-size: 12px;">${day.breakfast || '-'}</td>
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px; text-align: center; font-size: 12px;">${day.lunch || '-'}</td>
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px; text-align: center; font-size: 12px;">${day.dinner || '-'}</td>
        <td style="border: 1px solid #e8e5e0; padding: 8px 12px; font-size: 12px;">${day.hotel || '—'}</td>
      </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>建議行程表 - ${tour?.code || ''}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 14px; color: #333; max-width: 900px; margin: 0 auto; padding: 32px; }
  .header { border-bottom: 2px solid #c9a96e; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 14px; }
  .info-item { display: flex; gap: 8px; }
  .info-label { color: #999; }
  .info-value { font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .footer { padding-top: 16px; border-top: 1px solid #e8e5e0; text-align: center; font-size: 12px; color: #999; }
</style></head><body>
  <div class="header">
    <div style="display: flex; justify-content: space-between;">
      <h1>${tour?.name || '行程表'}</h1>
      <div style="font-weight: 600; color: #c9a96e;">${COMPANY_NAME}</div>
    </div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">目的地：</span><span class="info-value">—</span></div>
      <div class="info-item"><span class="info-label">出發日期：</span><span class="info-value">${tour?.departure_date || '-'}</span></div>
      <div class="info-item"><span class="info-label">行程天數：</span><span class="info-value">${daySchedules.length} 天</span></div>
    </div>
  </div>
  <table>
    <thead>
      <tr style="background: #c9a96e; color: #fff;">
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: left; width: 80px;">日期</th>
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: left;">行程內容</th>
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: center; width: 64px;">早餐</th>
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: center; width: 64px;">午餐</th>
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: center; width: 64px;">晚餐</th>
        <th style="border: 1px solid rgba(201, 169, 110, 0.5); padding: 8px 12px; text-align: left; width: 128px;">住宿</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  ${note ? `<div style="margin-bottom: 24px; font-size: 14px;"><b>備註：</b>${note}</div>` : ''}
  <div class="footer"><p>本行程表由 ${COMPANY_NAME} 提供</p></div>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
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
          <DialogTitle className="text-lg">給 Local 報價 — 建議行程表</DialogTitle>
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
                        {day.date}
                        {day.weekday ? ` (${day.weekday})` : ''}
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

          {/* 人數梯次設定 */}
          <div className="pt-2">
            <label className="text-sm font-medium mb-1.5 block">
              報價梯次（供應商會看到這些人數選項）
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {paxTiers.map(num => (
                <div
                  key={num}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#faf8f5] border border-[#c9a96e] rounded-full text-sm"
                >
                  <span className="font-semibold">{num} 人團</span>
                  <button
                    onClick={() => handleRemoveTier(num)}
                    className="text-muted-foreground hover:text-destructive transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="inline-flex items-center gap-1">
                <Input
                  type="number"
                  value={newTierInput}
                  onChange={e => setNewTierInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTier()}
                  placeholder="新增人數"
                  className="h-8 w-24 text-sm"
                />
                <Button size="sm" variant="outline" onClick={handleAddTier} className="h-8 px-2">
                  <Plus size={14} />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              供應商會看到這些梯次選項並填寫每人報價
            </p>
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
                      ${
                        selectedMethod === m.key
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
                  {sending ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <Send size={14} className="mr-1" />
                  )}
                  發送
                </Button>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-3 pt-2 pb-1">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
