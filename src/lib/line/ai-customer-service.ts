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
 * 系統提示詞、字數限制、資料來源皆從 DB 讀取（管理員可在後台修改）
 */
async function generateAIResponse(
  platform: 'line' | 'messenger' | 'instagram',
  userId: string,
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
  // Read settings from DB
  const rawSystemPrompt = await getAISetting(
    wsId,
    'ai_prompt',
    'system_prompt',
    `你是角落旅行社的首席旅遊顧問「威廉」的AI代理人，代表威廉與客戶溝通。語氣優雅從容，展現質感品味。

對話流程：
1. 優雅問候：「感謝您的詢問，我是威廉的旅遊顧問助理」
2. 細膩了解需求：詢問旅伴組成（如提到「幾大幾小」請確認小朋友年齡，這會影響行程安排與報價）
3. 了解預算期待：不直接問數字，而是「方便讓我了解您對這趟旅行的投資期待嗎？」
4. 探索旅行風格：「您理想中的旅行節奏是什麼樣的？我們擅長安排深度慢旅，讓每個體驗都有餘裕。」
5. 說明服務特色：「角落旅行社專注私人包團客製化行程，從住宿、餐廳到體驗都為您精心挑選。雖然費用較一般團體高，但每一分都花在真正的體驗上。若您希望輕鬆出遊，我們也能為您推薦優質的團體行程，目前正有合作優惠。」
6. 根據資料庫提供精選推薦，強調深度體驗而非數量

品牌定位：不追求米其林星級，而是真正的在地深度體驗。慢慢玩，好好度假，讓旅行成為生活的養分。
回覆字數上限：{max_length}字。繁體中文。`
  )

  const maxLengthRaw = await getAISetting(wsId, 'ai_prompt', 'max_length', '200')
  const maxLength = ['100', '150', '200', '300'].includes(maxLengthRaw) ? maxLengthRaw : '200'

  // Replace {max_length} placeholder in the system prompt
  const systemPrompt = rawSystemPrompt.replace(/{max_length}/g, maxLength)

  // Read data_sources setting to decide what context to include
  const dataSourcesRaw = await getAISetting(
    wsId,
    'ai_prompt',
    'data_sources',
    '{"attractions":true,"tours":true}'
  )
  let dataSourcesEnabled = { attractions: true, tours: true }
  try {
    const parsed = JSON.parse(dataSourcesRaw) as { attractions?: boolean; tours?: boolean }
    dataSourcesEnabled = {
      attractions: parsed.attractions !== false,
      tours: parsed.tours !== false,
    }
  } catch {
    // keep defaults
  }

  let context = ''

  if (dataSourcesEnabled.tours && tours.length > 0) {
    context += `我們的行程資料：\n${JSON.stringify(tours, null, 2)}\n\n`
  }

  if (dataSourcesEnabled.attractions && attractions.length > 0) {
    context += `推薦景點清單：\n${attractions.map(a => `- ${a.name}（${a.city_id || a.country_id || ''}${a.category ? ` / ${a.category}` : ''}）${a.description ? `：${a.description}` : ''}${a.tags && a.tags.length > 0 ? ` #${a.tags.join(' #')}` : ''}`).join('\n')}\n\n`
  }

  if (!context) {
    context = '目前沒有找到符合的行程或景點資料。'
  }

  // 載入對話紀錄
  const history = await loadRecentConversations(platform, userId, 5)
  let conversationContext = ''
  if (history.length > 0) {
    conversationContext =
      '之前的對話紀錄（請根據上下文延續對話，不要重複問已經問過的問題）：\n' +
      history.map(h => (h.role === 'user' ? `客戶：${h.content}` : `你：${h.content}`)).join('\n') +
      '\n\n'
  }

  const prompt = `${systemPrompt}

${conversationContext}客戶意圖：${intent}
客戶最新訊息：${userMessage}

${context}

規則：
1. 當客戶提到目的地時，先列出 2-3 個該地的熱門亮點或體驗（如美食、景點、文化體驗），用簡短大標題勾起興趣，再引導他們說出想要的風格
2. 依照上方對話流程引導客戶，逐步收集旅伴人數（有小孩請確認年齡）、預算、旅行風格
3. 只根據我們的行程資料和景點清單回答，不提其他旅行社。如果資料庫沒有資料，可用你的知識簡要介紹但不要編造具體價格
4. 如果有價格資訊，明確列出
5. 如果推薦景點，說明推薦理由（適合誰、有什麼特色）
6. 我們是私人包團客製化，費用比一般團高，但如果客戶預算有限，也可協助報名網路旅行團（目前有優惠）
7. 回覆字數不超過 ${maxLength} 字

回覆：`

  return await callGemini(prompt)
}

/**
 * 載入最近的對話紀錄（用於上下文記憶）
 */
async function loadRecentConversations(
  platform: 'line' | 'messenger' | 'instagram',
  userId: string,
  limit: number = 5
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const { data, error } = await supabase
    .from('customer_service_conversations')
    .select('user_message, ai_response')
    .eq('platform', platform)
    .eq('platform_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  // 反轉為時間正序
  const history: { role: 'user' | 'assistant'; content: string }[] = []
  for (const row of data.reverse()) {
    history.push({ role: 'user', content: row.user_message })
    history.push({ role: 'assistant', content: row.ai_response })
  }
  return history
}

/**
 * 儲存對話記錄
 */
async function saveConversation(
  platform: 'line' | 'messenger' | 'instagram',
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
  platform: 'line' | 'messenger' | 'instagram',
  userId: string,
  displayName: string | null,
  userMessage: string,
  workspaceId?: string
): Promise<string> {
  try {
    const wsId = workspaceId || FALLBACK_WORKSPACE_ID

    // 1. 分析意圖（提示詞從 DB 讀取）
    const { intent, destination, tourCode, city, category } = await analyzeIntent(userMessage, wsId)

    // 2. 讀取資料來源設定
    const dataSourcesRaw = await getAISetting(
      wsId,
      'ai_prompt',
      'data_sources',
      '{"attractions":true,"tours":true}'
    )
    let dataSourcesEnabled = { attractions: true, tours: true }
    try {
      const parsed = JSON.parse(dataSourcesRaw) as { attractions?: boolean; tours?: boolean }
      dataSourcesEnabled = {
        attractions: parsed.attractions !== false,
        tours: parsed.tours !== false,
      }
    } catch {
      // keep defaults
    }

    // 3. 查詢相關行程（依資料來源設定）
    const tours = dataSourcesEnabled.tours ? await queryTours(destination, tourCode) : []

    // 4. 查詢景點資料庫（依資料來源設定）
    let attractions: {
      id: string
      name: string
      city_id: string | null
      country_id: string | null
      category: string | null
      description: string | null
      tags: string[] | null
    }[] = []

    if (dataSourcesEnabled.attractions && (intent === '景點推薦' || city || destination)) {
      attractions = await queryAttractions(city, category, destination, 5)
    }

    // 5. 生成 AI 回覆（系統提示詞、字數、風格皆從 DB 讀取）
    const aiResponse = await generateAIResponse(
      platform,
      userId,
      userMessage,
      intent,
      tours,
      attractions,
      wsId
    )

    // 6. 儲存對話記錄
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
