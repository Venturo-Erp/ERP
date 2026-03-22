/**
 * File Upload Service
 * Supabase Storage 檔案上傳服務
 */

import { supabase } from '@/lib/supabase/client'

const BUCKET_NAME = 'tour-documents'

/**
 * 上傳檔案到 Supabase Storage
 * @returns 檔案的公開 URL
 */
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; size: number }> {
  // 建立唯一檔名
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(7)
  const ext = file.name.split('.').pop()
  const fileName = `${timestamp}-${randomStr}.${ext}`
  const fullPath = `${path}/${fileName}`

  // 上傳檔案
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fullPath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  // 取得公開 URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath)

  // 模擬進度（Supabase Storage 目前不支援進度回調）
  if (onProgress) {
    onProgress(100)
  }

  return {
    url: publicUrl,
    size: file.size,
  }
}

/**
 * 刪除檔案
 */
export async function deleteFile(url: string): Promise<void> {
  // 從 URL 提取路徑
  const urlObj = new URL(url)
  const path = urlObj.pathname.split(`/${BUCKET_NAME}/`)[1]

  if (!path) {
    throw new Error('Invalid file URL')
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) throw error
}

/**
 * 取得檔案下載 URL（帶簽章，限時）
 */
export async function getSignedUrl(url: string, expiresIn = 3600): Promise<string> {
  const urlObj = new URL(url)
  const path = urlObj.pathname.split(`/${BUCKET_NAME}/`)[1]

  if (!path) {
    throw new Error('Invalid file URL')
  }

  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

/**
 * 批次上傳檔案
 */
export async function uploadFiles(
  files: File[],
  path: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<Array<{ url: string; size: number; fileName: string }>> {
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const result = await uploadFile(file, path, progress => {
      onProgress?.(i, progress)
    })
    results.push({ ...result, fileName: file.name })
  }

  return results
}

/**
 * 確保 Storage Bucket 存在
 */
export async function ensureBucketExists(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets()

  const exists = buckets?.some(b => b.name === BUCKET_NAME)

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    })

    if (error && !error.message.includes('already exists')) {
      throw error
    }
  }
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 取得檔案 MIME type
 */
export function getFileMimeType(file: File): string {
  return file.type || 'application/octet-stream'
}

/**
 * 驗證檔案大小
 */
export function validateFileSize(file: File, maxSizeMB = 50): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxBytes
}

/**
 * 驗證檔案類型
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}
