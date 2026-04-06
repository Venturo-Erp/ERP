import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/utils/logger'
import { handleAICustomerService } from '@/lib/line/ai-customer-service'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'venturo_meta_webhook_2024'
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || ''
const APP_SECRET = process.env.META_APP_SECRET || ''

/**
 * 驗證 Meta Webhook 簽章 (X-Hub-Signature-256)
 */
function validateSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) return false
  try {
    const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/**
 * GET /api/meta/webhook — Meta Webhook 驗證
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('Meta webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  logger.warn('Meta webhook verification failed', { mode, token })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST /api/meta/webhook — 接收 Meta 訊息事件
 * 處理 Messenger + Instagram DM 的訊息
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // 驗證簽章
    const signature = request.headers.get('x-hub-signature-256')
    if (APP_SECRET && !validateSignature(rawBody, signature)) {
      logger.warn('[Meta] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const object = body.object

    if (object === 'page' || object === 'instagram') {
      const entries = body.entry || []

      for (const entry of entries) {
        const messaging = entry.messaging || []

        for (const event of messaging) {
          if (event.message) {
            // 不 await，先回 200 再處理（Meta 要求 20 秒內回覆）
            handleIncomingMessage(object, event).catch(err => {
              logger.error('[Meta] handleIncomingMessage error:', err)
            })
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.error('Meta webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

interface MetaMessageEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message: {
    mid: string
    text?: string
    attachments?: Array<{
      type: string
      payload: { url: string }
    }>
  }
}

/**
 * 透過 Graph API 回覆訊息
 */
async function sendReply(senderId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) {
    logger.warn('[Meta] PAGE_ACCESS_TOKEN not set, cannot reply')
    return
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
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
  }
}

async function handleIncomingMessage(platform: string, event: MetaMessageEvent) {
  const senderId = event.sender.id
  const messageText = event.message.text

  if (!messageText) return // 暫不處理附件

  logger.info(`[Meta ${platform}] Message from ${senderId}: ${messageText}`)

  try {
    // 呼叫 AI 客服（跟 LINE 共用同一套邏輯）
    const aiResponse = await handleAICustomerService(
      'messenger',
      senderId,
      null, // Meta 不像 LINE 可以直接拿 displayName
      messageText
    )

    await sendReply(senderId, aiResponse)
  } catch (error) {
    logger.error('[Meta] AI response error:', error)
    await sendReply(senderId, '感謝您的訊息！我們已收到，將盡快回覆您。')
  }
}
