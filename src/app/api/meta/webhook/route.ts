import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'venturo_meta_webhook_2024'

/**
 * GET /api/meta/webhook — Meta Webhook 驗證
 * Meta 會發送 GET 請求來驗證 webhook endpoint
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
 * POST /api/meta/webhook — 接收 Meta 訊息事��
 * 處理 Messenger + Instagram DM 的訊息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Meta 要求必須在 20 秒內回覆 200，否則會重試
    // 所以先回 200，再非同步處理
    const object = body.object

    if (object === 'page' || object === 'instagram') {
      const entries = body.entry || []

      for (const entry of entries) {
        const messaging = entry.messaging || []

        for (const event of messaging) {
          if (event.message) {
            await handleIncomingMessage(object, event)
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

async function handleIncomingMessage(platform: string, event: MetaMessageEvent) {
  const senderId = event.sender.id
  const messageText = event.message.text

  if (!messageText) return // 暫不處理附件

  logger.info(`[Meta ${platform}] Message from ${senderId}: ${messageText}`)

  // TODO: 接入 AI 客服回覆
  // TODO: 儲存對話到 customer_service_conversations
  // TODO: 用 Graph API 回覆訊息

  // 目前先自動回覆確認收到
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN
  if (!pageAccessToken) {
    logger.warn('META_PAGE_ACCESS_TOKEN not set, cannot reply')
    return
  }

  try {
    await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text: '感謝您的訊息！我們已收到，將盡快回覆您。' },
      }),
    })
  } catch (error) {
    logger.error('Meta reply failed:', error)
  }
}
