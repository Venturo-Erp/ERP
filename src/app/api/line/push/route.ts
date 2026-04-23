/**
 * LINE 推播訊息
 * POST /api/line/push
 *
 * body: { userId: string, message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { fetchWithTimeout } from '@/lib/external/fetch-with-timeout'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing userId or message' }, { status: 400 })
    }

    const res = await fetchWithTimeout('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error('LINE Push failed:', errorText)
      return NextResponse.json({ error: 'Push failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('LINE Push error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
