'use client'

import { useState, useMemo, useCallback } from 'react'
import { Bus, Printer, Loader2 } from 'lucide-react'
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
  // 每天的項目說明（可手動輸入，如「43人座遊覽車」）
  const [dayDescriptions, setDayDescriptions] = useState<Record<number, string>>({})
  // 每天的備註
  const [dayNotes, setDayNotes] = useState<Record<number, string>>({})

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
        title: dayDescriptions[d.dayNumber]
          ? `Day ${d.dayNumber} ${d.route}（${dayDescriptions[d.dayNumber]}）`
          : `Day ${d.dayNumber} ${d.route}`,
        service_date: d.date || null,
        quantity: totalPax || null,
        day_number: d.dayNumber,
        note: dayNotes[d.dayNumber] || null,
      }))

      const { error } = await sb.from('tour_requests').insert({
        workspace_id: user.workspace_id,
        tour_id: tourId,
        request_type: 'transport',
        supplier_name: supplierName,
        items: requestItems,
        status: 'draft',
        note: note.trim() || null,
        created_by: user.id,
      } as never)

      if (error) throw error

      toast({ title: `交通委託已儲存：${supplierName}（${selectedDaysList.length} 天）` })
      onSave?.()
      return true
    } catch (err) {
      logger.error('儲存交通委託失敗:', err)
      toast({ title: '儲存交通委託失敗', variant: 'destructive' })
      return false
    } finally {
      setSaving(false)
    }
  }, [selectedDaysList, tourId, user, supplierName, totalPax, note, toast, onSave])

  const handlePrintAndSave = useCallback(async () => {
    if (selectedDaysList.length === 0) return
    const saved = await handleSaveRequest()
    if (saved === false) return
    handlePrint()
  }, [selectedDaysList, handleSaveRequest])

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
      <div class="info-row"><span class="info-label">公司：</span><span>角落旅行社</span></div>
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
    </div>
  </div>
  <table>
    <thead><tr><th>天數</th><th>日期</th><th>行程內容</th><th>備註</th></tr></thead>
    <tbody>
      ${selectedDaysList.map(d => `
      <tr>
        <td style="text-align:center">Day ${d.dayNumber}</td>
        <td style="text-align:center">${d.date}</td>
        <td>${d.route}${dayDescriptions[d.dayNumber] ? `<br/><small style="color:#666">${dayDescriptions[d.dayNumber]}</small>` : ''}</td>
        <td>${dayNotes[d.dayNumber] || ''}</td>
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
              <div key={day.dayNumber} className="rounded-md border border-border/50 px-3 py-2 space-y-1.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedDays.has(day.dayNumber)}
                    onCheckedChange={() => toggleDay(day.dayNumber)}
                  />
                  <span className="text-sm font-medium w-14">Day {day.dayNumber}</span>
                  <span className="text-xs text-muted-foreground w-16">{day.date}</span>
                  <span className="text-sm flex-1 truncate">{day.route}</span>
                </label>
                {selectedDays.has(day.dayNumber) && (
                  <div className="pl-9 grid grid-cols-2 gap-2">
                    <Input
                      value={dayDescriptions[day.dayNumber] || ''}
                      onChange={e => setDayDescriptions(prev => ({ ...prev, [day.dayNumber]: e.target.value }))}
                      placeholder="例：43人座遊覽車"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={dayNotes[day.dayNumber] || ''}
                      onChange={e => setDayNotes(prev => ({ ...prev, [day.dayNumber]: e.target.value }))}
                      placeholder="備註"
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">備註</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="特殊需求（如車型、座椅排數...）"
              className="h-8 text-sm"
            />
          </div>

          {selectedDays.size > 0 && (
            <div className="bg-morandi-gold/5 border border-morandi-gold/20 rounded-md p-2 text-xs">
              <span className="font-medium text-morandi-primary">摘要：</span>
              {selectedDaysList.length} 天用車（Day {selectedDaysList.map(d => d.dayNumber).join('、')}）
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handlePrintAndSave}
            disabled={selectedDays.size === 0 || saving}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Printer size={14} className="mr-1" />}
            儲存並列印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
