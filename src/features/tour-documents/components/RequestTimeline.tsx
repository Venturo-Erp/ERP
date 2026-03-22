'use client'

/**
 * RequestTimeline - Linear 風格的需求單時間軸
 * 視覺化展示需求單的完整歷程
 */

import { useState } from 'react'
import {
  FileText,
  Send,
  Mail,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  MoreHorizontal,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { RequestDocument } from '@/types/tour-documents.types'

interface RequestTimelineProps {
  documents: RequestDocument[]
  onPreview?: (doc: RequestDocument) => void
  onDownload?: (doc: RequestDocument) => void
  onDelete?: (doc: RequestDocument) => void
  onUploadReply?: (parentDocumentId: string, files: File[]) => void // 🆕 上傳供應商回覆
}

// 狀態徽章
function StatusBadge({ status }: { status: string }) {
  const colors = {
    草稿: 'bg-morandi-container text-morandi-primary',
    已發送: 'bg-blue-100 text-blue-700',
    已收到: 'bg-green-100 text-green-700',
    已確認: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        colors[status as keyof typeof colors] || 'bg-morandi-container text-morandi-primary'
      )}
    >
      {status}
    </span>
  )
}

// 文件類型圖示
function getDocTypeIcon(type: string) {
  switch (type) {
    case '需求單':
      return <FileText size={18} className="text-morandi-gold" />
    case '供應商回覆':
      return <Mail size={18} className="text-blue-500" />
    case '最終確認':
      return <CheckCircle2 size={18} className="text-green-500" />
    default:
      return <FileText size={18} className="text-morandi-secondary" />
  }
}

// 文件卡片
function DocumentCard({
  doc,
  onPreview,
  onDownload,
  onDelete,
}: {
  doc: RequestDocument
  onPreview?: (doc: RequestDocument) => void
  onDownload?: (doc: RequestDocument) => void
  onDelete?: (doc: RequestDocument) => void
}) {
  const [imageError, setImageError] = useState(false)
  const isImage = doc.mime_type?.startsWith('image/')
  const isPDF = doc.mime_type === 'application/pdf'

  return (
    <div className="group relative bg-morandi-container border border-morandi-muted rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 頭部 */}
      <div className="flex items-start gap-3 mb-3">
        {/* 圖示 */}
        <div className="flex-shrink-0 mt-0.5">{getDocTypeIcon(doc.document_type)}</div>

        {/* 標題和版本 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">{doc.title || doc.file_name}</h4>
            <span className="text-xs text-morandi-muted font-mono">{doc.version}</span>
          </div>

          {/* 狀態和時間 */}
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={doc.status} />
            <span className="text-xs text-morandi-secondary">
              {formatDistanceToNow(new Date(doc.created_at), {
                addSuffix: true,
                locale: zhTW,
              })}
            </span>
          </div>
        </div>

        {/* 操作選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview?.(doc)}>
              <Eye size={14} className="mr-2" />
              預覽
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload?.(doc)}>
              <Download size={14} className="mr-2" />
              下載
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(doc)} className="text-red-600">
              <XCircle size={14} className="mr-2" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 預覽（圖片或 PDF） */}
      {isImage && !imageError && (
        <div className="mb-3 rounded overflow-hidden border border-morandi-muted">
          <img
            src={doc.file_url}
            alt={doc.file_name}
            className="w-full h-auto max-h-[200px] object-cover cursor-pointer"
            onClick={() => onPreview?.(doc)}
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {isPDF && (
        <div className="mb-3 rounded border border-morandi-muted bg-morandi-container p-4 text-center">
          <FileText size={32} className="mx-auto mb-2 text-red-500" />
          <div className="text-xs text-morandi-secondary">PDF 文件</div>
        </div>
      )}

      {/* 描述 */}
      {doc.description && <p className="text-sm text-morandi-secondary mb-3">{doc.description}</p>}

      {/* 發送/接收資訊 */}
      {doc.sent_at && (
        <div className="flex items-center gap-2 text-xs text-morandi-secondary">
          <Send size={12} />
          <span>
            {doc.sent_via} 發送至 {doc.sent_to}
          </span>
        </div>
      )}

      {doc.received_at && (
        <div className="flex items-center gap-2 text-xs text-morandi-secondary mt-1">
          <Mail size={12} />
          <span>
            {formatDistanceToNow(new Date(doc.received_at), { addSuffix: true, locale: zhTW })} 收到
            {doc.received_from && `（${doc.received_from}）`}
          </span>
        </div>
      )}

      {/* 備註 */}
      {doc.note && (
        <div className="mt-2 text-xs text-morandi-muted bg-morandi-gold/5 rounded p-2">
          💬 {doc.note}
        </div>
      )}
    </div>
  )
}

// 時間軸主元件
export function RequestTimeline({
  documents,
  onPreview,
  onDownload,
  onDelete,
  onUploadReply,
}: RequestTimelineProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-morandi-secondary">
        <FileText size={48} className="mx-auto mb-4 text-morandi-muted" />
        <p>尚無文件</p>
      </div>
    )
  }

  // 🆕 分離「我方發送」和「供應商回覆」
  const sentDocuments = documents.filter(d => d.reply_type === 'sent')
  const receivedDocuments = documents.filter(d => d.reply_type === 'received')

  // 建立階層結構
  const grouped = sentDocuments.map(sentDoc => ({
    sent: sentDoc,
    replies: receivedDocuments.filter(r => r.parent_document_id === sentDoc.id),
  }))

  return (
    <div className="space-y-6">
      {grouped.map((group, idx) => (
        <div key={group.sent.id} className="relative">
          {/* 時間軸連接線 */}
          {idx < grouped.length - 1 && (
            <div className="absolute left-[9px] top-[60px] bottom-[-24px] w-0.5 bg-morandi-muted" />
          )}

          {/* 時間軸圓點 */}
          <div className="absolute left-0 top-6 w-5 h-5 rounded-full bg-morandi-gold border-4 border-background z-10" />

          {/* 需求單文件卡片（我方發送） */}
          <div className="ml-8">
            <DocumentCard
              doc={group.sent}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
            />

            {/* 🆕 供應商回覆區塊 */}
            {group.replies.length > 0 && (
              <div className="mt-4 ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                <div className="text-xs font-medium text-blue-600 mb-2">
                  📨 供應商回覆 ({group.replies.length})
                </div>
                {group.replies.map(reply => (
                  <DocumentCard
                    key={reply.id}
                    doc={reply}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {/* 🆕 上傳供應商回覆按鈕 */}
            {onUploadReply && (
              <div className="mt-3 ml-6">
                <label
                  htmlFor={`upload-reply-${group.sent.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <Upload size={14} />
                  上傳供應商回覆
                </label>
                <input
                  id={`upload-reply-${group.sent.id}`}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      onUploadReply(group.sent.id, files)
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
