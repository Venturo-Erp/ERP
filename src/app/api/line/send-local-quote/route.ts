import { NextRequest, NextResponse } from 'next/server'

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
      totalPax,
      tourId,
    } = body

    const viewUrl = `https://app.cornertravel.com.tw/public/itinerary/${tourId}`

    // 簡化版 Flex Message：團資訊 + 人數 + 查看按鈕（不顯示供應商、不列內容）
    const flexMessage = {
      type: 'flex',
      altText: `📋 需求單 - ${tourCode}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#B8860B',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '📋 需求單',
              color: '#FFFFFF',
              size: 'lg',
              weight: 'bold',
            },
            {
              type: 'text',
              text: '角落旅行社・William 發出',
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
                { type: 'text', text: '出發', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: departureDate || '-', size: 'sm', flex: 4 },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '人數', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: `${totalPax || '-'} 人`, size: 'sm', flex: 4 },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          paddingAll: '15px',
          contents: [
            {
              type: 'button',
              action: { type: 'uri', label: '📄 查看需求內容', uri: viewUrl },
              style: 'primary',
              color: '#B8860B',
              height: 'sm',
            },
          ],
        },
      },
    }

    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineGroupId,
        messages: [flexMessage],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `LINE API error: ${res.status} ${err}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
