import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      lineGroupId,
      tourCode,
      tourName,
      departureDate,
      totalPax,
      tourId,
      supplierName,
      activitys,
      note,
    } = body

    // 建立需求單記錄
    const { data: request, error: insertError } = await supabase
      .from('tour_requests')
      .insert({
        tour_id: tourId,
        request_type: 'activity',
        supplier_name: supplierName,
        items: activitys,
        note,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_via: 'line',
        sent_to: lineGroupId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('建立需求單失敗:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const requestId = request.id

    // 建立公開連結
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cornertravel.com.tw'}/public/activity-quote/${tourId}/${requestId}`

    // 組成 LINE Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `活動需求單 - ${tourName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 活動需求單',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#B8860B',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: tourName,
              weight: 'bold',
              size: 'md',
              wrap: true,
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '團號',
                      color: '#999999',
                      size: 'sm',
                      flex: 0,
                      wrap: false,
                    },
                    {
                      type: 'text',
                      text: tourCode,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '活動供應商',
                      color: '#999999',
                      size: 'sm',
                      flex: 0,
                    },
                    {
                      type: 'text',
                      text: supplierName,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '出發日',
                      color: '#999999',
                      size: 'sm',
                      flex: 0,
                    },
                    {
                      type: 'text',
                      text: departureDate,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '人數',
                      color: '#999999',
                      size: 'sm',
                      flex: 0,
                    },
                    {
                      type: 'text',
                      text: `${totalPax} 人`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '活動數',
                      color: '#999999',
                      size: 'sm',
                      flex: 0,
                    },
                    {
                      type: 'text',
                      text: `${activitys.length} 種房型`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '查看需求單',
                uri: publicUrl,
              },
              color: '#B8860B',
            },
          ],
          flex: 0,
        },
      },
    }

    // 發送到 LINE
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineGroupId,
        messages: [flexMessage],
      }),
    })

    if (!lineResponse.ok) {
      const lineError = await lineResponse.text()
      console.error('LINE API 錯誤:', lineError)
      return NextResponse.json({ error: 'LINE 發送失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, requestId, publicUrl })
  } catch (error) {
    console.error('發送活動需求單失敗:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
