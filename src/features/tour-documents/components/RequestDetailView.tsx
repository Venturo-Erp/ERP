'use client'

/**
 * RequestDetailView - 需求單詳細頁面
 * Linear 風格的完整視圖（時間軸 + 相關檔案 + 活動記錄）
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Upload, FileText, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { RequestTimeline } from './RequestTimeline'
import { FileUploader } from './FileUploader'
import { getTourRequestDetail } from '../services/tour-request.service'
import { uploadFile } from '../services/file-upload.service'
import { createRequestDocument, getNextVersion } from '../services/request-document.service'
import { createTourFile } from '../services/tour-file.service'
import type { TourRequestDetail, RequestDocument } from '@/types/tour-documents.types'
import { useAuthStore } from '@/stores/auth-store'

interface RequestDetailViewProps {
  requestId: string
  onBack?: () => void
}

export function RequestDetailView({ requestId, onBack }: RequestDetailViewProps) {
  const user = useAuthStore(state => state.user)
  const currentUserId = user?.id
  const currentWorkspaceId = user?.workspace_id
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<TourRequestDetail | null>(null)
  const [uploading, setUploading] = useState(false)

  // 載入資料
  useEffect(() => {
    loadRequest()
  }, [requestId])

  const loadRequest = async () => {
    try {
      setLoading(true)
      const data = await getTourRequestDetail(requestId)
      setRequest(data)
    } catch (error) {
      toast.error('載入失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 上傳新版本（需求單文件 - 我方發送）
  const handleUploadDocument = async (files: File[]) => {
    if (!request || !currentUserId || !currentWorkspaceId) return

    try {
      setUploading(true)

      for (const file of files) {
        // 上傳到 Storage
        const { url, size } = await uploadFile(
          file,
          `requests/${request.id}/documents`,
          progress => {
            // 上傳進度（可用於 UI 顯示）
          }
        )

        // 取得下一個版本號
        const version = await getNextVersion(request.id)

        // 建立文件記錄（reply_type = 'sent'）
        await createRequestDocument(
          {
            request_id: request.id,
            document_type: '需求單',
            version,
            file_name: file.name,
            file_url: url,
            file_size: size,
            mime_type: file.type,
          },
          currentWorkspaceId,
          currentUserId
        )
      }

      toast.success('需求單上傳成功')
      loadRequest()
    } catch (error) {
      toast.error('上傳失敗')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  // 🆕 上傳供應商回覆（關聯到指定的需求單版本）
  const handleUploadSupplierReply = async (parentDocumentId: string, files: File[]) => {
    if (!request || !currentUserId || !currentWorkspaceId) return

    try {
      setUploading(true)

      const { uploadSupplierReply } = await import('../services/request-document.service')

      for (const file of files) {
        // 上傳到 Storage
        const { url, size } = await uploadFile(file, `requests/${request.id}/replies`, () => {
          // 上傳進度
        })

        // 建立供應商回覆記錄（reply_type = 'received'）
        await uploadSupplierReply(
          {
            request_id: request.id,
            parent_document_id: parentDocumentId,
            file_name: file.name,
            file_url: url,
            file_size: size,
            mime_type: file.type,
            received_from: request.supplier_name || undefined,
          },
          currentWorkspaceId,
          currentUserId
        )
      }

      toast.success('供應商回覆上傳成功')
      loadRequest()
    } catch (error) {
      toast.error('上傳失敗')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  // 上傳相關檔案
  const handleUploadRelatedFile = async (files: File[]) => {
    if (!request || !currentUserId || !currentWorkspaceId) return

    try {
      setUploading(true)

      for (const file of files) {
        // 上傳到 Storage
        const { url, size } = await uploadFile(file, `requests/${request.id}/related`, () => {
          // 上傳進度
        })

        // 建立檔案記錄
        await createTourFile(
          {
            tour_id: request.tour_id,
            category: 'other',
            file_name: file.name,
            file_url: url,
            file_size: size,
            mime_type: file.type,
            related_request_id: request.id,
          },
          currentWorkspaceId,
          currentUserId
        )
      }

      toast.success('檔案上傳成功')
      loadRequest()
    } catch (error) {
      toast.error('上傳失敗')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  // 預覽文件
  const handlePreview = (doc: RequestDocument) => {
    window.open(doc.file_url, '_blank')
  }

  // 下載文件
  const handleDownload = (doc: RequestDocument) => {
    const a = document.createElement('a')
    a.href = doc.file_url
    a.download = doc.file_name
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-morandi-muted" size={32} />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12 text-morandi-secondary">
        <FileText size={48} className="mx-auto mb-4 text-morandi-muted" />
        <p>找不到需求單</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頭部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft size={16} className="mr-2" />
              返回
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-semibold">
              {request.request_type} - {request.supplier_name || '未指定供應商'}
            </h2>
            <p className="text-sm text-morandi-secondary mt-1">{request.code || request.id}</p>
          </div>
        </div>

        {/* 狀態徽章 */}
        <div className="flex items-center gap-2">
          {request.status === '草稿' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-morandi-container text-morandi-primary">
              🟡 草稿
            </span>
          )}
          {request.status === '已發送' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              🔵 已發送
            </span>
          )}
          {request.status === '已回覆' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              🟢 已回覆
            </span>
          )}
          {request.status === '結案' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              ✅ 結案
            </span>
          )}
        </div>
      </div>

      {/* 主要內容 */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">文件版本 ({request.documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="related">相關檔案 ({request.related_files?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">活動記錄</TabsTrigger>
        </TabsList>

        {/* 文件版本 */}
        <TabsContent value="documents" className="space-y-4">
          {/* 上傳新版本 */}
          <div className="bg-background border border-morandi-muted rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">上傳新版本</h3>
            <FileUploader
              onUpload={handleUploadDocument}
              accept="application/pdf,image/*"
              disabled={uploading}
            />
          </div>

          {/* 時間軸 */}
          <RequestTimeline
            documents={request.documents || []}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onUploadReply={handleUploadSupplierReply}
          />
        </TabsContent>

        {/* 相關檔案 */}
        <TabsContent value="related" className="space-y-4">
          <div className="bg-background border border-morandi-muted rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">上傳相關檔案</h3>
            <FileUploader onUpload={handleUploadRelatedFile} disabled={uploading} />
          </div>

          {/* 相關檔案列表 */}
          {request.related_files && request.related_files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {request.related_files.map(file => (
                <div
                  key={file.id}
                  className="border border-morandi-muted rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.open(file.file_url, '_blank')}
                >
                  <FileText size={32} className="text-morandi-gold mb-2" />
                  <div className="text-sm font-medium truncate">{file.title || file.file_name}</div>
                  <div className="text-xs text-morandi-secondary mt-1">
                    {file.file_size && `${Math.round(file.file_size / 1024)} KB`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 活動記錄 */}
        <TabsContent value="activity">
          <div className="space-y-3">
            {request.created_at && (
              <div className="flex items-start gap-3 text-sm">
                <FileText size={16} className="text-morandi-muted mt-0.5" />
                <div>
                  <span className="font-medium">需求單建立</span>
                  <span className="text-morandi-secondary ml-2">
                    {new Date(request.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
              </div>
            )}

            {request.sent_at && (
              <div className="flex items-start gap-3 text-sm">
                <Send size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <span className="font-medium">已發送</span>
                  <span className="text-morandi-secondary ml-2">
                    {new Date(request.sent_at).toLocaleString('zh-TW')} via {request.sent_via}
                  </span>
                </div>
              </div>
            )}

            {request.replied_at && (
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
                <div>
                  <span className="font-medium">已回覆</span>
                  <span className="text-morandi-secondary ml-2">
                    {new Date(request.replied_at).toLocaleString('zh-TW')}
                  </span>
                </div>
              </div>
            )}

            {request.closed_at && (
              <div className="flex items-start gap-3 text-sm">
                <XCircle size={16} className="text-emerald-500 mt-0.5" />
                <div>
                  <span className="font-medium">已結案</span>
                  <span className="text-morandi-secondary ml-2">
                    {new Date(request.closed_at).toLocaleString('zh-TW')}
                  </span>
                  {request.close_note && (
                    <div className="text-morandi-secondary mt-1">{request.close_note}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
