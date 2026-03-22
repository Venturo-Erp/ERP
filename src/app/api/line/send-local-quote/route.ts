import { NextRequest, NextResponse } from 'next/server'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
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
      totalPax,
      tourId,
      note,
      paxTiers, // [20, 30, 40]
    } = body

    // 把梯次和備註編碼到 URL
    const params = new URLSearchParams()
    if (paxTiers && Array.isArray(paxTiers)) {
      params.set('tiers', paxTiers.join(','))
    }
    if (note) {
      params.set('note', note)
    }
    if (totalPax) {
      params.set('pax', totalPax.toString())
    }

    const viewUrl = `https://app.cornertravel.com.tw/public/itinerary/${tourId}?${params.toString()}`

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

    // 建立 tour_requests 記錄（記錄發送）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 取得 workspace_id（從 tours 表）
    const { data: tour } = await supabase
      .from('tours')
      .select('workspace_id')
      .eq('id', tourId)
      .single()

    if (tour) {
      // 檢查是否已有此團的整包報價需求單
      const { data: existingRequest } = await supabase
        .from('tour_requests')
        .select('id')
        .eq('tour_id', tourId)
        .eq('request_scope', 'full_package')
        .maybeSingle()

      if (!existingRequest) {
        // 建立新的需求單記錄
        await supabase.from('tour_requests').insert({
          workspace_id: tour.workspace_id,
          tour_id: tourId,
          request_type: 'other',
          request_scope: 'full_package',
          supplier_name: 'Local 供應商',
          status: '已發送',
          sent_at: new Date().toISOString(),
          sent_via: 'Line',
          sent_to: lineGroupId,
          line_group_id: lineGroupId,
          note,
        })
      } else {
        // 更新現有記錄
        await supabase
          .from('tour_requests')
          .update({
            sent_at: new Date().toISOString(),
            sent_via: 'Line',
            sent_to: lineGroupId,
            line_group_id: lineGroupId,
            note,
          })
          .eq('id', existingRequest.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
