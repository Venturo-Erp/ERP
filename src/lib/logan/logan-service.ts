/**
 * Logan AI 服務
 * Venturo 的內部 AI 助理
 */

import { chat, checkOllamaStatus, type OllamaMessage } from './ollama'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'

// Logan AI employee（employee_number='LOGAN'）
// 注意：`00000000-...-000000000001` 是 VENTURO 機器人（BOT001）、不是 Logan
// 歷史上這裡寫錯過、`cron/sync-logan-knowledge/route.ts` 才是對的 000002
export const LOGAN_ID = '00000000-0000-0000-0000-000000000002'
export const LOGAN_EMPLOYEE_NUMBER = 'LOGAN'

/**
 * Logan 的系統提示詞
 */
const SYSTEM_PROMPT = `你是「羅根」（Logan），Venturo 旅行社的內部 AI 助理。

## 你的性格
- 專業、有溫度、耐心
- 說話簡潔但不冷漠
- 用繁體中文回答
- 不會為了推薦而推薦，會考慮實際需求

## 你的能力
1. 回答公司系統使用問題（ERP 操作流程）
2. 協助查詢團、訂單、客戶等資訊
3. 提供旅遊行程建議（根據公司經驗）
4. 記住與員工的對話，學習公司文化

## 你知道的系統流程
- 開報價單前要先開團
- 訂單要綁定團才能加成員
- 收款要先有訂單
- 簽證流程：收護照 → 送件 → 取件 → 發還

## 回答規則
- 如果不確定，說「讓我確認一下」
- 如果是系統問題，引導到正確的頁面
- 如果被問到敏感資訊，禮貌拒絕
- 保持專業但友善的語氣`

/**
 * 記憶類型（對應 ai_memories.category）
 */
export type MemoryCategory =
  | 'company_culture' // 公司文化
  | 'philosophy' // 理念與價值觀
  | 'journey' // 心路歷程
  | 'why_we_do_this' // 為什麼這樣做
  | 'how_to' // 怎麼做某件事
  | 'where_is' // 東西在哪裡
  | 'workflow' // 流程順序
  | 'business_rule' // 業務規則
  | 'term_definition' // 名詞解釋
  | 'tech_decision' // 技術決策
  | 'lesson_learned' // 踩過的坑
  | 'conversation' // 重要對話
  | 'dont_do' // 不要做的事
  | 'personality' // 人格特質

export interface Memory {
  id: string
  category: MemoryCategory
  title: string | null
  content: string
  tags: string[]
  importance: number
  created_at: string
}

/**
 * 對話歷史
 */
export interface ConversationHistory {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * Logan 回應
 */
export interface LoganResponse {
  success: boolean
  message: string
  conversationId?: string
  error?: string
}

/**
 * 檢查 Logan 是否可用
 */
export async function isLoganAvailable(): Promise<boolean> {
  return checkOllamaStatus()
}

/**
 * 取得相關記憶
 */
async function getRelevantMemories(
  workspaceId: string,
  query: string,
  limit = 5
): Promise<Memory[]> {
  const supabase = getSupabaseAdminClient()

  // 簡單的關鍵字搜尋（未來可以用向量搜尋）
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 1)

  if (keywords.length === 0) {
    return []
  }

  // 搜尋包含關鍵字的記憶
  const { data } = await supabase
    .from('ai_memories')
    .select('id, category, title, content, tags, importance, created_at')
    .eq('workspace_id', workspaceId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit * 2)

  if (!data) return []

  // 簡單過濾
  const filtered = data.filter((m: { title: string | null; content: string }) => {
    const text = `${m.title || ''} ${m.content}`.toLowerCase()
    return keywords.some(k => text.includes(k))
  })

  return filtered.slice(0, limit) as Memory[]
}

/**
 * 取得對話歷史
 */
async function getConversationHistory(
  workspaceId: string,
  employeeId: string
): Promise<{ id: string; messages: ConversationHistory[] } | null> {
  const supabase = getSupabaseAdminClient()

  const { data } = await supabase
    .from('ai_conversations')
    .select('id, messages')
    .eq('workspace_id', workspaceId)
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    id: data.id,
    messages: (data.messages as unknown as ConversationHistory[]) || [],
  }
}

/**
 * 儲存對話
 */
async function saveConversation(
  workspaceId: string,
  employeeId: string,
  conversationId: string | null,
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const newMessages: ConversationHistory[] = [
    { role: 'user', content: userMessage, timestamp: now },
    { role: 'assistant', content: assistantMessage, timestamp: now },
  ]

  if (conversationId) {
    // 更新現有對話
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('messages')
      .eq('id', conversationId)
      .single()

    const existingMessages = (existing?.messages as unknown as ConversationHistory[]) || []
    const messages = [...existingMessages, ...newMessages] as unknown as Json

    await supabase
      .from('ai_conversations')
      .update({
        messages,
        updated_at: now,
      })
      .eq('id', conversationId)

    return conversationId
  } else {
    // 建立新對話
    const { data } = await supabase
      .from('ai_conversations')
      .insert({
        workspace_id: workspaceId,
        employee_id: employeeId,
        messages: newMessages as unknown as Json,
        status: 'active',
      })
      .select('id')
      .single()

    return data?.id || ''
  }
}

/**
 * 與 Logan 對話
 */
export async function chatWithLogan(
  workspaceId: string,
  employeeId: string,
  message: string,
  options?: {
    includeHistory?: boolean
    maxHistoryMessages?: number
  }
): Promise<LoganResponse> {
  try {
    // 1. 檢查 Ollama 是否運行
    const available = await isLoganAvailable()
    if (!available) {
      return {
        success: false,
        message: '',
        error: 'Logan 目前離線中，請確認 Ollama 服務是否運行。',
      }
    }

    // 2. 取得對話歷史
    let conversationId: string | null = null
    let history: ConversationHistory[] = []

    if (options?.includeHistory !== false) {
      const conv = await getConversationHistory(workspaceId, employeeId)
      if (conv) {
        conversationId = conv.id
        history = conv.messages.slice(-(options?.maxHistoryMessages || 10))
      }
    }

    // 3. 取得相關記憶
    const memories = await getRelevantMemories(workspaceId, message)

    // 4. 組合訊息
    const messages: OllamaMessage[] = []

    // 系統提示詞
    let systemPrompt = SYSTEM_PROMPT

    // 加入相關記憶
    if (memories.length > 0) {
      systemPrompt += '\n\n## 相關知識\n'
      memories.forEach(m => {
        systemPrompt += `- ${m.title || m.category}: ${m.content}\n`
      })
    }

    messages.push({ role: 'system', content: systemPrompt })

    // 加入對話歷史
    history.forEach(h => {
      messages.push({ role: h.role, content: h.content })
    })

    // 加入當前訊息
    messages.push({ role: 'user', content: message })

    // 5. 呼叫 Ollama
    const response = await chat(messages, {
      temperature: 0.7,
      maxTokens: 1024,
    })

    // 6. 儲存對話
    const newConversationId = await saveConversation(
      workspaceId,
      employeeId,
      conversationId,
      message,
      response
    )

    return {
      success: true,
      message: response,
      conversationId: newConversationId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return {
      success: false,
      message: '',
      error: `Logan 遇到問題：${errorMessage}`,
    }
  }
}

/**
 * 教導 Logan 新知識
 */
export async function teachLogan(
  workspaceId: string,
  employeeId: string,
  knowledge: {
    title: string
    content: string
    category?: MemoryCategory
    tags?: string[]
    importance?: number
  }
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('ai_memories')
      .insert({
        workspace_id: workspaceId,
        category: knowledge.category || 'how_to',
        title: knowledge.title,
        content: knowledge.content,
        tags: knowledge.tags || [],
        importance: knowledge.importance || 5,
        source: 'manual',
        created_by: employeeId,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, memoryId: data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return { success: false, error: errorMessage }
  }
}

/**
 * 取得 Logan 的記憶列表
 */
export async function getLoganMemories(
  workspaceId: string,
  options?: {
    category?: MemoryCategory
    limit?: number
  }
): Promise<Memory[]> {
  const supabase = getSupabaseAdminClient()

  let query = supabase
    .from('ai_memories')
    .select('id, category, title, content, tags, importance, created_at')
    .eq('workspace_id', workspaceId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50)

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data } = await query

  return (data as Memory[]) || []
}
