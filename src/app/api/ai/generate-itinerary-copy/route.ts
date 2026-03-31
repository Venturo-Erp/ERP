/**
 * AI 行程文案生成 API
 * 使用 Gemini 生成副標題和描述
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'

interface GenerateRequest {
  title: string
  country: string
  city: string
  days: Array<{
    title: string
    activities?: Array<{ name: string; description?: string }>
  }>
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    if (!GEMINI_API_KEY) {
      return errorResponse('AI 服務未設定', 500, ErrorCode.INTERNAL_ERROR)
    }

    const body = (await request.json()) as GenerateRequest
    const { title, country, city, days } = body

    if (!title || !days?.length) {
      return errorResponse('缺少行程資料', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 組合每日行程摘要
    const dailySummary = days
      .map((day, i) => {
        const activities = day.activities?.map(a => a.name).filter(Boolean).join('、') || ''
        return `Day ${i + 1}: ${day.title}${activities ? `（${activities}）` : ''}`
      })
      .join('\n')

    const prompt = `你是旅行社的資深文案專家。請仔細閱讀以下完整行程，理解整趟旅程的規劃邏輯後，生成副標題和描述。

行程名稱：${title}
目的地：${country} ${city}
天數：${days.length}天${days.length - 1}夜

完整逐日行程：
${dailySummary}

規則：
1. 副標題（6-12字）：用空格分隔2-3個關鍵詞，概括整趟旅程的主題風格和情感，不要直接列景點名。
   好範例：「星野 溫泉 古城遊」「江南水鄉 詩意漫遊」「古都巡禮 絕景秘湯」

2. 描述（40-80字）：用完整句子概述整趟旅程的規劃脈絡，讓讀者感受行程節奏和特色，不要逐天列景點。
   好範例：「從繁華上海出發，途經蘇州古典園林，轉往六朝古都南京探訪歷史遺跡，最終在杭州西湖畔品茗賞景，一路感受江南的詩意與風華。」

回傳純JSON：{"subtitle":"副標題","description":"描述"}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const data = await response.json()

    if (data.error) {
      logger.error('Gemini API error:', data.error)
      return errorResponse('AI 生成失敗', 500, ErrorCode.INTERNAL_ERROR)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // 解析回應（處理 markdown code block 和純 JSON）
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let result: { subtitle?: string; description?: string }
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
    } catch {
      logger.error('Failed to parse Gemini response:', text)
      // Fallback: 直接用整段文字當描述
      result = { subtitle: '', description: cleaned.slice(0, 100) }
    }

    return successResponse({
      subtitle: result.subtitle || '',
      description: result.description || '',
    })
  } catch (error) {
    logger.error('Generate itinerary copy error:', error)
    return errorResponse('生成失敗', 500, ErrorCode.INTERNAL_ERROR)
  }
}
