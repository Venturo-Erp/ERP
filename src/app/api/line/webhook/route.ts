import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events = body.events || []

    for (const event of events) {
      // Bot 被加入群組 → 記錄 groupId
      if (event.type === 'join' && event.source?.type === 'group') {
        console.log('[LINE] Bot joined group:', event.source.groupId)
      }

      // 群組訊息 → 記錄 groupId（備用方式取得 groupId）
      if (event.source?.type === 'group') {
        console.log('[LINE] Group message from:', event.source.groupId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[LINE] Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// LINE 驗證用
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
