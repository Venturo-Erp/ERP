/**
 * 發送遊覽車預訂確認 API
 * POST /api/transport/send-booking
 *
 * 成交後發給車行，請他們確認並回傳司機資訊
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      item_id, // tour_itinerary_items.id
      group_id, // LINE 群組 ID
      tour_code,
      tour_name,
      departure_date,
      participants,
      supplier_name,
      vehicle_type,
      total_cost,
    } = body

    if (!item_id || !group_id) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 建立確認連結
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cornertravel.com.tw'
    const confirmUrl = `${baseUrl}/transport/${item_id}/confirm`

    // Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `【預訂確認】${tour_name}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚌 遊覽車預訂確認',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#2563EB',
          paddingAll: '15px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '團號', color: '#666666', flex: 2 },
                { type: 'text', text: tour_code || '-', weight: 'bold', flex: 4 },
              ],
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '團名', color: '#666666', flex: 2 },
                { type: 'text', text: tour_name || '-', flex: 4 },
              ],
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '出發日', color: '#666666', flex: 2 },
                { type: 'text', text: departure_date || '-', flex: 4 },
              ],
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '人數', color: '#666666', flex: 2 },
                { type: 'text', text: `${participants || 0} 人`, flex: 4 },
              ],
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '車款', color: '#666666', flex: 2 },
                { type: 'text', text: vehicle_type || '-', flex: 4 },
              ],
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '成交金額', color: '#666666', flex: 2 },
                {
                  type: 'text',
                  text: total_cost ? `¥${total_cost.toLocaleString()}` : '-',
                  weight: 'bold',
                  color: '#2563EB',
                  flex: 4,
                },
              ],
              margin: 'md',
            },
            { type: 'separator', margin: 'xl' },
            {
              type: 'text',
              text: '請點擊下方按鈕填寫司機資訊',
              size: 'sm',
              color: '#666666',
              margin: 'xl',
              wrap: true,
            },
          ],
          paddingAll: '20px',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '📝 填寫司機資訊',
                uri: confirmUrl,
              },
              style: 'primary',
              color: '#2563EB',
            },
          ],
          paddingAll: '15px',
        },
      },
    }

    // 發送 LINE 訊息
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: group_id,
        messages: [flexMessage],
      }),
    })

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text()
      logger.error('LINE API error:', errorText)
      return NextResponse.json({ error: 'LINE 發送失敗', details: errorText }, { status: 500 })
    }

    // 更新 DB：標記已發送預訂確認
    await supabase
      .from('tour_itinerary_items')
      .update({
        supplier_name,
        description: `預訂確認已發送`,
      })
      .eq('id', item_id)

    return NextResponse.json({
      success: true,
      message: '預訂確認已發送',
      confirmUrl,
    })
  } catch (error) {
    logger.error('Send booking error:', error)
    return NextResponse.json({ error: '發送失敗', details: String(error) }, { status: 500 })
  }
}
