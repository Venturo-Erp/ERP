/**
 * LINE 需求單發送
 *
 * 用 Flex Message 發送需求單摘要到供應商 LINE 群組
 */

import { COMPANY_NAME } from '@/lib/tenant'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

interface RequirementItem {
  category: string
  title: string
  serviceDate?: string | null
  rooms?: { room_type: string; quantity: number }[]
}

interface SendRequirementParams {
  lineGroupId: string
  lineAccessToken: string
  senderName: string // 發送人姓名（業務員）
  tourCode: string
  tourName: string
  departureDate: string
  totalPax: number | null
  supplierName: string
  items: RequirementItem[]
  viewUrl?: string // 查看完整需求單的連結
  replyUrl?: string // 回覆報價的連結
}

const CATEGORY_EMOJI: Record<string, string> = {
  accommodation: '🏨',
  transport: '🚌',
  meal: '🍽️',
  activity: '🎫',
  other: '📦',
}

const CATEGORY_LABEL: Record<string, string> = {
  accommodation: '住宿',
  transport: '交通',
  meal: '餐食',
  activity: '活動',
  other: '其他',
}

export async function sendRequirementToLine(
  params: SendRequirementParams
): Promise<{ success: boolean; error?: string }> {
  const {
    lineGroupId,
    lineAccessToken,
    senderName,
    tourCode,
    tourName,
    departureDate,
    totalPax,
    supplierName,
    items,
    viewUrl,
    replyUrl,
  } = params

  // 建立項目內容
  const itemContents: Record<string, unknown>[] = []

  // 按類別分組
  const grouped: Record<string, RequirementItem[]> = {}
  for (const item of items) {
    const cat = item.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  for (const [cat, catItems] of Object.entries(grouped)) {
    const emoji = CATEGORY_EMOJI[cat] || '📦'
    const label = CATEGORY_LABEL[cat] || cat

    itemContents.push({
      type: 'text',
      text: `${emoji} ${label}`,
      size: 'sm',
      weight: 'bold',
      margin: 'md',
    })

    for (const item of catItems) {
      let desc = item.title || ''
      if (item.serviceDate) desc += `\n${item.serviceDate}`
      if (item.rooms && item.rooms.length > 0) {
        desc += '\n' + item.rooms.map(r => `${r.room_type} × ${r.quantity} 間`).join('、')
      }

      itemContents.push({
        type: 'text',
        text: desc,
        size: 'xs',
        color: '#666666',
        wrap: true,
      })
    }
  }

  // 建立 Flex Message
  const flexMessage = {
    type: 'flex' as const,
    altText: `📋 需求單 - ${tourCode} (${senderName} 發出)`,
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
            text: `${COMPANY_NAME} · ${senderName} 發出`,
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
        contents: [
          // 基本資訊
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '團號', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: tourCode, size: 'sm', weight: 'bold', flex: 4 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '團名', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: tourName, size: 'sm', flex: 4 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '出發', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: departureDate, size: 'sm', flex: 4 },
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
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '供應商', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: supplierName, size: 'sm', weight: 'bold', flex: 4 },
            ],
          },
          { type: 'separator' },
          // 項目列表
          ...itemContents,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          ...(viewUrl
            ? [
                {
                  type: 'button' as const,
                  action: { type: 'uri' as const, label: '📄 查看完整需求單', uri: viewUrl },
                  style: 'primary' as const,
                  color: '#B8860B',
                },
              ]
            : []),
          ...(replyUrl
            ? [
                {
                  type: 'button' as const,
                  action: { type: 'uri' as const, label: '✏️ 回覆報價', uri: replyUrl },
                  style: 'secondary' as const,
                },
              ]
            : []),
        ],
      },
    },
  }

  try {
    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify({
        to: lineGroupId,
        messages: [flexMessage],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `LINE API error: ${res.status} ${err}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
