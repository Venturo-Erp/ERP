/**
 * CollaborativeConfirmationSheet - 協作確認單（雙方可編輯）
 */

'use client'

import { useState, useMemo } from 'react'
import { Loader2, Plus, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { TourRequest } from '@/features/tours/hooks/useTourRequests'
import { AddItemDialog } from './AddItemDialog'

interface RequestItem {
  id: string
  item_name: string
  item_category: string | null
  service_date: string | null
  day_number: number | null
  handled_by: string | null
  local_status: string | null
  local_notes: string | null
  corner_notes: string | null
  local_confirmed_at: string | null
}

async function fetchRequestItems(requestId: string): Promise<RequestItem[]> {
  const { data, error } = await supabase
    .from('tour_request_items')
    .select('*')
    .eq('request_id', requestId)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

interface CollaborativeConfirmationSheetProps {
  request: TourRequest
  onClose: () => void
}

export function CollaborativeConfirmationSheet({
  request,
  onClose,
}: CollaborativeConfirmationSheetProps) {
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)

  const { data: items, mutate } = useSWR(`request-items-${request.id}`, () =>
    fetchRequestItems(request.id)
  )

  // 按天分組
  const groupedItems = useMemo(() => {
    if (!items) return []
    const groups = new Map<number, RequestItem[]>()
    for (const item of items) {
      const day = item.day_number ?? 0
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(item)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [items])

  // 進度統計
  const stats = useMemo(() => {
    if (!items) return { total: 0, confirmed: 0, percentage: 0 }
    const total = items.filter(
      item => item.handled_by !== 'customer' && item.handled_by !== 'corner'
    ).length
    const confirmed = items.filter(item => item.local_status === 'confirmed').length
    return {
      total,
      confirmed,
      percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    }
  }, [items])

  const handleUpdateHandledBy = async (itemId: string, handledBy: string) => {
    try {
      const { error } = await supabase
        .from('tour_request_items')
        .update({ handled_by: handledBy })
        .eq('id', itemId)

      if (error) throw error

      mutate()
      toast({ title: '✅ 已更新' })
    } catch (error) {
      toast({
        title: '更新失敗',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const handlePrint = () => {
    // 產生列印版 HTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const response = request.supplier_response
    const selectedPrice =
      request.selected_tier != null ? response?.tierPrices?.[request.selected_tier] : undefined

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>領隊確認單 - ${request.tour_id}</title>
        <style>
          body { font-family: "Microsoft JhengHei", sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { font-weight: bold; width: 100px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .status-confirmed { color: green; }
          .status-skip { color: gray; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>領隊確認單</h1>
        </div>
        <div class="info">
          <div class="info-row">
            <div class="info-label">團號：</div>
            <div>${request.tour_id}</div>
          </div>
          <div class="info-row">
            <div class="info-label">供應商：</div>
            <div>${request.supplier_name || 'Local 供應商'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">報價：</div>
            <div>${request.selected_tier} 人團 ${Number(selectedPrice).toLocaleString()} 元/人</div>
          </div>
          <div class="info-row">
            <div class="info-label">緊急聯絡：</div>
            <div>${response?.contact} / ${response?.phone}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>項目</th>
              <th>說明</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            ${groupedItems
              .map(([day, dayItems]) =>
                dayItems
                  .map(
                    (item, idx) => `
              <tr>
                <td>${idx === 0 ? `Day ${day}` : ''}</td>
                <td>${item.item_name}</td>
                <td>${item.local_notes || item.corner_notes || '-'}</td>
                <td class="${item.local_status === 'confirmed' ? 'status-confirmed' : item.handled_by === 'customer' ? 'status-skip' : ''}">
                  ${item.local_status === 'confirmed' ? '✅ 已確認' : item.handled_by === 'customer' ? '⚠️ 客人自理' : '⏳ 待確認'}
                </td>
              </tr>
            `
                  )
                  .join('')
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  if (!items) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 標頭 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">協作確認單</h3>
          <p className="text-sm text-muted-foreground mt-1">
            供應商：{request.supplier_name || 'Local 供應商'}
            {request.selected_tier != null && (
              <>
                {' '}
                • {request.selected_tier} 人團{' '}
                {Number(
                  request.supplier_response?.tierPrices?.[request.selected_tier]
                ).toLocaleString()}{' '}
                元/人
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            新增項目
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            列印
          </Button>
          <Button size="sm" onClick={onClose}>
            關閉
          </Button>
        </div>
      </div>

      {/* 進度 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            進度：{stats.confirmed}/{stats.total} 項已確認
          </span>
          <span className="text-sm text-muted-foreground">{stats.percentage}%</span>
        </div>
        <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* 項目列表 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">日期</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">項目</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">處理方</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">狀態</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">備註</th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.map(([day, dayItems]) =>
              dayItems.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {idx === 0 && day > 0 ? (
                      <span className="font-medium">Day {day}</span>
                    ) : (
                      item.service_date || ''
                    )}
                  </td>
                  <td className="px-3 py-2">{item.item_name}</td>
                  <td className="px-3 py-2">
                    <select
                      value={item.handled_by || 'local'}
                      onChange={e => handleUpdateHandledBy(item.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="local">Local</option>
                      <option value="corner">我們</option>
                      <option value="customer">客人</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        item.local_status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : item.handled_by === 'customer' || item.handled_by === 'corner'
                            ? 'bg-morandi-container text-morandi-secondary'
                            : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {item.local_status === 'confirmed'
                        ? '✅ 已確認'
                        : item.handled_by === 'customer'
                          ? '⚪ 客人自理'
                          : item.handled_by === 'corner'
                            ? '⚪ 我們處理'
                            : '⏳ 待確認'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {item.local_notes || item.corner_notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增項目 Dialog */}
      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        requestId={request.id}
        tourId={request.tour_id}
        onSuccess={mutate}
      />
    </div>
  )
}
