/**
 * Tour File Service
 * 旅遊團其他檔案存取層（護照/簽證/Logo等）
 */

import { dynamicFrom } from '@/lib/supabase/typed-client'
import type { TourFile, FileCategory } from '@/types/tour-documents.types'

const tourFilesDb = () => dynamicFrom('tour_files')

/**
 * 取得團的檔案（依分類）
 */
export async function getTourFiles(tourId: string, category?: FileCategory): Promise<TourFile[]> {
  let query = tourFilesDb().select('*').eq('tour_id', tourId)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 取得各分類的檔案數量
 */
export async function getTourFileCounts(tourId: string): Promise<Record<FileCategory, number>> {
  const categories: FileCategory[] = [
    'passport',
    'visa',
    'contract',
    'insurance',
    'logo',
    'bid_doc',
    'photo',
    'other',
  ]

  const counts: Record<FileCategory, number> = {} as Record<FileCategory, number>

  await Promise.all(
    categories.map(async category => {
      const { count } = await tourFilesDb()
        .select('id', { count: 'exact', head: true })
        .eq('tour_id', tourId)
        .eq('category', category)

      counts[category] = count || 0
    })
  )

  return counts
}

/**
 * 建立檔案記錄
 */
export async function createTourFile(
  input: {
    tour_id: string
    category: FileCategory
    file_name: string
    file_url: string
    file_size?: number
    mime_type?: string
    title?: string
    description?: string
    tags?: string[]
    related_request_id?: string
  },
  workspaceId: string,
  userId: string
): Promise<TourFile> {
  const { data, error } = await tourFilesDb()
    .insert({
      workspace_id: workspaceId,
      ...input,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 更新檔案記錄
 */
export async function updateTourFile(
  fileId: string,
  input: {
    title?: string
    description?: string
    tags?: string[]
  }
): Promise<TourFile> {
  const { data, error } = await tourFilesDb().update(input).eq('id', fileId).select().single()

  if (error) throw error
  return data
}

/**
 * 刪除檔案記錄
 */
export async function deleteTourFile(fileId: string): Promise<void> {
  const { error } = await tourFilesDb().delete().eq('id', fileId)

  if (error) throw error
}

/**
 * 關聯檔案到需求單
 */
export async function linkFileToRequest(fileId: string, requestId: string): Promise<TourFile> {
  const { data, error } = await tourFilesDb()
    .update({ related_request_id: requestId })
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 取消檔案關聯
 */
export async function unlinkFileFromRequest(fileId: string): Promise<TourFile> {
  const { data, error } = await tourFilesDb()
    .update({ related_request_id: null })
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}
