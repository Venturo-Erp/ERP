'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { FileText, Calendar, Package, Building2, DollarSign, ArrowLeft } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import type { TourRequest } from '@/data/entities/tour-requests'

export default function LocalCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const caseId = params.id as string

  const [quotedCost, setQuotedCost] = useState('')
  const [replyNote, setReplyNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const swrKey = caseId ? `local-case-${caseId}` : null

  const { data: caseData, isLoading } = useSWR<TourRequest | null>(swrKey, async () => {
    if (!caseId) return null
    const { data, error } = await supabase
      .from('tour_requests')
      .select(
        'id, code, tour_id, tour_code, workspace_id, request_type, category, status, supplier_name, supplier_id, supplier_contact, supplier_response, items, note, title, description, service_date, estimated_cost, quoted_cost, reply_note, response_status, sent_at, sent_to, sent_via, replied_at, replied_by, accepted_at, accepted_by, confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason, closed_at, closed_by, close_note, package_status, selected_tier, covered_item_ids, recipient_workspace_id, target_workspace_id, source_type, source_id, request_scope, assigned_employee_id, assigned_employee_name, line_group_id, line_group_name, hidden, created_at, created_by, updated_at, updated_by'
      )
      .eq('id', caseId)
      .single()

    if (error) {
      logger.error('[Local Case] 載入失敗:', error)
      return null
    }
    return data as unknown as TourRequest
  })

  // 初始化報價欄位
  useState(() => {
    if (caseData?.quoted_cost != null) {
      setQuotedCost(String(caseData.quoted_cost))
    }
    if (caseData?.reply_note) {
      setReplyNote(caseData.reply_note)
    }
  })

  const handleSubmitQuote = async () => {
    if (!caseData) return
    const cost = parseFloat(quotedCost)
    if (isNaN(cost) || cost < 0) {
      void showAlert('請輸入有效的報價金額', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({
          quoted_cost: cost,
          reply_note: replyNote || null,
          response_status: 'quoted',
          replied_at: new Date().toISOString(),
          replied_by: user?.id ?? null,
        })
        .eq('id', caseData.id)

      if (error) throw error

      void showAlert('報價已提交', 'success')
      void mutate(swrKey)
    } catch (error) {
      logger.error('[Local Case] 提交報價失敗:', error)
      void showAlert('提交報價失敗', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!caseData) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({ status: 'completed' })
        .eq('id', caseData.id)

      if (error) throw error

      void showAlert('已標記完成', 'success')
      void mutate(swrKey)
    } catch (error) {
      logger.error('[Local Case] 標記完成失敗:', error)
      void showAlert('操作失敗', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ContentPageLayout
      title="案件詳情"
      icon={FileText}
      breadcrumb={[
        { label: '首頁', href: '/dashboard' },
        { label: 'Local', href: '/local' },
        { label: '案件列表', href: '/local/cases' },
        { label: caseData?.tour_code ?? '詳情', href: `/local/cases/${caseId}` },
      ]}
      onBack={() => router.push('/local/cases')}
    >
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-morandi-secondary">
            載入中...
          </div>
        ) : !caseData ? (
          <div className="flex flex-col items-center justify-center h-40 text-morandi-secondary gap-2">
            <FileText size={32} className="opacity-40" />
            <span>找不到此案件</span>
            <button
              onClick={() => router.push('/local/cases')}
              className="flex items-center gap-1 text-morandi-gold text-sm hover:underline"
            >
              <ArrowLeft size={14} />
              返回案件列表
            </button>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* 基本資訊 */}
            <section className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-morandi-primary mb-3">委託資訊</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-morandi-secondary" />
                  <div>
                    <div className="text-morandi-secondary text-xs">團號</div>
                    <div className="font-medium">{caseData.tour_code ?? '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-morandi-secondary" />
                  <div>
                    <div className="text-morandi-secondary text-xs">類別</div>
                    <div className="font-medium">{caseData.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-morandi-secondary" />
                  <div>
                    <div className="text-morandi-secondary text-xs">服務日期</div>
                    <div className="font-medium">{caseData.service_date ?? '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-morandi-secondary" />
                  <div>
                    <div className="text-morandi-secondary text-xs">預估費用</div>
                    <div className="font-medium">
                      {caseData.estimated_cost != null
                        ? caseData.estimated_cost.toLocaleString()
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {caseData.title && (
                <div className="mt-3 text-sm">
                  <span className="text-morandi-secondary text-xs">標題</span>
                  <p className="font-medium">{caseData.title}</p>
                </div>
              )}

              {caseData.description && (
                <div className="mt-2 text-sm">
                  <span className="text-morandi-secondary text-xs">說明</span>
                  <p className="text-morandi-primary">{caseData.description}</p>
                </div>
              )}
            </section>

            {/* 報價區 */}
            <section className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-morandi-primary mb-3">Local 報價</h3>

              {caseData.quoted_cost != null && caseData.response_status === 'quoted' && (
                <div className="mb-3 p-2 bg-morandi-green/10 rounded text-sm text-morandi-green">
                  已提交報價：{caseData.quoted_cost.toLocaleString()}
                  {caseData.reply_note && ` — ${caseData.reply_note}`}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-morandi-primary mb-1">報價金額</label>
                  <input
                    type="number"
                    value={quotedCost}
                    onChange={e => setQuotedCost(e.target.value)}
                    placeholder="輸入報價金額"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-morandi-primary mb-1">備註</label>
                  <textarea
                    value={replyNote}
                    onChange={e => setReplyNote(e.target.value)}
                    placeholder="報價說明或備註..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-morandi-gold"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting || !quotedCost}
                    className="px-4 py-2 bg-morandi-gold text-white rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    提交報價
                  </button>
                  {caseData.status === 'accepted' && (
                    <button
                      onClick={handleMarkComplete}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-morandi-green text-white rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      標記完成
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </ContentPageLayout>
  )
}
