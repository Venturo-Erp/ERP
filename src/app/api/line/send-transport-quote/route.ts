import { NextRequest, NextResponse } from 'next/server'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

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
      requestId,
      vehicleDesc,
      note,
    } = body

    // 遊覽車報價連結（帶 requestId，單一性）
    const viewUrl = `https://app.cornertravel.com.tw/public/transport-quote/${tourId}/${requestId}`

    // Flex Message：遊覽車需求單
    const flexMessage = {
      type: 'flex',
      altText: `🚌 遊覽車需求單 - ${tourCode}`,
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
              text: '🚌 遊覽車需求單',
              color: '#FFFFFF',
              size: 'lg',
              weight: 'bold',
            },
            {
              type: 'text',
              text: `${COMPANY_NAME}・William 發出`,
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
                {
                  type: 'text',
                  text: tourName || '-',
                  size: 'sm',
                  wrap: true,
                  flex: 4,
                },
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
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '人數', size: 'sm', color: '#888888', flex: 2 },
                { type: 'text', text: totalPax ? `${totalPax} 人` : '-', size: 'sm', flex: 4 },
              ],
            },
            ...(vehicleDesc
              ? [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: '車型', size: 'sm', color: '#888888', flex: 2 },
                      { type: 'text', text: vehicleDesc, size: 'sm', wrap: true, flex: 4 },
                    ],
                  },
                ]
              : []),
            ...(note
              ? [
                  {
                    type: 'separator',
                    margin: 'md',
                  },
                  {
                    type: 'text',
                    text: '需求說明',
                    size: 'xs',
                    color: '#888888',
                    margin: 'md',
                  },
                  {
                    type: 'text',
                    text: note,
                    size: 'sm',
                    wrap: true,
                    margin: 'sm',
                  },
                ]
              : []),
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
              action: {
                type: 'uri',
                label: '查看詳情並報價',
                uri: viewUrl,
              },
              style: 'primary',
              color: '#B8860B',
            },
            {
              type: 'text',
              text: '請填寫：總車資、是否含小費/過路費/停車費',
              size: 'xxs',
              color: '#999999',
              align: 'center',
              margin: 'sm',
              wrap: true,
            },
          ],
        },
      },
    }

    const linePayload = {
      to: lineGroupId,
      messages: [flexMessage],
    }

    const lineRes = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(linePayload),
    })

    if (!lineRes.ok) {
      const err = await lineRes.text()
      console.error('[send-transport-quote] LINE API error:', err)
      return NextResponse.json({ error: 'LINE API failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[send-transport-quote] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
