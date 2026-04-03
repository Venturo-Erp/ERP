import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/utils/logger'
import { handleMessagingAI } from '@/lib/messaging/ai-handler'
import { checkRateLimit } from '@/lib/rate-limit'

interface MessengerWebhookEntry {
  id: string
  time: number
  messaging?: Array<{
    sender: { id: string }
    recipient: { id: string }
    timestamp: number
    message?: {
      mid: string
      text?: string
      attachments?: Array<{
        type: string
        payload: { url?: string }
      }>
    }
  }>
}

interface InstagramWebhookEntry {
  id: string
  time: number
  messaging?: Array<{
    sender: { id: string }
    recipient: { id: string }
    timestamp: number
    message?: {
      mid: string
      text?: string
    }
  }>
}

const META_APP_SECRET = process.env.META_APP_SECRET || ''
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || ''

/**
 * 驗證 Meta Webhook 簽名
 */
function validateMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !META_APP_SECRET) return false
  try {
    const [algorithm, hash] = signature.split('=')
    if (algorithm !== 'sha256') return false
    
    const expectedHash = createHmac('SHA256', META_APP_SECRET)
      .update(rawBody)
      .digest('hex')
    
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))
  } catch {
    return false
  }
}

/**
 * Webhook 驗證（GET）- Meta 要求
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    logger.info('[Messaging] Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }
  
  logger.warn('[Messaging] Webhook verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * 處理 Messenger/Instagram 訊息（POST）
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = checkRateLimit(req, 'messaging-webhook', 100, 60_000)
    if (rateLimited) return rateLimited

    // 簽名驗證
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    
    if (!validateMetaSignature(rawBody, signature)) {
      logger.warn('[Messaging] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    
    // 判斷平台（Messenger or Instagram）
    const object = body.object
    if (object !== 'page' && object !== 'instagram') {
      return NextResponse.json({ error: 'Unsupported object type' }, { status: 400 })
    }

    const platform = object === 'instagram' ? 'instagram' : 'messenger'
    const entries: (MessengerWebhookEntry | InstagramWebhookEntry)[] = body.entry || []

    // 處理每個訊息
    for (const entry of entries) {
      const messaging = entry.messaging || []
      
      for (const event of messaging) {
        const senderId = event.sender?.id
        const messageText = event.message?.text
        
        if (!senderId || !messageText) continue

        // 背景處理 AI 回覆（不阻擋 webhook 回應）
        handleMessagingAI(platform, senderId, messageText, entry.id).catch((err) => {
          logger.error(`[Messaging] AI handler error:`, err)
        })
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.error('[Messaging] Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
