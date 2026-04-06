import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { getAISetting } from '@/lib/ai-settings'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// 從 webhook 傳入 workspace ID，不再寫死
const FALLBACK_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

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
      contents: [{ parts: [{ text: prompt }] }],
    }),
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
 * 意圖提示詞從 DB 讀取（管理員可修改）
 */
async function analyzeIntent(
  message: string,
  wsId: string
): Promise<{
  intent: string
  destination?: string
  tourCode?: string
  city?: string
  category?: string
}> {
  const intentPrompt = await getAISetting(
    wsId,
    'ai_prompt',
    'intent_prompt',
    '分析用戶訊息的意圖，回傳 JSON：{"intent": "行程查詢|價格詢問|報名流程|付款方式|簽證資訊|集合資訊|客訴處理|轉接真人|我的訂單|景點推薦|其他", "destination": "目的地或null", "tour_code": "團號或null", "city": "詢問的城市或null", "category": "景點類型(文化/美食/自然/購物)或null"}'
  )

  const prompt = `${intentPrompt}

用戶訊息：「${message}」

只回傳 JSON，不要其他文字。`

  const text = await callGemini(prompt)
  const jsonText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

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
 * 用中文名稱查找 city_id（從 cities 表）
 */
async function resolveCityId(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('cities')
    .select('id')
    .ilike('name', `%${name}%`)
    .limit(1)

  return data?.[0]?.id || null
}

/**
 * 用中文名稱查找 country_id（從 countries 表）
 */
async function resolveCountryId(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('countries')
    .select('id')
    .ilike('name', `%${name}%`)
    .limit(1)

  return data?.[0]?.id || null
}

/**
 * 查詢景點資料庫
 */
async function queryAttractions(
  city?: string,
  category?: string,
  destination?: string,
  limit: number = 5
): Promise<
  {
    id: string
    name: string
    city_id: string | null
    country_id: string | null
    category: string | null
    description: string | null
    tags: string[] | null
  }[]
> {
  let query = supabase
    .from('attractions')
    .select('id, name, city_id, country_id, category, description, tags')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(limit)

  // 先用中文名稱解析出英文 city_id / country_id
  const resolvedCityId = city ? await resolveCityId(city) : null
  const resolvedDestCityId = destination ? await resolveCityId(destination) : null
  const resolvedCountryId = destination ? await resolveCountryId(destination) : null

  if (resolvedCityId) {
    query = query.eq('city_id', resolvedCityId)
  } else if (city) {
    query = query.eq('city_id', city)
  }

  if (category) {
    query = query.eq('category', category)
  }

  // 用解析後的 ID 或原始文字搜尋
  if (destination && !city && !resolvedCityId) {
    const conditions: string[] = []
    if (resolvedDestCityId) conditions.push(`city_id.eq.${resolvedDestCityId}`)
    if (resolvedCountryId) conditions.push(`country_id.eq.${resolvedCountryId}`)
    conditions.push(`name.ilike.%${destination}%`)
    query = query.or(conditions.join(','))
  }

  const { data, error } = await query
  if (error) {
    logger.error('[LINE AI] Query attractions error:', error)
    return []
  }
  return data || []
}

/**
 * 生成 AI 回覆
 * 系統提示詞從 DB 讀取（管理員可修改語氣、公司介紹等）
 */
async function generateAIResponse(
  userMessage: string,
  intent: string,
  tours: TourQueryResult[],
  attractions: {
    id: string
    name: string
    city_id: string | null
    country_id: string | null
    category: string | null
    description: string | null
    tags: string[] | null
  }[] = [],
  wsId: string = FALLBACK_WORKSPACE_ID
): Promise<string> {
  const systemPrompt = await getAISetting(
    wsId,
    'ai_prompt',
    'system_prompt',
    '你是角落旅行社的 AI 客服助理。專營高端客製化旅遊。繁體中文，親切專業，200字以內。'
  )

  let context = ''

  if (tours.length > 0) {
    context += `我們的行程資料：\n${JSON.stringify(tours, null, 2)}\n\n`
  }

  if (attractions.length > 0) {
    context += `推薦景點清單：\n${attractions.map(a => `- ${a.name}（${a.city_id || a.country_id || ''}${a.category ? ` / ${a.category}` : ''}）${a.description ? `：${a.description}` : ''}${a.tags && a.tags.length > 0 ? ` #${a.tags.join(' #')}` : ''}`).join('\n')}\n\n`
  }

  if (!context) {
    context = '目前沒有找到符合的行程或景點。'
  }

  const prompt = `${systemPrompt}

客戶意圖：${intent}
客戶問：${userMessage}

${context}

規則：
1. 只根據我們的行程資料和景點清單回答
2. 不要提到其他旅行社
3. 如果有價格資訊，明確列出
4. 如果推薦景點，說明推薦理由（適合誰、有什麼特色）
5. 如果客戶表達報名意願，引導他們提供聯絡資訊或詢問「需要規劃行程嗎？」
6. 保持簡潔親切（最多 200 字）

回覆：`

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
  const { error } = await supabase.from('customer_service_conversations').insert({
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
  userMessage: string,
  workspaceId?: string
): Promise<string> {
  try {
    const wsId = workspaceId || FALLBACK_WORKSPACE_ID

    // 1. 分析意圖（提示詞從 DB 讀取）
    const { intent, destination, tourCode, city, category } = await analyzeIntent(userMessage, wsId)

    // 2. 查詢相關行程
    const tours = await queryTours(destination, tourCode)

    // 3. 查詢景點資料庫
    let attractions: {
      id: string
      name: string
      city_id: string | null
      country_id: string | null
      category: string | null
      description: string | null
      tags: string[] | null
    }[] = []

    if (intent === '景點推薦' || city || destination) {
      attractions = await queryAttractions(city, category, destination, 5)
    }

    // 4. 生成 AI 回覆（系統提示詞從 DB 讀取）
    const aiResponse = await generateAIResponse(userMessage, intent, tours, attractions, wsId)

    // 5. 儲存對話記錄
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
