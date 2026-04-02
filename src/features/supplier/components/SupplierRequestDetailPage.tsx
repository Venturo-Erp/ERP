'use client'
/**
 * SupplierRequestDetailPage - 供應商委託詳情 + 回覆報價
 *
 * 顯示單筆委託的詳細資訊，供應商可填入報價後回覆
 */

import React, { useState, useCallback, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  ArrowLeft,
  Calendar,
  MapPin,
  Send,
  Loader2,
  Package,
  DollarSign,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import { SUPPLIER_LABELS } from './constants/labels'
import type { TourRequest } from '@/data/entities/tour-requests'

/** reply_content 中的項目結構 */
interface QuoteItem {
  name: string
  description?: string
  quantity?: number
  unit?: string
  quoted_cost?: number | null
}

interface SupplierRequestDetailPageProps {
  paramsPromise: Promise<{ id: string }>
}

// 回覆狀態 Badge
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: SUPPLIER_LABELS.STATUS_PENDING_REPLY, variant: 'outline' },
  responded: { label: SUPPLIER_LABELS.STATUS_RESPONDED, variant: 'secondary' },
  quoted: { label: SUPPLIER_LABELS.STATUS_QUOTED, variant: 'secondary' },
  replied: { label: '已回覆報價', variant: 'secondary' },
  accepted: { label: SUPPLIER_LABELS.STATUS_ACCEPTED, variant: 'default' },
  rejected: { label: SUPPLIER_LABELS.STATUS_REJECTED, variant: 'destructive' },
}

export function SupplierRequestDetailPage({ paramsPromise }: SupplierRequestDetailPageProps) {
  const { id } = use(paramsPromise)
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [request, setRequest] = useState<TourRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 報價項目
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  // 整體備註
  const [replyNote, setReplyNote] = useState('')

  // 載入委託資料
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('tour_requests')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        const requestData = data as unknown as TourRequest
        setRequest(requestData)

        // 從 reply_content 取出已有的 items，或建立預設項目
        const replyContent = requestData.reply_content as { items?: QuoteItem[] } | null
        if (replyContent?.items && Array.isArray(replyContent.items)) {
          setQuoteItems(replyContent.items)
        } else {
          // 沒有 items 時，用委託本身作為一個項目
          setQuoteItems([
            {
              name: requestData.title || requestData.category || '服務項目',
              description: requestData.description || undefined,
              quantity: requestData.quantity || 1,
              unit: '項',
              quoted_cost: requestData.quoted_cost ?? null,
            },
          ])
        }

        setReplyNote(requestData.reply_note || '')
      } catch (error) {
        logger.error('載入委託詳情失敗:', error)
        toast({ title: '載入失敗', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }

    loadRequest()
  }, [id, toast])

  // 更新單個項目的報價
  const updateItemCost = useCallback((index: number, cost: number | null) => {
    setQuoteItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, quoted_cost: cost } : item))
    )
  }, [])

  // 計算報價總額
  const totalQuotedCost = quoteItems.reduce(
    (sum, item) => sum + (item.quoted_cost || 0) * (item.quantity || 1),
    0
  )

  // 送出回覆報價
  const handleSubmitQuote = useCallback(async () => {
    if (!request || !user?.workspace_id) return

    // 驗證至少有一項有填報價
    const hasQuote = quoteItems.some(item => item.quoted_cost != null && item.quoted_cost > 0)
    if (!hasQuote) {
      toast({ title: '請至少填寫一項報價金額', variant: 'destructive' })
      return
    }

    setSaving(true)

    try {
      const updatedReplyContent = {
        ...(request.reply_content as Record<string, unknown> | null),
        items: quoteItems,
        total_quoted_cost: totalQuotedCost,
        replied_by_workspace: user.workspace_id,
      }

      const { error } = await supabase
        .from('tour_requests')
        .update({
          response_status: 'replied',
          replied_at: new Date().toISOString(),
          replied_by: user.id || null,
          reply_content: updatedReplyContent as never,
          reply_note: replyNote || null,
          quoted_cost: totalQuotedCost,
        } as Record<string, unknown>)
        .eq('id', request.id)

      if (error) throw error

      toast({ title: '報價已送出' })
      router.push('/supplier/requests')
    } catch (error) {
      logger.error('送出報價失敗:', error)
      toast({ title: '送出失敗，請稍後再試', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [request, user, quoteItems, replyNote, totalQuotedCost, toast, router])

  const isPending = !request?.response_status || request.response_status === 'pending'

  const canReply = isPending || request?.response_status === 'need_info'

  if (isLoading) {
    return (
      <ContentPageLayout
        title="委託詳情"
        icon={FileText}
        breadcrumb={[
          { label: SUPPLIER_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
          { label: SUPPLIER_LABELS.BREADCRUMB_SUPPLIER, href: '/supplier' },
          { label: SUPPLIER_LABELS.BREADCRUMB_REQUESTS, href: '/supplier/requests' },
          { label: '詳情', href: '' },
        ]}
      >
        <div className="flex items-center justify-center py-20 text-morandi-secondary">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          載入中...
        </div>
      </ContentPageLayout>
    )
  }

  if (!request) {
    return (
      <ContentPageLayout
        title="委託詳情"
        icon={FileText}
        breadcrumb={[
          { label: SUPPLIER_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
          { label: SUPPLIER_LABELS.BREADCRUMB_SUPPLIER, href: '/supplier' },
          { label: SUPPLIER_LABELS.BREADCRUMB_REQUESTS, href: '/supplier/requests' },
          { label: '詳情', href: '' },
        ]}
      >
        <div className="text-center py-20 text-morandi-secondary">找不到此委託</div>
      </ContentPageLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[request.response_status || 'pending']

  return (
    <ContentPageLayout
      title="委託詳情"
      icon={FileText}
      breadcrumb={[
        { label: SUPPLIER_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: SUPPLIER_LABELS.BREADCRUMB_SUPPLIER, href: '/supplier' },
        { label: SUPPLIER_LABELS.BREADCRUMB_REQUESTS, href: '/supplier/requests' },
        { label: request.code || '詳情', href: '' },
      ]}
    >
      <div className="space-y-6 p-4">
        {/* 返回 + 狀態 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/supplier/requests')}
            className="gap-2 text-morandi-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <Badge variant={statusConfig?.variant || 'outline'}>
            {statusConfig?.label || request.response_status}
          </Badge>
        </div>

        {/* 委託基本資訊 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-morandi-primary">
              <Package className="h-5 w-5 text-morandi-gold" />
              委託資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-morandi-secondary">委託編號</span>
                <div className="font-medium font-mono mt-1">{request.code}</div>
              </div>
              <div>
                <span className="text-morandi-secondary">團名</span>
                <div className="font-medium mt-1">
                  {request.tour_name || request.tour_code || '-'}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-morandi-secondary mt-0.5" />
                <div>
                  <span className="text-morandi-secondary">服務日期</span>
                  <div className="font-medium mt-1">
                    {request.service_date
                      ? new Date(request.service_date).toLocaleDateString('zh-TW')
                      : '-'}
                    {request.service_date_end &&
                      request.service_date_end !== request.service_date &&
                      ` ~ ${new Date(request.service_date_end).toLocaleDateString('zh-TW')}`}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-morandi-secondary mt-0.5" />
                <div>
                  <span className="text-morandi-secondary">類別</span>
                  <div className="font-medium mt-1">
                    {{
                      transport: SUPPLIER_LABELS.CAT_TRANSPORT,
                      guide: SUPPLIER_LABELS.CAT_GUIDE,
                      hotel: SUPPLIER_LABELS.CAT_HOTEL,
                      restaurant: SUPPLIER_LABELS.CAT_RESTAURANT,
                      activity: SUPPLIER_LABELS.CAT_ACTIVITY,
                      other: SUPPLIER_LABELS.CAT_OTHER,
                    }[request.category] || request.category}
                  </div>
                </div>
              </div>
            </div>
            {request.description && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-sm text-morandi-secondary">說明</span>
                <p className="mt-1 text-sm text-morandi-primary whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 報價項目 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-morandi-primary">
              <DollarSign className="h-5 w-5 text-morandi-gold" />
              報價明細
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      #
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      項目名稱
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      說明
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-morandi-secondary">
                      數量
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-morandi-secondary w-[180px]">
                      報價單價
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-morandi-secondary">
                      小計
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 px-2 text-sm text-morandi-secondary">{index + 1}</td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-morandi-primary">{item.name}</span>
                      </td>
                      <td className="py-3 px-2 text-sm text-morandi-secondary">
                        {item.description || '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {item.quantity || 1} {item.unit || ''}
                      </td>
                      <td className="py-3 px-2">
                        {canReply ? (
                          <Input
                            type="number"
                            min={0}
                            value={item.quoted_cost ?? ''}
                            onChange={e => {
                              const val = e.target.value
                              updateItemCost(index, val === '' ? null : parseFloat(val))
                            }}
                            placeholder="輸入報價"
                            className="text-right w-[160px] ml-auto"
                          />
                        ) : (
                          <div className="text-right font-medium">
                            {item.quoted_cost != null
                              ? `NT$ ${item.quoted_cost.toLocaleString()}`
                              : '-'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-morandi-primary">
                        {item.quoted_cost != null
                          ? `NT$ ${((item.quoted_cost || 0) * (item.quantity || 1)).toLocaleString()}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td
                      colSpan={5}
                      className="py-3 px-2 text-right font-medium text-morandi-primary"
                    >
                      報價總計
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-lg text-morandi-gold">
                      NT$ {totalQuotedCost.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 備註 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-morandi-primary">
              {SUPPLIER_LABELS.LABEL_7829}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canReply ? (
              <div className="space-y-2">
                <Label>{SUPPLIER_LABELS.REMARKS}</Label>
                <Textarea
                  value={replyNote}
                  onChange={e => setReplyNote(e.target.value)}
                  placeholder="其他說明或備註..."
                  rows={3}
                />
              </div>
            ) : (
              <p className="text-sm text-morandi-primary whitespace-pre-wrap">
                {request.reply_note || '無備註'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 送出按鈕 */}
        {canReply && (
          <div className="flex justify-end gap-3 pb-4">
            <Button variant="outline" onClick={() => router.push('/supplier/requests')}>
              取消
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={saving}
              className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              回覆報價
            </Button>
          </div>
        )}
      </div>
    </ContentPageLayout>
  )
}
