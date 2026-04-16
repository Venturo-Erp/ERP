import { NextRequest } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { callOcrSpace, callGoogleVision, type GoogleVisionResult } from './ocr-clients'
import {
  getGoogleVisionKeys,
  checkGoogleVisionUsage,
  updateGoogleVisionUsage,
} from './google-vision-usage'
import { parsePassportText } from './passport-parser'

/**
 * 護照 OCR 辨識 API
 * 雙 API 策略：
 * 1. OCR.space - 專門辨識 MRZ（護照號碼、效期、生日等）
 * 2. Google Vision - 辨識中文名字（每月限制 980 次）
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 10 requests per minute (OCR processing is resource intensive)
    const rateLimited = await checkRateLimit(request, 'ocr-passport', 10, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：驗證用戶身份（護照資料敏感）
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const contentType = request.headers.get('content-type') || ''

    let base64Images: { name: string; data: string }[] = []

    // 判斷是 JSON 還是 FormData
    if (contentType.includes('application/json')) {
      const json = await request.json()
      if (json.image) {
        base64Images = [{ name: 'passport.jpg', data: json.image }]
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const files = formData.getAll('files') as File[]

      if (files && files.length > 0) {
        for (const file of files) {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const base64Image = `data:${file.type};base64,${base64}`
          base64Images.push({ name: file.name, data: base64Image })
        }
      }
    } else {
      return errorResponse('不支援的 Content-Type', 400, ErrorCode.INVALID_FORMAT)
    }

    if (base64Images.length === 0) {
      return errorResponse('沒有上傳檔案', 400, ErrorCode.MISSING_FIELD)
    }

    const ocrSpaceKey = process.env.OCR_SPACE_API_KEY
    const googleVisionKeys = getGoogleVisionKeys()

    // 至少需要一個 API Key
    if (!ocrSpaceKey && googleVisionKeys.length === 0) {
      return errorResponse(
        'OCR API Key 未設定。請設定 OCR_SPACE_API_KEY 或 GOOGLE_VISION_API_KEYS 環境變數。',
        500,
        ErrorCode.INTERNAL_ERROR
      )
    }

    // 如果沒有 Google Vision Key，記錄警告（中文名辨識會失效）
    if (googleVisionKeys.length === 0) {
      logger.warn('⚠️ GOOGLE_VISION_API_KEYS 未設定，中文名辨識將無法使用。請在環境變數中設定。')
    }

    // 檢查 Google Vision 使用量並取得可用的 Key
    const { canUseGoogleVision, availableKey, currentUsage, totalLimit, warning } =
      await checkGoogleVisionUsage(base64Images.length, googleVisionKeys)

    // 批次辨識所有護照
    let googleVisionError: string | null = null

    const results = await Promise.all(
      base64Images.map(async img => {
        try {
          const noVision: GoogleVisionResult = { text: '', error: undefined }
          const [ocrSpaceResult, gvResult] = await Promise.all([
            ocrSpaceKey ? callOcrSpace(img.data, ocrSpaceKey) : Promise.resolve(''),
            availableKey && canUseGoogleVision
              ? callGoogleVision(img.data, availableKey)
              : Promise.resolve(noVision),
          ])

          // 記錄 Google Vision 錯誤（只記一次）
          if (gvResult.error && !googleVisionError) {
            googleVisionError = gvResult.error
          }

          const customerData = parsePassportText(ocrSpaceResult, gvResult.text, img.name)

          return {
            success: true,
            fileName: img.name,
            customer: customerData,
            rawText: ocrSpaceResult,
            imageBase64: img.data,
          }
        } catch (error) {
          logger.error(`辨識失敗 (${img.name}):`, error)
          return {
            success: false,
            fileName: img.name,
            error: error instanceof Error ? error.message : '未知錯誤',
          }
        }
      })
    )

    // 更新使用量
    if (canUseGoogleVision && availableKey) {
      await updateGoogleVisionUsage(base64Images.length, availableKey)
    }

    return successResponse({
      results,
      total: base64Images.length,
      successful: results.filter(r => r.success).length,
      usageWarning: warning,
      googleVisionError,
      // 當 Google Vision 不可用時，提示前端中文名辨識已關閉
      chineseNameWarning: !canUseGoogleVision
        ? '中文名辨識未啟用（Google Vision API Key 未設定或額度已滿），僅辨識 MRZ 資料。'
        : null,
      googleVisionUsage: {
        current: currentUsage + (canUseGoogleVision ? base64Images.length : 0),
        limit: totalLimit,
        enabled: canUseGoogleVision,
        keysAvailable: googleVisionKeys.length,
      },
    })
  } catch (error) {
    logger.error('護照辨識錯誤:', error)
    return errorResponse(
      error instanceof Error ? error.message : '處理失敗',
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }
}
