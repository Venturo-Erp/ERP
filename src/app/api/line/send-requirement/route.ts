import { NextRequest, NextResponse } from 'next/server'
import { sendRequirementToLine } from '@/lib/line/send-requirement'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

    if (!token) {
      return NextResponse.json({ error: 'LINE token not configured' }, { status: 500 })
    }

    const result = await sendRequirementToLine({
      ...body,
      lineAccessToken: token,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
