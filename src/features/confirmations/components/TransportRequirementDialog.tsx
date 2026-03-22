'use client'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Bus, Printer, Loader2, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'

interface DayInfo {
  dayNumber: number
  date: string
  route: string
}

interface TransportRequirementDialogProps {
  open: boolean
  onClose: () => void
  supplierName: string
  tour: Tour | null
  tourId: string
  days: DayInfo[]
  totalPax: number | null
  ageBreakdown?: string
  onSave?: () => void
}

export function TransportRequirementDialog({
  open,
  onClose,
  supplierName,
  tour,
  tourId,
  days,
  totalPax,
  ageBreakdown,
  onSave,
}: TransportRequirementDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(days.map(d => d.dayNumber))
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  // 統一車型說明（套用到所有勾選的天）
  const [vehicleDesc, setVehicleDesc] = useState('')
  // LINE 群組
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string | null }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [sending, setSending] = useState(false)

  // 載入 LINE 群組
  useEffect(() => {
    if (!open) return
    const sb = createSupabaseBrowserClient()
    sb.from('line_groups')
      .select('group_id, group_name')
      .not('group_name', 'is', null)
      .order('group_name')
      .then(({ data }) => {
        if (data) setLineGroups(data)
      })
  }, [open])

  const toggleDay = (dayNum: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayNum)) next.delete(dayNum)
      else next.add(dayNum)
      return next
    })
  }

  const selectAll = () => setSelectedDays(new Set(days.map(d => d.dayNumber)))
  const selectNone = () => setSelectedDays(new Set())

  const selectedDaysList = useMemo(
    () => days.filter(d => selectedDays.has(d.dayNumber)).sort((a, b) => a.dayNumber - b.dayNumber),
    [days, selectedDays]
  )

  const handleSaveRequest = useCallback(async () => {
    if (selectedDaysList.length === 0 || !tourId || !user?.workspace_id) return false

    setSaving(true)
    try {
      const sb = createSupabaseBrowserClient()
      const requestItems = selectedDaysList.map(d => ({
        category: 'transport',
        title: `Day ${d.dayNumber} ${d.route}`,
        service_date: d.date || null,
        quantity: totalPax || null,
        day_number: d.dayNumber,
        vehicle_desc: vehicleDesc || null,
      }))

      const { data: newReq, error } = await sb.from('tour_requests').insert({
        workspace_id: user.workspace_id,
        tour_id: tourId,
        request_type: 'transport',
        supplier_name: supplierName,
        items: requestItems,
        status: 'draft',
        note: note.trim() || null,
        created_by: user.id,
      } as never).select('id').single()

      if (error) throw error

      toast({ title: `交通委託已儲存：${supplierName}（${selectedDaysList.length} 天）` })
      onSave?.()
      return (newReq as { id: string })?.id || true
    } catch (err) {
      logger.error('儲存交通委託失敗:', err)
      toast({ title: '儲存交通委託失敗', variant: 'destructive' })
      return false
    } finally {
      setSaving(false)
    }
  }, [selectedDaysList, tourId, user, supplierName, totalPax, note, toast, onSave])

  // LINE 發送
  const handleSendLine = useCallback(async (reqId?: string) => {
    if (!selectedGroupId || selectedDaysList.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/line/send-transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          tourCode: tour?.code || '',
          tourName: tour?.name || '',
          departureDate: tour?.departure_date || '',
          totalPax,
          supplierName,
          vehicleDesc,
          days: selectedDaysList.map(d => ({
            dayNumber: d.dayNumber,
            date: d.date,
            route: d.route,
          })),
          note: note.trim() || null,
          requestId: reqId || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        const groupName = lineGroups.find(g => g.group_id === selectedGroupId)?.group_name
        toast({ title: `✅ 已發送到 LINE「${groupName}」` })
      } else {
        toast({ title: '❌ LINE 發送失敗', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: '❌ 發送失敗', description: String(err), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }, [selectedGroupId, selectedDaysList, tour, totalPax, supplierName, vehicleDesc, note, lineGroups, toast])

  const handlePrintAndSave = useCallback(async () => {
    if (selectedDaysList.length === 0) return
    const result = await handleSaveRequest()
    if (result === false) return
    // 如果選了 LINE 群組，同時發送（帶 request ID 讓供應商可以線上報價）
    if (selectedGroupId) {
      const reqId = typeof result === 'string' ? result : undefined
      await handleSendLine(reqId)
    }
    handlePrint()
  }, [selectedDaysList, handleSaveRequest, selectedGroupId, handleSendLine])

  const handlePrint = () => {
    if (selectedDaysList.length === 0) return

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>交通需求單 - ${supplierName}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 22pt; margin-bottom: 10px; border-bottom: 3px double #333; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 80px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #333; padding: 10px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10pt; color: #666; }
</style></head><body>
  <h1>交通需求單</h1>
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row"><span class="info-label">公司：</span><span>${COMPANY_NAME}</span></div>
      <div class="info-row"><span class="info-label">團號：</span><span>${tour?.code || ''}</span></div>
      <div class="info-row"><span class="info-label">團名：</span><span>${tour?.name || ''}</span></div>
      <div class="info-row"><span class="info-label">出發日：</span><span>${tour?.departure_date || ''}</span></div>
      <div class="info-row"><span class="info-label">總人數：</span><span>${totalPax || '-'} 人</span></div>
      ${ageBreakdown ? `<div class="info-row"><span class="info-label">年齡分類：</span><span>${ageBreakdown}</span></div>` : ''}
    </div>
    <div class="info-section">
      <h3>車行資訊</h3>
      <div class="info-row"><span class="info-label">車行：</span><span>${supplierName}</span></div>
      <div class="info-row"><span class="info-label">用車天數：</span><span>${selectedDaysList.length} 天</span></div>
      ${vehicleDesc ? `<div class="info-row"><span class="info-label">車型：</span><span>${vehicleDesc}</span></div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>天數</th><th>日期</th><th>行程內容</th><th>備註</th></tr></thead>
    <tbody>
      ${selectedDaysList.map(d => `
      <tr>
        <td style="text-align:center">Day ${d.dayNumber}</td>
        <td style="text-align:center">${d.date}</td>
        <td>${d.route}</td>
        <td></td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${note ? `<p style="margin-top:15px"><strong>備註：</strong>${note}</p>` : ''}
  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 Venturo ERP 產生</p>
  </div>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus size={18} className="text-morandi-gold" />
            交通需求單 — {supplierName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>🚌 {supplierName}</span>
            <span>👥 {totalPax || '-'} 人</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">選擇用車天數</Label>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-blue-600 hover:underline">全選</button>
                <button onClick={selectNone} className="text-muted-foreground hover:underline">取消全選</button>
              </div>
            </div>
            {days.map(day => (
              <label
                key={day.dayNumber}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedDays.has(day.dayNumber)}
                  onCheckedChange={() => toggleDay(day.dayNumber)}
                />
                <span className="text-sm font-medium w-14">Day {day.dayNumber}</span>
                <span className="text-xs text-muted-foreground w-16">{day.date}</span>
                <span className="text-sm flex-1 truncate">{day.route}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">車型</Label>
            <Input
              value={vehicleDesc}
              onChange={e => setVehicleDesc(e.target.value)}
              placeholder="例：43人座遊覽車"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">備註</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="特殊需求（如座椅排數、放行李空間...）"
              className="h-8 text-sm"
            />
          </div>

          {/* LINE 發送群組選擇 */}
          {lineGroups.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">LINE 發送</Label>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full h-8 px-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-morandi-gold"
              >
                <option value="">不發送（僅儲存/列印）</option>
                {lineGroups.map(g => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_name || g.group_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDays.size > 0 && (
            <div className="bg-morandi-gold/5 border border-morandi-gold/20 rounded-md p-2 text-xs">
              <span className="font-medium text-morandi-primary">摘要：</span>
              {selectedDaysList.length} 天用車（Day {selectedDaysList.map(d => d.dayNumber).join('、')}）
              {vehicleDesc && ` — ${vehicleDesc}`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handlePrintAndSave}
            disabled={selectedDays.size === 0 || saving || sending}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {(saving || sending) ? <Loader2 size={14} className="animate-spin mr-1" /> : <Printer size={14} className="mr-1" />}
            {selectedGroupId ? '儲存、列印並發送 LINE' : '儲存並列印'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
