import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import Anthropic from '@anthropic-ai/sdk'

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY,
})

/**
 * 定義可用工具（MVP：查詢歷史行程費用）
 */
const tools: Anthropic.Tool[] = [
  {
    name: 'get_historical_tour_cost',
    description: '查詢過往行程的預估費用（根據目的地和天數）',
    input_schema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: '目的地（例如：日本、韓國、泰國）',
        },
        duration: {
          type: 'number',
          description: '行程天數',
        },
      },
      required: ['destination', 'duration'],
    },
  },
]

/**
 * 執行工具呼叫
 */
async function executeTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  if (toolName === 'get_historical_tour_cost') {
    const { destination, duration } = toolInput as { destination: string; duration: number }
    
    // 查詢 Supabase tour_itineraries
    const { data, error } = await supabase
      .from('tour_itineraries')
      .select('tour_code, total_cost, adult_count, child_count')
      .ilike('destination', `%${destination}%`)
      .eq('duration_days', duration)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      logger.error('[Messaging] Tool execution error:', error)
      return '查詢失敗，請稍後再試'
    }

    if (!data || data.length === 0) {
      return `目前沒有 ${destination} ${duration} 天的歷史行程資料`
    }

    // 計算平均費用
    const costs = data.map((item) => {
      const totalPeople = (item.adult_count || 0) + (item.child_count || 0)
      return totalPeople > 0 ? item.total_cost / totalPeople : item.total_cost
    })
    
    const avgCost = Math.round(costs.reduce((a, b) => a + b, 0) / costs.length)

    return `${destination} ${duration} 天行程，根據 ${data.length} 筆歷史資料，平均每人費用約 NT$ ${avgCost.toLocaleString()}`
  }

  return '未知的工具'
}

/**
 * 呼叫 Claude AI（支援 Function Calling）
 */
async function callClaude(userMessage: string): Promise<string> {
  const systemPrompt = `你是角落旅行社的 AI 客服助理。
專營高端客製化旅遊（日本、韓國、泰國等）。

回覆規則：
1. 繁體中文，親切專業
2. 200字以內
3. 如果客戶詢問價格，使用 get_historical_tour_cost 工具查詢
4. 如果客戶表達報名意願，引導提供聯絡資訊
5. 不要提到其他旅行社`

  let messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ]

  // 第一次呼叫（可能觸發 tool_use）
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  })

  logger.info('[Messaging] Claude response:', JSON.stringify(response, null, 2))

  // 檢查是否需要執行工具
  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  
  if (toolUseBlock && toolUseBlock.type === 'tool_use') {
    const toolName = toolUseBlock.name
    const toolInput = toolUseBlock.input as Record<string, unknown>
    const toolUseId = toolUseBlock.id

    // 執行工具
    const toolResult = await executeTool(toolName, toolInput)

    // 繼續對話（附上工具結果）
    messages = [
      ...messages,
      {
        role: 'assistant',
        content: response.content,
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: toolResult,
          },
        ],
      },
    ]

    const finalResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    })

    // 提取文字回覆
    const textBlock = finalResponse.content.find((block) => block.type === 'text')
    return textBlock && textBlock.type === 'text' ? textBlock.text : '抱歉，系統暫時無法回應'
  }

  // 直接回覆（沒有工具呼叫）
  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock && textBlock.type === 'text' ? textBlock.text : '抱歉，系統暫時無法回應'
}

/**
 * 傳送訊息到 Messenger/Instagram
 */
async function sendMessage(platform: 'messenger' | 'instagram', recipientId: string, message: string) {
  const apiUrl =
    platform === 'instagram'
      ? 'https://graph.facebook.com/v21.0/me/messages'
      : 'https://graph.facebook.com/v21.0/me/messages'

  await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      access_token: META_PAGE_ACCESS_TOKEN,
    }),
  })
}

/**
 * 儲存對話記錄
 */
async function saveConversation(
  platform: 'messenger' | 'instagram',
  userId: string,
  userMessage: string,
  aiResponse: string
) {
  await supabase.from('customer_service_conversations').insert({
    platform,
    platform_user_id: userId,
    user_message: userMessage,
    ai_response: aiResponse,
  })
}

/**
 * 主要處理函數（背景執行）
 */
export async function handleMessagingAI(
  platform: 'messenger' | 'instagram',
  userId: string,
  userMessage: string,
  pageId: string
): Promise<void> {
  try {
    logger.info(`[Messaging] ${platform} | User: ${userId} | Message: ${userMessage}`)

    // 呼叫 Claude AI
    const aiResponse = await callClaude(userMessage)

    // 傳送回覆
    await sendMessage(platform, userId, aiResponse)

    // 儲存對話記錄
    await saveConversation(platform, userId, userMessage, aiResponse)

    logger.info(`[Messaging] Response sent: ${aiResponse.substring(0, 50)}...`)
  } catch (error) {
    logger.error('[Messaging] Handler error:', error)
    
    // 錯誤時傳送預設訊息
    await sendMessage(platform, userId, '抱歉，系統暫時無法回應，請稍後再試或直接致電客服。')
  }
}
