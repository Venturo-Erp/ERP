/**
 * QuoteCard - Local 報價卡片
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TourRequest } from '@/features/tours/hooks/useTourRequests'
import { AcceptQuoteDialog } from './AcceptQuoteDialog'
import { RejectQuoteDialog } from './RejectQuoteDialog'

interface QuoteCardProps {
  request: TourRequest
  onAccept: () => void
  onReject: () => void
}

export function QuoteCard({ request, onAccept, onReject }: QuoteCardProps) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const response = request.supplier_response

  if (!response) return null

  const { contact, phone, tierPrices, singleRoomSupplement, tipNote, supplierNote, submitted_at } =
    response

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* 標頭 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌏</span>
            <div>
              <h4 className="font-semibold text-lg">{request.supplier_name || 'Local 供應商'}</h4>
              {request.line_group_name && (
                <p className="text-sm text-muted-foreground">
                  LINE 群組：{request.line_group_name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>發送時間：{request.sent_at ? formatDate(request.sent_at) : '-'}</p>
            <p>回覆時間：{submitted_at ? formatDate(submitted_at) : '-'}</p>
          </div>
        </div>

        {/* 報價摘要 */}
        <div className="bg-muted/30 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium mb-2">報價摘要</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {tierPrices &&
              Object.entries(tierPrices).map(([tier, price]) => (
                <div key={tier} className="flex justify-between">
                  <span className="text-muted-foreground">{tier} 人團：</span>
                  <span className="font-medium">{Number(price).toLocaleString()} 元/人</span>
                </div>
              ))}
            {singleRoomSupplement && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">單人房差：</span>
                <span className="font-medium">
                  {Number(singleRoomSupplement).toLocaleString()} 元
                </span>
              </div>
            )}
            {tipNote && (
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">小費：</span>
                <span className="font-medium">{tipNote}</span>
              </div>
            )}
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="flex gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">聯絡人：</span>
            <span className="font-medium">{contact}</span>
          </div>
          <div>
            <span className="text-muted-foreground">電話：</span>
            <span className="font-medium">{phone}</span>
          </div>
        </div>

        {/* 供應商備註 */}
        {supplierNote && (
          <div className="text-sm mb-3">
            <span className="text-muted-foreground">備註：</span>
            <span>{supplierNote}</span>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1"
            onClick={() => setShowAcceptDialog(true)}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            確認成交
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setShowRejectDialog(true)}
          >
            <XCircle className="w-4 h-4 mr-1" />
            不成交
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDetails(!showDetails)}>
            <FileText className="w-4 h-4 mr-1" />
            {showDetails ? '隱藏' : '詳細'}
          </Button>
        </div>

        {/* 詳細資訊（展開） */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t text-sm">
            <p className="text-muted-foreground">完整報價資料</p>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 成交確認 Dialog */}
      <AcceptQuoteDialog
        open={showAcceptDialog}
        onOpenChange={setShowAcceptDialog}
        request={request}
        onSuccess={onAccept}
      />

      {/* 拒絕確認 Dialog */}
      <RejectQuoteDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        request={request}
        onSuccess={onReject}
      />
    </>
  )
}
