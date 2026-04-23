import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { handleAICustomerService } from '@/lib/line/ai-customer-service'
import { withWebhookIdempotency } from '@/lib/webhook/idempotency'

// Message ID 去重（防止 Meta 重送 webhook 導致重複回覆）
const processedMessages = new Set<string>()
const MAX_PROCESSED = 1000

// 追蹤 AI 發送的 message ID（用於辨別 echo 來源）
const aiSentMessageIds = new Set<string>()
const MAX_AI_SENT = 500

// 人工接管追蹤：userId -> timestamp
const humanHandoverUsers = new Map<string, number>()
const HANDOVER_DURATION_MS = 24 * 60 * 60 * 1000 // 24 小時

// 觸發轉接的關鍵字
const HANDOVER_KEYWORDS = ['轉接客服', '找真人', '找人工', '轉真人', '人工客服', '真人服務']

// 轉接回覆訊息
const HANDOVER_MESSAGE = '好的，我已將您的需求整理好，馬上請專人為您服務！請稍候 🙏'

// 每位用戶最多 AI 對話輪數
const MAX_AI_ROUNDS = 8

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

interface MetaConfig {
  verify_token: string | null
  page_access_token: string | null
  app_secret: string | null
  app_id: string | null
}

/**
 * 從數據庫讀取 Meta 配置
 */
async function getMetaConfig(): Promise<MetaConfig> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('workspace_meta_config')
    .select('verify_token, page_access_token, app_secret, app_id')
    .limit(1)
    .single()

  if (error || !data) {
    logger.warn('[Meta] No config found in database, using defaults')
    return {
      verify_token: process.env.META_VERIFY_TOKEN || 'venturo_meta_webhook_2024',
      page_access_token: process.env.META_PAGE_ACCESS_TOKEN || '',
      app_secret: process.env.META_APP_SECRET || '',
      app_id: process.env.META_APP_ID || '',
    }
  }

  return {
    verify_token: data.verify_token || process.env.META_VERIFY_TOKEN || 'venturo_meta_webhook_2024',
    page_access_token: data.page_access_token || process.env.META_PAGE_ACCESS_TOKEN || '',
    app_secret: data.app_secret || process.env.META_APP_SECRET || '',
    app_id: data.app_id || process.env.META_APP_ID || '',
  }
}

/**
 * 驗證 Meta Webhook 簽章 (X-Hub-Signature-256)
 */
function validateSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !appSecret) return false
  try {
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/**
 * GET /api/meta/webhook — Meta Webhook 驗證
 */
export async function GET(request: NextRequest) {
  const config = await getMetaConfig()
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  logger.info('Meta webhook GET received', {
    mode,
    token,
    challenge,
    expectedToken: config.verify_token,
    allParams: Object.fromEntries(searchParams.entries()),
  })

  if (mode === 'subscribe' && token === config.verify_token) {
    logger.info('Meta webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  logger.warn('Meta webhook verification failed', {
    mode,
    token,
    expectedToken: config.verify_token,
  })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST /api/meta/webhook — 接收 Meta 訊息事件
 * 處理 Messenger + Instagram DM 的訊息
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getMetaConfig()
    const rawBody = await request.text()

    // 驗證簽章（開發階段僅 warn，不擋）
    const signature = request.headers.get('x-hub-signature-256')
    if (config.app_secret && !validateSignature(rawBody, signature, config.app_secret)) {
      logger.warn('[Meta] Invalid signature', {
        receivedSig: signature?.substring(0, 20),
        hasAppSecret: !!config.app_secret,
      })
      // 開發階段先不擋，等上線再啟用
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 冪等保護：用 raw body 的 SHA-256 當 key
    // Meta 重發同一 webhook body 不變、第二次起會被 skip
    // 同時保留 in-memory processedMessages dedup 當第二道防線 (single instance 內快取)
    const idempotencyKey = createHash('sha256').update(rawBody).digest('hex')
    return await withWebhookIdempotency('meta', idempotencyKey, async () => {
    const body = JSON.parse(rawBody)
    const object = body.object

    if (object === 'page' || object === 'instagram') {
      const entries = body.entry || []

      for (const entry of entries) {
        const messaging = entry.messaging || []

        for (const event of messaging) {
          // 處理 message_echo（偵測人工回覆）
          if (event.message?.is_echo) {
            handleEchoMessage(event)
            continue
          }

          if (event.message) {
            await handleIncomingMessage(object, event, config.page_access_token)
          }
        }
      }
    }

      return { status: 200, body: { status: 'ok' } }
    })
  } catch (error) {
    logger.error('Meta webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

interface MetaMessageEvent {
  sender: {
    id?: string
    instagram_user_id?: string
  }
  recipient: { id: string }
  timestamp: number
  message: {
    mid: string
    text?: string
    is_echo?: boolean
    app_id?: number
    attachments?: Array<{
      type: string
      payload: { url: string }
    }>
  }
}

/**
 * 處理 message_echo 事件
 * 當粉絲專頁回覆訊息時會觸發，用來偵測是否為人工回覆
 */
function handleEchoMessage(event: MetaMessageEvent) {
  const messageId = event.message.mid
  const recipientUserId = event.recipient.id

  // 如果是我們 AI 發出的訊息，忽略
  if (aiSentMessageIds.has(messageId)) {
    aiSentMessageIds.delete(messageId)
    return
  }

  // 不是 AI 發的 → 人工從粉絲專頁回覆了
  logger.info(`[Meta] Human reply detected for user ${recipientUserId}, activating handover`)
  humanHandoverUsers.set(recipientUserId, Date.now())
}

/**
 * 檢查用戶是否處於人工接管狀態
 */
function isHandedOver(userId: string): boolean {
  const timestamp = humanHandoverUsers.get(userId)
  if (!timestamp) return false

  if (Date.now() - timestamp > HANDOVER_DURATION_MS) {
    // 超過 24 小時，自動恢復 AI
    humanHandoverUsers.delete(userId)
    logger.info(`[Meta] Handover expired for user ${userId}, resuming AI`)
    return false
  }

  return true
}

/**
 * 查詢用戶近期 AI 對話輪數
 */
async function getRecentRoundCount(platform: string, userId: string): Promise<number> {
  const supabase = getSupabase()
  const twentyFourHoursAgo = new Date(Date.now() - HANDOVER_DURATION_MS).toISOString()

  const { count, error } = await supabase
    .from('customer_service_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('platform', platform)
    .eq('platform_user_id', userId)
    .gte('created_at', twentyFourHoursAgo)

  if (error) {
    logger.error('[Meta] Round count query error:', error)
    return 0
  }

  return count ?? 0
}

/**
 * 透過 Graph API 回覆訊息，回傳 message_id
 */
async function sendReply(
  senderId: string,
  text: string,
  pageAccessToken: string | null
): Promise<string | null> {
  if (!pageAccessToken) {
    logger.warn('[Meta] PAGE_ACCESS_TOKEN not set, cannot reply')
    return null
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    logger.error('[Meta] Reply failed:', err)
    return null
  }

  const result = (await res.json()) as { message_id?: string }
  const messageId = result.message_id ?? null

  // 追蹤 AI 發出的 message ID
  if (messageId) {
    aiSentMessageIds.add(messageId)
    if (aiSentMessageIds.size > MAX_AI_SENT) {
      const first = aiSentMessageIds.values().next().value
      if (first) aiSentMessageIds.delete(first)
    }
  }

  return messageId
}

async function handleIncomingMessage(
  platform: string,
  event: MetaMessageEvent,
  pageAccessToken: string | null
) {
  // Facebook: sender.id, Instagram: sender.instagram_user_id
  const senderId = event.sender.id || event.sender.instagram_user_id || ''
  const messageText = event.message.text
  const messageId = event.message.mid

  // Skip if no sender ID (invalid Instagram message)
  if (!senderId) {
    logger.warn('[Meta] No sender ID found, skipping message', { platform })
    return
  }

  if (!messageText) return // 暫不處理附件

  // Message ID 去重
  if (processedMessages.has(messageId)) {
    logger.info(`[Meta] Duplicate message skipped: ${messageId}`)
    return
  }
  processedMessages.add(messageId)
  if (processedMessages.size > MAX_PROCESSED) {
    const first = processedMessages.values().next().value
    if (first) processedMessages.delete(first)
  }

  logger.info(`[Meta ${platform}] Message from ${senderId}: ${messageText}`)

  // 檢查是否已人工接管
  if (isHandedOver(senderId)) {
    logger.info(`[Meta] User ${senderId} is in human handover, skipping AI`)
    return
  }

  // 檢查是否觸發轉接關鍵字
  if (HANDOVER_KEYWORDS.some(kw => messageText.includes(kw))) {
    logger.info(`[Meta] Handover keyword detected from ${senderId}`)
    await sendReply(senderId, HANDOVER_MESSAGE, pageAccessToken)
    humanHandoverUsers.set(senderId, Date.now())
    return
  }

  // 檢查對話輪數
  const actualPlatform = platform === 'instagram' ? 'instagram' : 'messenger'
  const roundCount = await getRecentRoundCount(actualPlatform, senderId)
  if (roundCount >= MAX_AI_ROUNDS) {
    logger.info(`[Meta] User ${senderId} reached ${roundCount} rounds, triggering handover`)
    await sendReply(senderId, HANDOVER_MESSAGE, pageAccessToken)
    humanHandoverUsers.set(senderId, Date.now())
    return
  }

  try {
    // 呼叫 AI 客服（跟 LINE 共用同一套邏輯）
    // platform: 'messenger' for Facebook, 'instagram' for Instagram DM
    const aiResponse = await handleAICustomerService(
      actualPlatform,
      senderId,
      null, // Meta 不像 LINE 可以直接拿 displayName
      messageText
    )

    await sendReply(senderId, aiResponse, pageAccessToken)
  } catch (error) {
    logger.error('[Meta] AI response error:', error)
    await sendReply(senderId, '感謝您的訊息！我們已收到，將盡快回覆您。', pageAccessToken)
  }
}
