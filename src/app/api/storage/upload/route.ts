import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * 檔案上傳 API
 * 🔒 安全修復 2026-01-12：需要已登入用戶才能上傳檔案
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 20 requests per minute (file upload)
    const rateLimited = checkRateLimit(request, 'storage-upload', 20, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入才能上傳檔案', 401, ErrorCode.UNAUTHORIZED)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string

    if (!file || !bucket || !path) {
      return errorResponse(
        'Missing required fields: file, bucket, path',
        400,
        ErrorCode.MISSING_FIELD
      )
    }

    const allowedBuckets = ['company-assets', 'passport-images', 'member-documents', 'user-avatars']
    if (!allowedBuckets.includes(bucket)) {
      return errorResponse('Invalid bucket', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 🔒 租戶隔離：確保檔案路徑包含 workspace_id
    const workspaceId = auth.data.workspaceId
    if (!path.startsWith(`${workspaceId}/`)) {
      return errorResponse('檔案路徑必須以 workspace_id 開頭', 403, ErrorCode.FORBIDDEN)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabaseAdmin = getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      logger.error('Storage upload error:', error)
      return errorResponse(error.message, 500, ErrorCode.INTERNAL_ERROR)
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    return successResponse({
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    logger.error('Upload API error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }
}

/**
 * 檔案刪除 API
 * 🔒 安全修復 2026-01-12：需要已登入用戶才能刪除檔案
 */
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 20 requests per minute (file delete)
    const rateLimited = checkRateLimit(request, 'storage-delete', 20, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入才能刪除檔案', 401, ErrorCode.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const path = searchParams.get('path')

    if (!bucket || !path) {
      return errorResponse('Missing required params: bucket, path', 400, ErrorCode.MISSING_FIELD)
    }

    const allowedBuckets = ['company-assets', 'passport-images', 'member-documents', 'user-avatars']
    if (!allowedBuckets.includes(bucket)) {
      return errorResponse('Invalid bucket', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 🔒 租戶隔離：確保檔案路徑包含 workspace_id
    const workspaceId = auth.data.workspaceId
    if (!path.startsWith(`${workspaceId}/`)) {
      return errorResponse('只能刪除自己租戶的檔案', 403, ErrorCode.FORBIDDEN)
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

    if (error) {
      logger.error('Storage delete error:', error)
      return errorResponse(error.message, 500, ErrorCode.INTERNAL_ERROR)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Delete API error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }
}
