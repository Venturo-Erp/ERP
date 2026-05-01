import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

interface StorageUploadProgress {
  loaded: number
  total: number
  percentage: number
}

interface StorageUploadOptions {
  bucket?: string
  folder?: string
  onProgress?: (progress: StorageUploadProgress) => void
}

interface StorageUploadResult {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  path: string
  publicUrl: string
}

const DEFAULT_BUCKET = 'workspace-files'

function buildFilePath(fileName: string, folder?: string) {
  return folder ? `${folder}/${fileName}` : fileName
}

function createUniqueFileName(originalName: string) {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const ext = originalName.includes('.') ? originalName.split('.').pop() : undefined
  return ext ? `${timestamp}_${randomStr}.${ext}` : `${timestamp}_${randomStr}`
}

/**
 * 上傳檔案至 Supabase Storage 並取得公開連結
 */
export async function uploadFileToStorage(
  file: File,
  options: StorageUploadOptions = {}
): Promise<StorageUploadResult> {
  const { bucket = DEFAULT_BUCKET, folder, onProgress } = options

  const uniqueFileName = createUniqueFileName(file.name)
  const storagePath = buildFilePath(uniqueFileName, folder)

  onProgress?.({ loaded: 0, total: file.size, percentage: 0 })

  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    cacheControl: '7776000',
    upsert: false,
  })

  if (error) {
    throw new Error(`檔案上傳失敗: ${error.message}`)
  }

  onProgress?.({ loaded: file.size, total: file.size, percentage: 100 })

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)

  return {
    id: uuidv4(),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    path: storagePath,
    publicUrl: publicUrlData.publicUrl,
  }
}

interface UploadMultipleOptions extends Omit<StorageUploadOptions, 'onProgress'> {
  onFileProgress?: (fileIndex: number, progress: StorageUploadProgress) => void
}

async function uploadFilesToStorage(
  files: File[],
  options: UploadMultipleOptions = {}
): Promise<StorageUploadResult[]> {
  const { onFileProgress, ...singleOptions } = options
  const results: StorageUploadResult[] = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const result = await uploadFileToStorage(file, {
      ...singleOptions,
      onProgress: progress => onFileProgress?.(index, progress),
    })
    results.push(result)
  }

  return results
}

async function removeFileFromStorage(path: string, bucket: string = DEFAULT_BUCKET) {
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`檔案刪除失敗: ${error.message}`)
  }
}

export function getPublicUrlFromStorage(path: string, bucket: string = DEFAULT_BUCKET) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}

async function listFilesInStorage(folder?: string, bucket: string = DEFAULT_BUCKET) {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) {
    throw new Error(`列出檔案失敗: ${error.message}`)
  }

  return data ?? []
}

/**
 * 刪除資料夾內的所有檔案
 * 用於刪除頻道時清理相關附件
 */
export async function deleteAllFilesInFolder(folder: string, bucket: string = DEFAULT_BUCKET) {
  // 列出資料夾內所有檔案
  const files = await listFilesInStorage(folder, bucket)

  if (files.length === 0) {
    return { deleted: 0 }
  }

  // 過濾掉資料夾（只保留檔案）
  const filePaths = files
    .filter(file => file.name && !file.name.endsWith('/'))
    .map(file => `${folder}/${file.name}`)

  if (filePaths.length === 0) {
    return { deleted: 0 }
  }

  // 批量刪除
  const { error } = await supabase.storage.from(bucket).remove(filePaths)

  if (error) {
    throw new Error(`批量刪除檔案失敗: ${error.message}`)
  }

  return { deleted: filePaths.length }
}
