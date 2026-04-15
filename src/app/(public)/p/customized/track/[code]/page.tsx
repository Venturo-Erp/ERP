'use client'

/**
 * 詢價單追蹤頁面 - 客人查看進度
 * 路由: /p/customized/track/[code]
 *
 * 功能：
 * 1. 客人用追蹤碼查看詢價單狀態
 * 2. 看到我們的回覆/報價
 * 3. 可以追加留言
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  MapPin,
  ChevronLeft,
  Phone,
  Loader2,
  Clock,
  CheckCircle,
  MessageCircle,
  Calendar,
  Users,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'

interface Inquiry {
  id: string
  code: string | null
  customer_name: string
  phone: string | null
  travel_date: string | null
  people_count: number
  notes: string | null
  selected_items: { item_id: string; name: string; priority: number }[]
  status: 'pending' | 'contacted' | 'quoted' | 'converted' | 'cancelled'
  internal_notes: string | null
  created_at: string | null
  template_name?: string
  workspace_id?: string
}

interface CompanyInfo {
  name: string
  phone: string
}

const STATUS_MAP = {
  pending: { label: '等待處理', color: 'bg-status-warning-bg text-yellow-800', icon: Clock },
  contacted: { label: '已聯繫', color: 'bg-status-info/10 text-status-info', icon: Phone },
  quoted: {
    label: '已報價',
    color: 'bg-morandi-secondary/10 text-morandi-secondary',
    icon: MessageCircle,
  },
  converted: {
    label: '已成團',
    color: 'bg-morandi-green/10 text-morandi-green',
    icon: CheckCircle,
  },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', icon: Clock },
}

export default function TrackInquiryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)

  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '旅行社', phone: '' })

  // 追加留言
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 載入詢價單
  useEffect(() => {
    const fetchInquiry = async () => {
      const { data, error } = await supabase
        .from('customer_inquiries')
        .select(
          `
          *,
          wishlist_templates(name, workspace_id)
        `
        )
        .eq('code', code)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const templateInfo = data.wishlist_templates as { name: string; workspace_id: string } | null

      setInquiry({
        id: data.id,
        code: data.code,
        customer_name: data.customer_name,
        phone: data.phone,
        travel_date: data.travel_date,
        people_count: data.people_count || 1,
        notes: data.notes,
        selected_items: data.selected_items as Inquiry['selected_items'],
        status: data.status as Inquiry['status'],
        internal_notes: data.internal_notes,
        created_at: data.created_at,
        template_name: templateInfo?.name,
        workspace_id: templateInfo?.workspace_id || data.workspace_id,
      })

      // 載入公司資訊
      const workspaceId = templateInfo?.workspace_id || data.workspace_id
      if (workspaceId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('legal_name, phone')
          .eq('id', workspaceId)
          .single()

        if (workspace) {
          setCompanyInfo({
            name: workspace.legal_name || '旅行社',
            phone: workspace.phone || '',
          })
        }
      }

      setLoading(false)
    }

    fetchInquiry()
  }, [code])

  // 追加留言
  const handleAddNote = async () => {
    if (!additionalNotes.trim()) return

    setSubmitting(true)

    const newNotes = inquiry?.notes
      ? `${inquiry.notes}\n\n---\n[${new Date().toLocaleString('zh-TW')}] 客戶追加：\n${additionalNotes}`
      : `[${new Date().toLocaleString('zh-TW')}] 客戶追加：\n${additionalNotes}`

    const { error } = await supabase
      .from('customer_inquiries')
      .update({ notes: newNotes })
      .eq('id', inquiry?.id || '')

    setSubmitting(false)

    if (error) {
      toast.error('送出失敗')
      return
    }

    toast.success('留言已送出')
    setAdditionalNotes('')
    // 重新載入
    setInquiry(prev => (prev ? { ...prev, notes: newNotes } : null))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <MapPin className="w-16 h-16 text-white/20 mb-4" />
        <p className="text-xl font-medium mb-2 text-white">找不到此詢價單</p>
        <p className="text-white/60 mb-6">追蹤碼可能有誤，請確認後重試</p>
        <Link href="/p/customized">
          <Button>返回首頁</Button>
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[inquiry?.status || 'pending']
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/p/customized" className="text-white/60 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">{companyInfo.name}</h1>
          </div>
          {companyInfo.phone && (
            <a
              href={`tel:${companyInfo.phone}`}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <Phone className="w-4 h-4" />
              {companyInfo.phone}
            </a>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="text-center mb-8">
          <p className="text-white/50 mb-2">追蹤碼</p>
          <h2 className="text-3xl font-bold text-white mb-4">{inquiry?.code}</h2>
          <Badge className={`${statusInfo.color} text-sm px-4 py-1`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 詢價資訊 */}
          <div className="bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">詢價資訊</h3>

            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-sm">姓名</p>
                <p className="text-white font-medium">{inquiry?.customer_name}</p>
              </div>

              {inquiry?.travel_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white/50" />
                  <div>
                    <p className="text-white/50 text-sm">預計出發</p>
                    <p className="text-white">{inquiry.travel_date}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-white/50" />
                <div>
                  <p className="text-white/50 text-sm">人數</p>
                  <p className="text-white">{inquiry?.people_count} 人</p>
                </div>
              </div>

              {inquiry?.template_name && (
                <div>
                  <p className="text-white/50 text-sm">目的地</p>
                  <p className="text-white">{inquiry.template_name}</p>
                </div>
              )}

              <div>
                <p className="text-white/50 text-sm">送出時間</p>
                <p className="text-white text-sm">
                  {new Date(inquiry?.created_at || '').toLocaleString('zh-TW')}
                </p>
              </div>
            </div>
          </div>

          {/* 已選景點 */}
          <div className="bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">
              已選景點（{inquiry?.selected_items?.length || 0}）
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {inquiry?.selected_items?.map((item, index) => (
                <div
                  key={item.item_id}
                  className="flex items-center gap-2 p-2 bg-card/5 rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm text-white">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 備註/對話 */}
        {inquiry?.notes && (
          <div className="mt-6 bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              備註與對話
            </h3>
            <div className="bg-slate-800/50 rounded-lg p-4 whitespace-pre-wrap text-white/80 text-sm">
              {inquiry.notes}
            </div>
          </div>
        )}

        {/* 公司回覆（internal_notes 公開部分） */}
        {inquiry?.internal_notes && (
          <div className="mt-6 bg-primary/10 border border-primary/20 rounded-2xl p-6">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {companyInfo.name}回覆
            </h3>
            <div className="text-white/90 whitespace-pre-wrap">{inquiry.internal_notes}</div>
          </div>
        )}

        {/* 追加留言 */}
        <div className="mt-6 bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4">追加留言</h3>
          <Textarea
            value={additionalNotes}
            onChange={e => setAdditionalNotes(e.target.value)}
            placeholder="有任何問題或想補充的嗎？"
            rows={3}
            className="bg-slate-800/50 border-white/10 text-white placeholder:text-white/30"
          />
          <Button
            className="mt-3"
            onClick={handleAddNote}
            disabled={!additionalNotes.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            送出留言
          </Button>
        </div>

        {/* 聯絡方式 */}
        <div className="mt-8 text-center text-white/50">
          <p>如有急事，請直接撥打</p>
          <a href="tel:02-12345678" className="text-primary text-lg font-bold hover:underline">
            02-1234-5678
          </a>
        </div>
      </div>
    </div>
  )
}
