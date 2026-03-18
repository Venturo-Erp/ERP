import { NextResponse } from 'next/server'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

export async function POST(request: Request) {
  try {
    const {
      groupId,
      tourCode,
      tourName,
      departureDate,
      totalPax,
      supplierName,
      vehicleDesc,
      days,
      note,
      requestId,
    } = await request.json()

    if (!groupId || !tourCode) {
      return NextResponse.json({ success: false, error: '缺少必要參數' }, { status: 400 })
    }

    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!

    // 組合天數文字
    const daysList = (days as { dayNumber: number; date: string; route: string }[])
      .map(d => `  Day ${d.dayNumber}（${d.date}）${d.route}`)
      .join('\n')

    const textMsg = `🚌 交通需求單
📋 ${tourCode} ${tourName}
📅 出發：${departureDate || '-'}
👥 人數：${totalPax || '-'} 人
🏢 車行：${supplierName}
${vehicleDesc ? `🚍 車型：${vehicleDesc}\n` : ''}
📍 用車行程：
${daysList}
${note ? `\n📝 備註：${note}` : ''}

${requestId ? `📎 線上報價：https://app.cornertravel.com.tw/public/request/${requestId}\n` : ''}請協助報價，謝謝！`

    const lineRes = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: textMsg }],
      }),
    })

    if (!lineRes.ok) {
      const err = await lineRes.text()
      return NextResponse.json({ success: false, error: `LINE API: ${err}` })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[send-transport]', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
