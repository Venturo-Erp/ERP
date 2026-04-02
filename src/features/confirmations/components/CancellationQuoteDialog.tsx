/**
 * CancellationQuoteDialog - 取消單發送 Dialog
 *
 * 用途：行程刪除項目後，發送取消通知給廠商
 */

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
import { UnifiedTraditionalView } from './UnifiedTraditionalView'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Send, Printer, Loader2 } from 'lucide-react'
import type { Tour } from '@/stores/types'
import { logger } from '@/lib/utils/logger'

interface CancellationItem {
  name: string
  date?: string
  quantity?: number
  note?: string
}

interface CancellationQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: Tour
  supplierName: string
  items: CancellationItem[]
  reason: string
  requestId?: string // 用於更新 tour_requests 狀態
  lineGroupId?: string // 原本發送時的 LINE 群組
}

export function CancellationQuoteDialog({
  open,
  onClose,
  tour,
  supplierName,
  items,
  reason,
  requestId,
  lineGroupId: defaultLineGroupId,
}: CancellationQuoteDialogProps) {
  const [note, setNote] = useState(reason)
  const [viewMode, setViewMode] = useState<'modern' | 'traditional'>('modern')
  const [sending, setSending] = useState(false)

  // LINE 群組
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultLineGroupId || '')

  const supabase = createSupabaseBrowserClient()

  // 載入 LINE 群組
  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .order('group_name')
      if (data) {
        setLineGroups(
          data.map(g => ({
            group_id: g.group_id,
            group_name: g.group_name || '(未命名)',
          }))
        )
        // 如果有預設群組，自動選中
        if (defaultLineGroupId && data.some(g => g.group_id === defaultLineGroupId)) {
          setSelectedGroupId(defaultLineGroupId)
        }
      }
    }
    void load()
  }, [open, defaultLineGroupId])

  // 重置狀態
  useEffect(() => {
    if (open) {
      setNote(reason)
      setViewMode('modern')
    }
  }, [open, reason])

  const handlePrint = () => {
    setViewMode('traditional')
    // 延遲一下讓畫面切換到列印模式
    setTimeout(() => {
      window.print()
    }, 300)
  }

  const handleSendLine = async () => {
    if (!selectedGroupId) {
      toast.error('請選擇 LINE 群組')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/line/send-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          tourCode: tour?.code,
          tourName: tour?.name,
          departureDate: tour?.departure_date,
          supplierName,
          items,
          reason: note,
          requestId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '發送失敗')
      }

      toast.success('取消通知已發送')
      onClose()
    } catch (err) {
      logger.error('發送取消通知失敗:', err)
      toast.error('發送失敗：' + String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-morandi-red">⚠️ 取消通知單</DialogTitle>
        </DialogHeader>

        {/* 中間可滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {viewMode === 'traditional' ? (
            <UnifiedTraditionalView
              requestType="cancellation"
              tour={{
                code: tour?.code || '',
                name: tour?.name || '',
                departure_date: tour?.departure_date || undefined,
              }}
              totalPax={0}
              supplierName={supplierName}
              items={items.map(item => ({
                name: item.name,
                date: item.date,
                quantity: item.quantity,
                note: item.note,
              }))}
              note={note}
              setNote={setNote}
            />
          ) : (
            <div className="space-y-4">
              {/* 警示區塊 */}
              <div className="bg-morandi-red/10 border border-morandi-red/30 rounded-lg p-4">
                <h3 className="font-semibold text-morandi-red mb-2">⚠️ 取消通知</h3>
                <div className="text-sm text-morandi-red">
                  <p>因行程異動，需取消以下項目</p>
                </div>
              </div>

              {/* 團資訊 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">團號：</span>
                  <span className="font-medium ml-1">{tour?.code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">團名：</span>
                  <span className="font-medium ml-1">{tour?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">供應商：</span>
                  <span className="font-medium ml-1">{supplierName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">出發日：</span>
                  <span className="font-medium ml-1">{tour?.departure_date || '-'}</span>
                </div>
              </div>

              {/* 取消項目 */}
              <div>
                <h3 className="font-semibold mb-2">取消項目</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-morandi-red/10">
                      <th className="border px-3 py-2 text-left">項目名稱</th>
                      <th className="border px-3 py-2 text-left">日期</th>
                      <th className="border px-3 py-2 text-left">數量</th>
                      <th className="border px-3 py-2 text-left">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2">{item.name}</td>
                        <td className="border px-3 py-2">{item.date || '—'}</td>
                        <td className="border px-3 py-2">{item.quantity || '—'}</td>
                        <td className="border px-3 py-2">{item.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 取消原因 */}
              <div>
                <label className="block text-sm font-medium mb-1">取消原因</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="例如：行程調整、客人要求變更..."
                />
              </div>

              {/* 致歉 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p>🙏 造成不便，敬請見諒。</p>
              </div>
            </div>
          )}
        </div>

        {/* 固定底部：發送方式 */}
        <div className="flex-shrink-0 border-t border-border pt-4 mt-2 space-y-3">
          {/* LINE 群組選擇 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">LINE 群組：</span>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-[250px]">
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer size={16} />
                列印
              </Button>
              <Button
                variant="destructive"
                onClick={handleSendLine}
                disabled={sending || !selectedGroupId}
                className="gap-2"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? '發送中...' : 'LINE 發送取消通知'}
              </Button>
            </div>
            <Button variant="outline" onClick={onClose}>
              關閉
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
