import { NextRequest, NextResponse } from 'next/server'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { to, messages } = await request.json()

    if (!to || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'LINE Token 未設定' }, { status: 500 })
    }

    // 發送 LINE Push Message
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('LINE Push API 錯誤:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'LINE 發送失敗' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LINE Push 錯誤:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
