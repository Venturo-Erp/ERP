/**
 * CancellationQuoteDialog - 取消單發送 Dialog
 * 
 * 用途：行程刪除項目後，發送取消通知給廠商
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UnifiedTraditionalView } from './UnifiedTraditionalView'
import type { Tour } from '@/stores/types'

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
}

export function CancellationQuoteDialog({
  open,
  onClose,
  tour,
  supplierName,
  items,
  reason,
}: CancellationQuoteDialogProps) {
  const [note, setNote] = useState(reason)
  const [viewMode, setViewMode] = useState<'modern' | 'traditional'>('modern')

  const handleDelivery = (method: string) => {
    if (method === 'print' || method === 'fax') {
      setViewMode('traditional')
    } else if (method === 'line') {
      setViewMode('modern')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>取消通知單</DialogTitle>
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 mb-2">⚠️ 取消通知</h3>
                <div className="text-sm text-red-600">
                  <p className="mb-1">因行程異動，需取消以下項目：</p>
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">團號：</span>{tour?.code}
                <span className="ml-4 font-medium">團名：</span>{tour?.name}
              </div>

              <div>
                <h3 className="font-semibold mb-2">取消項目</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-red-100">
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p>🙏 造成不便，敬請見諒。</p>
              </div>
            </div>
          )}
        </div>

        {/* 固定底部：發送方式按鈕 */}
        <div className="flex-shrink-0 border-t pt-4 mt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelivery('print')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50"
              >
                列印
              </button>
              <button
                onClick={() => handleDelivery('line')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50"
              >
                LINE
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50">
                Email
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50">
                傳真
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50"
            >
              關閉
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
