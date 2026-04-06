import { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { generateImageSchema } from '@/lib/validations/api-schemas'

// 多 API Key 輪替機制
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[]

// 記錄每個 key 的狀態
const keyStatus: Record<string, { blocked: boolean; blockedUntil: number }> = {}

// 取得可用的 API Key
function getAvailableKey(): string | null {
  const now = Date.now()

  for (const key of GEMINI_API_KEYS) {
    const status = keyStatus[key]
    // 如果沒被封鎖，或封鎖時間已過，就可以用
    if (!status || !status.blocked || now > status.blockedUntil) {
      // 重置狀態
      if (status && now > status.blockedUntil) {
        keyStatus[key] = { blocked: false, blockedUntil: 0 }
      }
      return key
    }
  }

  return null
}

// 標記 Key 為暫時不可用
function markKeyAsBlocked(key: string, retryAfterSeconds: number = 60) {
  keyStatus[key] = {
    blocked: true,
    blockedUntil: Date.now() + retryAfterSeconds * 1000,
  }
  logger.log(`[Gemini] Key ${key.slice(-6)} blocked for ${retryAfterSeconds}s`)
}

// Gemini Imagen 3 API endpoint
const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`

export async function POST(request: NextRequest) {
  try {
    // 🔒 認證：確保用戶已登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse(auth.error.error, 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, generateImageSchema)
    if (!validation.success) return validation.error
    const { prompt, style, aspectRatio } = validation.data

    if (GEMINI_API_KEYS.length === 0) {
      return errorResponse('No Gemini API keys configured', 500, ErrorCode.INTERNAL_ERROR)
    }

    // 構建完整的 prompt，加入風格指引
    const fullPrompt = buildPrompt(prompt, style)

    // 嘗試所有可用的 API Key
    let lastError = ''
    let triedKeys = 0

    while (triedKeys < GEMINI_API_KEYS.length) {
      const apiKey = getAvailableKey()

      if (!apiKey) {
        // 所有 key 都被封鎖，回傳錯誤
        return errorResponse('所有 API 配額已用完，請稍後再試', 429, ErrorCode.QUOTA_EXCEEDED)
      }

      triedKeys++
      logger.log(
        `[Gemini] Trying key ${apiKey.slice(-6)}... (attempt ${triedKeys}/${GEMINI_API_KEYS.length})`
      )

      // 先嘗試 Gemini 2.0 Flash（支援圖片生成）
      const result = await tryGenerateWithKey(apiKey, fullPrompt)

      if (result.success) {
        return successResponse({
          image: result.image,
          prompt: fullPrompt,
          keyUsed: apiKey.slice(-6), // 只顯示最後 6 碼
        })
      }

      // 如果是配額錯誤，標記這個 key 並嘗試下一個
      if (result.isQuotaError) {
        markKeyAsBlocked(apiKey, result.retryAfter || 60)
        lastError = result.error || 'Quota exceeded'
        continue
      }

      // 其他錯誤直接回傳
      return errorResponse(result.error || 'Unknown error', 500, ErrorCode.EXTERNAL_API_ERROR)
    }

    return errorResponse('所有 API Key 都失敗了', 500, ErrorCode.EXTERNAL_API_ERROR)
  } catch (error) {
    logger.error('Generate image error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate image',
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }
}

// 使用指定的 key 嘗試生成圖片
async function tryGenerateWithKey(
  apiKey: string,
  prompt: string
): Promise<{
  success: boolean
  image?: string
  error?: string
  isQuotaError?: boolean
  retryAfter?: number
}> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
          generationConfig: { responseModalities: ['image', 'text'] },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || 'Unknown error'

      // 檢查是否為配額錯誤
      if (
        response.status === 429 ||
        errorMessage.includes('quota') ||
        errorMessage.includes('RESOURCE_EXHAUSTED')
      ) {
        // 嘗試解析 retry delay
        const retryMatch = errorMessage.match(/retry in (\d+)/i)
        const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60

        return {
          success: false,
          error: errorMessage,
          isQuotaError: true,
          retryAfter,
        }
      }

      return { success: false, error: errorMessage }
    }

    const data = await response.json()

    // 解析回應中的圖片
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          return {
            success: true,
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          }
        }
      }
    }

    return { success: false, error: 'No image in response' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}

// 構建風格化的 prompt
function buildPrompt(basePrompt: string, style?: string): string {
  const styleGuides: Record<string, string> = {
    'travel-cover': `Create a stunning travel destination cover image. Style: Elegant watercolor and ink wash painting fusion, with golden accents, dreamy atmosphere, cinematic lighting. The image should feel premium and artistic, suitable for a luxury travel brochure. `,
    food: `Create an appetizing food photography. Style: Warm lighting, shallow depth of field, rich colors, professional food styling, elegant plating on beautiful tableware. `,
    landmark: `Create a breathtaking landmark photograph. Style: Golden hour lighting, dramatic sky, architectural details highlighted, professional travel photography quality. `,
    culture: `Create a cultural scene image. Style: Artistic, respectful representation, warm colors, storytelling composition, traditional elements with modern aesthetics. `,
  }

  const stylePrefix = styleGuides[style || 'travel-cover'] || styleGuides['travel-cover']

  return `${stylePrefix}${basePrompt}. High quality, 8K resolution, masterpiece.`
}
