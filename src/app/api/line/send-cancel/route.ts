import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

    if (!token) {
      return NextResponse.json({ error: 'LINE token not configured' }, { status: 500 })
    }

    const {
      lineGroupId,
      tourCode,
      tourName,
      departureDate,
      supplierName,
      items, // [{ name, date, quantity, note }]
      reason,
      requestId,
    } = body

    if (!lineGroupId) {
      return NextResponse.json({ error: 'lineGroupId is required' }, { status: 400 })
    }

    // 取消項目列表
    const itemList = (items || [])
      .map((item: { name: string; date?: string; quantity?: number }) => 
        `• ${item.name}${item.date ? ` (${item.date})` : ''}${item.quantity ? ` x${item.quantity}` : ''}`
      )
      .join('\n')

    // 取消通知 Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `⚠️ 取消通知 - ${tourCode}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#DC2626', // 紅色警示
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '⚠️ 取消通知',
              color: '#FFFFFF',
              size: 'lg',
              weight: 'bold',
            },
            {
              type: 'text',
              text: '角落旅行社',
              color: '#FFFFFF',
              size: 'xs',
              margin: 'sm',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '18px',
          contents: [
            // 團資訊
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '團號', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: tourCode || '-', size: 'sm', weight: 'bold', flex: 4 },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '團名', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: tourName || '-', size: 'sm', flex: 4 },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '出發日', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: departureDate || '-', size: 'sm', flex: 4 },
              ],
            },
            // 分隔線
            {
              type: 'separator',
              margin: 'lg',
            },
            // 取消項目標題
            {
              type: 'text',
              text: '🚫 取消項目',
              size: 'sm',
              weight: 'bold',
              color: '#DC2626',
              margin: 'lg',
            },
            // 取消項目列表
            {
              type: 'text',
              text: itemList || '（無項目）',
              size: 'sm',
              wrap: true,
              margin: 'sm',
            },
            // 取消原因
            ...(reason ? [
              {
                type: 'separator',
                margin: 'lg',
              },
              {
                type: 'text',
                text: '📝 取消原因',
                size: 'sm',
                weight: 'bold',
                margin: 'lg',
              },
              {
                type: 'text',
                text: reason,
                size: 'sm',
                wrap: true,
                margin: 'sm',
                color: '#666666',
              },
            ] as const : []),
            // 致歉
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FEF2F2',
              cornerRadius: 'md',
              paddingAll: '12px',
              margin: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '🙏 造成不便，敬請見諒',
                  size: 'sm',
                  color: '#991B1B',
                },
              ],
            },
          ],
        },
      },
    }

    // 發送 LINE 訊息
    const lineRes = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineGroupId,
        messages: [flexMessage],
      }),
    })

    if (!lineRes.ok) {
      const errText = await lineRes.text()
      console.error('[send-cancel] LINE API error:', errText)
      return NextResponse.json({ error: 'LINE API failed', detail: errText }, { status: 500 })
    }

    // 更新 tour_requests 狀態為 cancelled
    if (requestId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await supabase
        .from('tour_requests')
        .update({
          status: 'cancelled',
          close_note: reason,
          closed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-cancel] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
