'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UnifiedTraditionalView } from './UnifiedTraditionalView'

interface AccommodationQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  accommodations: Array<{
    checkIn: string
    roomType: string
    bedType?: string
    quantity: number
    note?: string
  }>
  supplierName: string
}

export function AccommodationQuoteDialog({
  open,
  onClose,
  tour,
  totalPax,
  accommodations,
  supplierName,
}: AccommodationQuoteDialogProps) {
  const [note, setNote] = useState('')
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
          <DialogTitle>住宿需求單</DialogTitle>
        </DialogHeader>
        {/* 中間可滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {viewMode === 'traditional' ? (
            <UnifiedTraditionalView
              requestType="accommodation"
              tour={tour}
              totalPax={totalPax}
              supplierName={supplierName}
              items={accommodations}
              note={note}
              setNote={setNote}
            />
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">團號：</span>{tour?.code}
                <span className="ml-4 font-medium">團名：</span>{tour?.name}
                <span className="ml-4 font-medium">人數：</span>{totalPax} 人
              </div>
              <div>
                <h3 className="font-semibold mb-2">住宿需求</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-3 py-2 text-left">入住日期</th>
                      <th className="border px-3 py-2 text-left">房型</th>
                      <th className="border px-3 py-2 text-left">床型</th>
                      <th className="border px-3 py-2 text-left">數量</th>
                      <th className="border px-3 py-2 text-left">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accommodations.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2">{item.checkIn}</td>
                        <td className="border px-3 py-2">{item.roomType}</td>
                        <td className="border px-3 py-2">{item.bedType || '—'}</td>
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
              <button
                onClick={() => handleDelivery('fax')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50"
              >
                傳真
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-gray-50">
                租戶
              </button>
            </div>
            <Button variant="outline" onClick={onClose}>取消</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
