/**
 * Tour Request Service
 * 需求單資料存取層
 */

import { dynamicFrom } from '@/lib/supabase/typed-client'
import type {
  TourRequest,
  RequestDocument,
  TourFile,
  CreateTourRequestInput,
  UpdateTourRequestInput,
  TourRequestDetail,
} from '@/types/tour-documents.types'

const tourRequestsDb = () => dynamicFrom('tour_requests')
const requestDocumentsDb = () => dynamicFrom('request_documents')
const tourFilesDb = () => dynamicFrom('tour_files')

/**
 * 取得團的所有需求單
 */
export async function getTourRequests(tourId: string): Promise<TourRequest[]> {
  const { data, error } = await tourRequestsDb()
    .select(
      'id, code, tour_id, workspace_id, request_type, status, supplier_name, supplier_id, items, note, replied_at, accepted_at, created_at, updated_at'
    )
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 取得單一需求單（含文件和相關檔案）
 */
export async function getTourRequestDetail(requestId: string): Promise<TourRequestDetail | null> {
  // 主需求單
  const { data: request, error: requestError } = await tourRequestsDb()
    .select(
      'id, code, tour_id, workspace_id, request_type, status, supplier_name, supplier_id, items, note, replied_at, accepted_at, created_at, updated_at'
    )
    .eq('id', requestId)
    .single()

  if (requestError) throw requestError
  if (!request) return null

  // 文件版本
  const { data: documents } = await requestDocumentsDb()
    .select(
      'id, request_id, file_url, file_name, file_type, version, status, workspace_id, created_at, updated_at'
    )
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  // 相關檔案
  const { data: related_files } = await tourFilesDb()
    .select(
      'id, tour_id, file_url, file_name, file_type, category, description, workspace_id, created_at, updated_at'
    )
    .eq('related_request_id', requestId)
    .order('created_at', { ascending: false })

  return {
    ...(request as unknown as TourRequest),
    documents: (documents || []) as unknown as RequestDocument[],
    related_files: (related_files || []) as unknown as TourFile[],
  }
}

/**
 * 建立需求單
 */
export async function createTourRequest(
  input: CreateTourRequestInput,
  workspaceId: string,
  userId: string
): Promise<TourRequest> {
  const { data, error } = await tourRequestsDb()
    .insert({
      workspace_id: workspaceId,
      tour_id: input.tour_id,
      request_type: input.request_type,
      supplier_name: input.supplier_name,
      items: input.items as unknown,
      note: input.note,
      status: '草稿',
      created_by: userId,
      updated_by: userId,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) throw error
  return data as unknown as TourRequest
}

/**
 * 更新需求單
 */
export async function updateTourRequest(
  requestId: string,
  input: UpdateTourRequestInput,
  userId: string
): Promise<TourRequest> {
  const { data, error } = await tourRequestsDb()
    .update({
      ...input,
      updated_by: userId,
    } as Record<string, unknown>)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as TourRequest
}

/**
 * 刪除需求單
 */
export async function deleteTourRequest(requestId: string): Promise<void> {
  const { error } = await tourRequestsDb().delete().eq('id', requestId)

  if (error) throw error
}

/**
 * 標記需求單為已發送
 */
export async function markRequestAsSent(
  requestId: string,
  sentVia: string,
  sentTo: string,
  userId: string
): Promise<TourRequest> {
  return updateTourRequest(
    requestId,
    {
      status: '已發送',
      sent_at: new Date().toISOString(),
      sent_via: sentVia,
    },
    userId
  )
}

/**
 * 標記需求單為已回覆
 */
export async function markRequestAsReplied(
  requestId: string,
  repliedBy: string,
  userId: string
): Promise<TourRequest> {
  const { data, error } = await tourRequestsDb()
    .update({
      status: '已回覆',
      replied_at: new Date().toISOString(),
      replied_by: repliedBy,
      updated_by: userId,
    } as Record<string, unknown>)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as TourRequest
}

/**
 * 結案需求單
 */
export async function closeTourRequest(
  requestId: string,
  closeNote: string,
  userId: string
): Promise<TourRequest> {
  const { data, error } = await tourRequestsDb()
    .update({
      status: '結案',
      closed_at: new Date().toISOString(),
      closed_by: userId,
      close_note: closeNote,
      updated_by: userId,
    } as Record<string, unknown>)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as TourRequest
}
