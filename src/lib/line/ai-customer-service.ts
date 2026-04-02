import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * 呼叫 Gemini API
 */
async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  })
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

interface TourQueryResult {
  id: string
  code: string
  name: string
  departure_date: string
  return_date: string
  selling_prices?: {
    adult?: number
    child_with_bed?: number
    child_no_bed?: number
  }
}

/**
 * 從訊息中提取意圖和關鍵字
 */
async function analyzeIntent(message: string): Promise<{
  intent: string
  destination?: string
  tourCode?: string
}> {
  const prompt = `
分析這則客戶訊息的意圖：

訊息：「${message}」

請用 JSON 格式回答：
{
  "intent": "查詢行程" | "查詢價格" | "報名" | "其他",
  "destination": "目的地（如果有）",
  "tourCode": "行程代碼（如果有，例如 CNX260524A）"
}

只回傳 JSON，不要其他文字。
`
  
  const text = await callGemini(prompt)
  
  // 移除可能的 markdown code block
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  try {
    return JSON.parse(jsonText)
  } catch {
    return { intent: '其他' }
  }
}

/**
 * 查詢行程資料
 */
async function queryTours(destination?: string, tourCode?: string): Promise<TourQueryResult[]> {
  let query = supabase
    .from('tours')
    .select('id, code, name, departure_date, return_date, selling_prices')
    .gte('departure_date', new Date().toISOString().split('T')[0])
    .order('departure_date', { ascending: true })
    .limit(5)
  
  if (tourCode) {
    query = query.eq('code', tourCode.toUpperCase())
  } else if (destination) {
    query = query.ilike('name', `%${destination}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    logger.error('[LINE AI] Query error:', error)
    return []
  }
  
  return data || []
}

/**
 * 生成 AI 回覆
 */
async function generateAIResponse(
  userMessage: string,
  intent: string,
  tours: TourQueryResult[]
): Promise<string> {
  const context = tours.length > 0 
    ? `我們的行程資料：\n${JSON.stringify(tours, null, 2)}`
    : '目前沒有找到符合的行程。'
  
  const prompt = `
你是 Venturo 旅遊的 AI 客服。

客戶問：${userMessage}

${context}

請用親切、專業的語氣回答客戶。

規則：
1. 只根據我們的行程資料回答
2. 不要提到其他旅行社
3. 如果有價格資訊，明確列出
4. 如果客戶表達報名意願，引導他們提供聯絡資訊
5. 保持簡潔（最多 200 字）

回覆：
`
  
  return await callGemini(prompt)
}

/**
 * 儲存對話記錄
 */
async function saveConversation(
  platform: 'line' | 'messenger',
  userId: string,
  displayName: string | null,
  userMessage: string,
  aiResponse: string,
  intent: string,
  mentionedTours: string[]
) {
  const { error } = await supabase
    .from('customer_service_conversations')
    .insert({
      platform,
      platform_user_id: userId,
      user_display_name: displayName,
      user_message: userMessage,
      ai_response: aiResponse,
      intent,
      mentioned_tours: mentionedTours,
    })
  
  if (error) {
    logger.error('[LINE AI] Save conversation error:', error)
  }
}

/**
 * 主要的 AI 客服處理函數
 */
export async function handleAICustomerService(
  platform: 'line' | 'messenger',
  userId: string,
  displayName: string | null,
  userMessage: string
): Promise<string> {
  try {
    
    // 1. 分析意圖
    const { intent, destination, tourCode } = await analyzeIntent(userMessage)
    
    // 2. 查詢相關行程
    const tours = await queryTours(destination, tourCode)
    
    // 3. 生成 AI 回覆
    const aiResponse = await generateAIResponse(userMessage, intent, tours)
    
    // 4. 儲存對話記錄
    const mentionedTours = tours.map(t => t.code)
    await saveConversation(
      platform,
      userId,
      displayName,
      userMessage,
      aiResponse,
      intent,
      mentionedTours
    )
    
    return aiResponse
  } catch (error) {
    logger.error('[LINE AI] Error:', error)
    return '抱歉，系統暫時無法回應，請稍後再試或直接致電客服。'
  }
}
