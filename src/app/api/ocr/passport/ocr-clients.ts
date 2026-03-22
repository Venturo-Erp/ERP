/**
 * OCR API 客戶端
 * 封裝 OCR.space 和 Google Vision API 呼叫
 */

import { logger } from '@/lib/utils/logger'

/**
 * 呼叫 OCR.space API（專門辨識 MRZ）
 */
export async function callOcrSpace(base64Image: string, apiKey: string): Promise<string> {
  const ocrFormData = new FormData()
  ocrFormData.append('base64Image', base64Image)
  ocrFormData.append('language', 'eng')
  ocrFormData.append('isOverlayRequired', 'false')
  ocrFormData.append('detectOrientation', 'true')
  ocrFormData.append('scale', 'true')
  ocrFormData.append('OCREngine', '2')

  // 🆕 加入 30 秒 timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: ocrFormData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'OCR.space 辨識失敗')
    }

    return data.ParsedResults?.[0]?.ParsedText || ''
  } catch (error: any) {
    clearTimeout(timeoutId)

    // 🔧 處理所有 OCR.space 錯誤：返回空字串讓 Google Vision 接手
    if (error.name === 'AbortError') {
      logger.warn('OCR.space fetch timeout (30s), 改用 Google Vision')
    } else if (error.message?.includes('E101') || error.message?.includes('Timed out')) {
      logger.warn('OCR.space API timeout, 改用 Google Vision')
    } else {
      logger.warn('OCR.space 辨識失敗:', error.message, '改用 Google Vision')
    }

    // 所有錯誤都返回空字串，不中斷流程
    return ''
  }
}

export interface GoogleVisionResult {
  text: string
  error?: string
}

/**
 * 呼叫 Google Vision API（辨識中文）
 */
export async function callGoogleVision(
  base64Image: string,
  apiKey: string
): Promise<GoogleVisionResult> {
  // 移除 data:image/xxx;base64, 前綴
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Data },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: {
            languageHints: ['zh-TW', 'en'],
          },
        },
      ],
    }),
  })

  const data = await response.json()

  if (data.error) {
    const msg = data.error.message || 'Google Vision API 錯誤'
    logger.error('Google Vision 錯誤:', data.error)
    return { text: '', error: msg }
  }

  return { text: data.responses?.[0]?.fullTextAnnotation?.text || '' }
}
