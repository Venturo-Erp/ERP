/**
 * Request Document Service
 * 需求單文件存取層（支援多版本）
 */

import { dynamicFrom } from '@/lib/supabase/typed-client'
import type { RequestDocument, CreateRequestDocumentInput } from '@/types/tour-documents.types'

const requestDocumentsDb = () => dynamicFrom('request_documents')

/**
 * 取得需求單的所有文件（按版本排序）
 */
export async function getRequestDocuments(requestId: string): Promise<RequestDocument[]> {
  const { data, error } = await requestDocumentsDb()
    .select('id, request_id, file_url, file_name, file_type, version, status, workspace_id, created_at, updated_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as RequestDocument[]
}

/**
 * 建立文件（新版本 - 我方發送）
 */
export async function createRequestDocument(
  input: CreateRequestDocumentInput,
  workspaceId: string,
  userId: string
): Promise<RequestDocument> {
  const { data, error } = await requestDocumentsDb()
    .insert({
      workspace_id: workspaceId,
      request_id: input.request_id,
      document_type: input.document_type,
      version: input.version,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size,
      mime_type: input.mime_type,
      note: input.note,
      reply_type: 'sent',
      status: '草稿',
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as RequestDocument
}

/**
 * 上傳供應商回覆
 */
export async function uploadSupplierReply(
  input: {
    request_id: string
    parent_document_id: string
    file_name: string
    file_url: string
    file_size?: number
    mime_type?: string
    received_from?: string
    note?: string
  },
  workspaceId: string,
  userId: string
): Promise<RequestDocument> {
  const { data, error } = await requestDocumentsDb()
    .insert({
      workspace_id: workspaceId,
      request_id: input.request_id,
      parent_document_id: input.parent_document_id,
      document_type: '供應商回覆',
      version: 'reply',
      reply_type: 'received',
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size,
      mime_type: input.mime_type,
      received_from: input.received_from,
      note: input.note,
      status: '已收到',
      received_at: new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as RequestDocument
}

/**
 * 取得下一個版本號
 */
export async function getNextVersion(requestId: string): Promise<string> {
  const documents = await getRequestDocuments(requestId)

  if (documents.length === 0) {
    return 'v1.0'
  }

  const versions = documents.map(d => d.version).filter(v => v.match(/^v\d+\.\d+$/))
  if (versions.length === 0) {
    return 'v1.0'
  }

  const maxVersion = versions
    .map(v => {
      const [major, minor] = v.replace('v', '').split('.').map(Number)
      return { major, minor }
    })
    .sort((a, b) => (a.major === b.major ? b.minor - a.minor : b.major - a.major))[0]

  return `v${maxVersion.major}.${maxVersion.minor + 1}`
}

/**
 * 標記文件為已發送
 */
export async function markDocumentAsSent(
  documentId: string,
  sentVia: string,
  sentTo: string
): Promise<RequestDocument> {
  const { data, error } = await requestDocumentsDb()
    .update({
      status: '已發送',
      sent_at: new Date().toISOString(),
      sent_via: sentVia,
      sent_to: sentTo,
    })
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as RequestDocument
}

/**
 * 標記文件為已收到
 */
export async function markDocumentAsReceived(
  documentId: string,
  receivedFrom: string
): Promise<RequestDocument> {
  const { data, error } = await requestDocumentsDb()
    .update({
      status: '已收到',
      received_at: new Date().toISOString(),
      received_from: receivedFrom,
    })
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as RequestDocument
}

/**
 * 刪除文件
 */
export async function deleteRequestDocument(documentId: string): Promise<void> {
  const { error } = await requestDocumentsDb().delete().eq('id', documentId)

  if (error) throw error
}
