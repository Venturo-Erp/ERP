'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, Printer, MapPin, Utensils, Hotel, Bus, Ticket, Sun } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

interface LocalQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string; return_date?: string } | null
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
  items: {
    category: string
    subCategory?: string
    title: string
    supplierName?: string
    description?: string
    time?: string
  }[]
  hotel?: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const CATEGORY_ICON: Record<string, { icon: typeof MapPin; color: string }> = {
  activities: { icon: Ticket, color: 'text-purple-600' },
  meals: { icon: Utensils, color: 'text-orange-600' },
  accommodation: { icon: Hotel, color: 'text-blue-600' },
  transport: { icon: Bus, color: 'text-emerald-600' },
  'group-transport': { icon: Bus, color: 'text-emerald-600' },
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

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
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()
  const printRef = useRef<HTMLDivElement>(null)

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

  // 把核心表資料組成每天行程
  const daySchedules: DaySchedule[] = useMemo(() => {
    if (!coreItems.length) {
      // fallback 用 transportDays
      return transportDays.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        weekday: '',
        items: d.route ? d.route.split(' → ').map(r => ({ category: 'activities', title: r })) : [],
      }))
    }

    const dayMap = new Map<number, DaySchedule>()

    // 建立每天的基礎
    for (const item of coreItems) {
      const dn = item.day_number
      if (!dn) continue
      if (!dayMap.has(dn)) {
        let dateStr = ''
        let weekday = ''
        if (startDate) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + dn - 1)
          dateStr = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`
          weekday = WEEKDAYS[d.getDay()]
        }
        dayMap.set(dn, { dayNumber: dn, date: dateStr, weekday, items: [], hotel: undefined })
      }
    }

    // 填入項目
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
        day.hotel = item.resource_name || item.title || undefined
        continue
      }

      // 跳過不需要顯示的
      if (!item.title) continue

      const title = item.category === 'meals' && item.sub_category
        ? `${MEAL_LABELS[item.sub_category] || item.sub_category}：${item.title}`
        : item.title

      day.items.push({
        category: item.category || 'others',
        subCategory: item.sub_category || undefined,
        title,
        supplierName: item.resource_name || undefined,
        description: item.description || undefined,
      })
    }

    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, startDate, transportDays])

  // 列印
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const daysHtml = daySchedules.map(day => `
      <div class="day-card">
        <div class="day-header">
          <div class="day-number">DAY ${day.dayNumber}</div>
          <div class="day-date">${day.date}${day.weekday ? `（${day.weekday}）` : ''}</div>
        </div>
        <div class="day-body">
          ${day.items.map(item => {
            const isBreakfast = item.subCategory === 'breakfast' || item.title.includes('早餐')
            const isMeal = item.category === 'meals'
            const isTransport = item.category === 'transport' || item.category === 'group-transport'
            const icon = isTransport ? '🚌' : isMeal ? '🍽️' : '📍'
            return `<div class="item ${isBreakfast ? 'item-light' : ''}">
              <span class="item-icon">${icon}</span>
              <span class="item-text">${item.title}</span>
            </div>`
          }).join('')}
          ${day.hotel ? `<div class="hotel">
            <span class="item-icon">🏨</span>
            <span>住宿：${day.hotel}</span>
          </div>` : ''}
        </div>
        <div class="quote-row">
          <span>報價金額：</span>
          <span class="quote-blank">NT$ _______________</span>
          <span style="margin-left:auto">備註：_______________</span>
        </div>
      </div>
    `).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>建議行程表 - ${tour?.code || ''}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } .no-print { display: none; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #c9a96e; }
  .header h1 { font-size: 20pt; color: #333; margin-bottom: 4px; }
  .header .subtitle { font-size: 11pt; color: #888; }
  .info-bar { display: flex; gap: 24px; justify-content: center; margin-bottom: 20px; padding: 12px 20px; background: #faf8f5; border-radius: 8px; border: 1px solid #e8e0d4; }
  .info-bar .info-item { font-size: 10pt; }
  .info-bar .info-label { color: #999; margin-right: 4px; }
  .info-bar .info-value { font-weight: 600; color: #333; }
  .day-card { border: 1px solid #e0dcd6; border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
  .day-header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: linear-gradient(135deg, #c9a96e, #b8956a); color: white; }
  .day-number { font-weight: 700; font-size: 13pt; }
  .day-date { font-size: 10pt; opacity: 0.9; }
  .day-body { padding: 12px 16px; }
  .item { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 10.5pt; }
  .item-light { color: #999; font-size: 10pt; }
  .item-icon { font-size: 12pt; width: 24px; text-align: center; flex-shrink: 0; }
  .item-text { flex: 1; }
  .hotel { display: flex; align-items: center; gap: 8px; padding: 8px 0 4px; margin-top: 4px; border-top: 1px dashed #e0dcd6; font-size: 10.5pt; color: #5b7db1; font-weight: 500; }
  .quote-row { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #fefcf9; border-top: 1px solid #e8e0d4; font-size: 10pt; color: #666; }
  .quote-blank { border-bottom: 1px solid #ccc; min-width: 120px; display: inline-block; }
  .note-section { margin-top: 20px; padding: 16px; border: 1px solid #e0dcd6; border-radius: 8px; }
  .note-section h3 { font-size: 11pt; margin-bottom: 8px; color: #666; }
  .note-section .note-content { font-size: 10pt; white-space: pre-line; min-height: 60px; }
  .footer { margin-top: 24px; text-align: center; font-size: 9pt; color: #bbb; }
  .total-row { margin-top: 16px; padding: 14px 20px; background: #f5f0ea; border-radius: 8px; border: 1px solid #d4c9b8; display: flex; align-items: center; justify-content: space-between; font-size: 12pt; font-weight: 600; }
  .total-blank { border-bottom: 2px solid #999; min-width: 180px; display: inline-block; }
</style></head><body>
  <div class="header">
    <h1>建議行程表</h1>
    <div class="subtitle">角落旅行社 CORNER TRAVEL</div>
  </div>

  <div class="info-bar">
    <div class="info-item"><span class="info-label">團號</span><span class="info-value">${tour?.code || '-'}</span></div>
    <div class="info-item"><span class="info-label">團名</span><span class="info-value">${tour?.name || '-'}</span></div>
    <div class="info-item"><span class="info-label">出發日</span><span class="info-value">${tour?.departure_date || '-'}</span></div>
    <div class="info-item"><span class="info-label">人數</span><span class="info-value">${totalPax || '-'} 位</span></div>
  </div>

  ${daysHtml}

  <div class="total-row">
    <span>合計報價</span>
    <span>NT$ <span class="total-blank"></span></span>
  </div>

  ${note ? `<div class="note-section"><h3>備註</h3><div class="note-content">${note}</div></div>` : ''}

  <div class="footer">
    <p>此行程表由 Venturo ERP 產生 · ${new Date().toLocaleDateString('zh-TW')}</p>
  </div>
</body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">給 Local 報價 — 建議行程表</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Printer size={14} className="mr-1" />
              列印 / 另存 PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3" ref={printRef}>
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
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">人數</span>
              <span className="font-semibold">{totalPax || '-'} 位</span>
            </div>
          </div>

          {/* 每天行程卡片 */}
          {daySchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun size={40} className="mx-auto mb-3 opacity-30" />
              <p>尚無行程資料，請先到「行程」頁籤填寫</p>
            </div>
          ) : (
            daySchedules.map(day => (
              <div key={day.dayNumber} className="border border-[#e0dcd6] rounded-xl overflow-hidden">
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-[#c9a96e] to-[#b8956a] text-white">
                  <span className="font-bold text-base">DAY {day.dayNumber}</span>
                  <span className="text-sm opacity-90">{day.date}{day.weekday ? `（${day.weekday}）` : ''}</span>
                </div>
                {/* Day body */}
                <div className="px-4 py-3 space-y-1">
                  {day.items.length === 0 && !day.hotel ? (
                    <div className="text-sm text-muted-foreground py-2">待安排</div>
                  ) : (
                    <>
                      {day.items.map((item, idx) => {
                        const isBreakfast = item.subCategory === 'breakfast' || item.title.includes('早餐')
                        const catInfo = CATEGORY_ICON[item.category]
                        const IconComp = catInfo?.icon || MapPin
                        const iconColor = catInfo?.color || 'text-gray-500'
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2.5 py-1 ${isBreakfast ? 'text-muted-foreground text-xs' : 'text-sm'}`}
                          >
                            <IconComp size={isBreakfast ? 12 : 15} className={`flex-shrink-0 ${iconColor}`} />
                            <span>{item.title}</span>
                          </div>
                        )
                      })}
                      {day.hotel && (
                        <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-dashed border-[#e0dcd6] text-sm text-blue-600 font-medium">
                          <Hotel size={15} className="flex-shrink-0" />
                          <span>住宿：{day.hotel}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 備註 */}
          <div className="pt-1">
            <label className="text-sm font-medium mb-1.5 block">備註</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="給 Local 的特殊需求、偏好、注意事項..."
              rows={3}
            />
          </div>

          {/* LINE 發送區 */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <label className="text-sm font-medium mb-2 block">發送到 LINE 群組</label>
            <div className="flex items-center gap-3">
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
                onClick={handleSend}
                disabled={!selectedGroupId || sending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
              >
                {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                發送
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
