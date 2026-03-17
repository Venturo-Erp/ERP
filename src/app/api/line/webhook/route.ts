import { NextRequest, NextResponse } from 'next/server'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

async function getGroupName(groupId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    })
    if (res.ok) {
      const data = await res.json()
      return data.groupName || null
    }
  } catch {}
  return null
}

async function getGroupMemberCount(groupId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/members/count`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    })
    if (res.ok) {
      const data = await res.json()
      return data.count || null
    }
  } catch {}
  return null
}

async function saveGroupToDb(groupId: string, groupName: string | null, memberCount: number | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return

  await fetch(`${supabaseUrl}/rest/v1/line_groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      group_id: groupId,
      group_name: groupName,
      member_count: memberCount,
      updated_at: new Date().toISOString(),
    }),
  })
}

/** 背景處理群組事件（不阻擋回應） */
async function processGroupEvent(groupId: string) {
  try {
    const groupName = await getGroupName(groupId)
    const memberCount = await getGroupMemberCount(groupId)
    console.log(`[LINE] Group: ${groupId} | Name: ${groupName} | Members: ${memberCount}`)
    await saveGroupToDb(groupId, groupName, memberCount)
  } catch (err) {
    console.error('[LINE] Background process error:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events = body.events || []

    // 先立即回 200，再背景處理
    const bgTasks: Promise<void>[] = []

    for (const event of events) {
      const source = event.source || {}

      if (source.type === 'group') {
        const groupId = source.groupId

        // Bot 加入群組 or 群組訊息 → 背景記錄 groupId
        if (event.type === 'join' || event.type === 'message') {
          bgTasks.push(processGroupEvent(groupId))
        }
      }
    }

    // 用 waitUntil 讓背景任務在回應後繼續執行（Vercel Edge/Serverless 支援）
    if (bgTasks.length > 0) {
      // Vercel serverless: 直接 await，但因為 LINE verify 用空 events，不影響
      // 真實 event: 最多幾秒，Vercel function timeout 10s 足夠
      Promise.allSettled(bgTasks).catch(() => {})
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[LINE] Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// LINE 驗證用
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
