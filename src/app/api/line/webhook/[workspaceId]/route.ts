import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { fetchWithTimeout } from '@/lib/external/fetch-with-timeout'

/**
 * 多租戶 LINE Webhook
 * POST /api/line/webhook/:workspaceId
 *
 * 每個租戶有自己的 webhook URL，帶 workspace ID。
 * 從 workspace_line_config 查該租戶的 channel_secret / channel_access_token。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. 查詢租戶的 LINE 設定
    const supabase = getSupabaseAdminClient()
    const { data: config } = await supabase
      .from('workspace_line_config' as never)
      .select('channel_access_token, channel_secret, bot_user_id, workspace_id')
      .eq('workspace_id', workspaceId)
      .single()

    const lineConfig = config as {
      channel_access_token: string
      channel_secret: string
      bot_user_id: string
      workspace_id: string
    } | null

    if (!lineConfig?.channel_access_token || !lineConfig?.channel_secret) {
      logger.warn(`[LINE Multi] workspace ${workspaceId} 尚未設定 LINE`)
      return NextResponse.json({ error: 'LINE 尚未設定' }, { status: 404 })
    }

    // 2. 驗證簽名
    const rawBody = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!signature) {
      return NextResponse.json({ error: '缺少簽名' }, { status: 401 })
    }

    try {
      const hash = createHmac('SHA256', lineConfig.channel_secret).update(rawBody).digest('base64')
      if (!timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
        return NextResponse.json({ error: '簽名驗證失敗' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: '簽名驗證失敗' }, { status: 401 })
    }

    // 3. 解析事件
    const body = JSON.parse(rawBody)
    const events = body.events || []

    for (const event of events) {
      const source = event.source || {}
      const userId = source.userId

      // 只處理私人文字訊息
      if (source.type !== 'user' || event.type !== 'message' || event.message?.type !== 'text') {
        continue
      }

      const text = event.message.text?.trim() || ''

      // 打卡指令
      const clockInKeywords = ['上班', '打卡', '上班打卡']
      const clockOutKeywords = ['下班', '下班打卡']

      let clockAction: 'clock_in' | 'clock_out' | null = null
      if (clockInKeywords.includes(text)) clockAction = 'clock_in'
      else if (clockOutKeywords.includes(text)) clockAction = 'clock_out'

      if (clockAction && userId) {
        await handleClockIn(supabase, lineConfig, event, userId, workspaceId, clockAction)
        continue
      }

      // 員工綁定（E 開頭的編號）
      if (/^E\d+$/i.test(text) && userId) {
        await handleEmployeeBinding(supabase, lineConfig, event, userId, workspaceId, text)
        continue
      }

      // 其他訊息可以加 AI 客服等...
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.error(`[LINE Multi] Webhook error for workspace ${workspaceId}:`, error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

/** LINE 驗證用 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

// ==========================================
// 內部處理函數
// ==========================================

interface LineConfig {
  channel_access_token: string
  channel_secret: string
  workspace_id: string
}

/** 回覆訊息 */
async function reply(config: LineConfig, replyToken: string, text: string) {
  await fetchWithTimeout('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.channel_access_token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

/** 處理打卡 */
async function handleClockIn(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  config: LineConfig,
  event: { replyToken?: string },
  lineUserId: string,
  workspaceId: string,
  action: 'clock_in' | 'clock_out'
) {
  // 查找已綁定的員工（限同一 workspace）
  const { data: lineUsers } = await supabase
    .from('line_users')
    .select('employee_id')
    .eq('user_id', lineUserId)
    .eq('workspace_id', workspaceId)
    .not('employee_id', 'is', null)
    .limit(1)

  if (!lineUsers?.length || !lineUsers[0].employee_id) {
    await reply(
      config,
      event.replyToken!,
      '❌ 你尚未綁定員工帳號，請先傳送員工編號進行綁定（例如：E001）'
    )
    return
  }

  const employeeId = lineUsers[0].employee_id as string

  // 呼叫打卡 API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/hr/clock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      employee_id: employeeId,
      workspace_id: workspaceId,
      action,
      source: 'line',
    }),
  })

  const result = await res.json()
  const emoji = action === 'clock_in' ? '✅' : '🏠'
  await reply(
    config,
    event.replyToken!,
    res.ok ? `${emoji} ${result.message}` : `⚠️ ${result.error}`
  )
}

/** 處理員工綁定 */
async function handleEmployeeBinding(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  config: LineConfig,
  event: { replyToken?: string },
  lineUserId: string,
  workspaceId: string,
  employeeCode: string
) {
  // 查找員工
  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name, chinese_name, employee_number')
    .eq('workspace_id', workspaceId)
    .ilike('employee_number', employeeCode)
    .limit(1)

  if (!employees?.length) {
    await reply(config, event.replyToken!, `❌ 找不到員工編號 ${employeeCode}，請確認後重試`)
    return
  }

  const employee = employees[0]

  // 取得 LINE 用戶資料
  const profileRes = await fetchWithTimeout(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
    headers: { Authorization: `Bearer ${config.channel_access_token}` },
  })
  const profile = profileRes.ok ? await profileRes.json() : null

  // 更新或建立 line_users 紀錄
  // line_users.user_id 是全域 UNIQUE、`onConflict: 'user_id'` 會踩到別 workspace 的 row
  // → 改成「先查 + 限定 workspace_id」、避免覆蓋其他租戶資料
  const profilePayload = {
    user_id: lineUserId,
    workspace_id: workspaceId,
    employee_id: employee.id,
    display_name: profile?.displayName || null,
    picture_url: profile?.pictureUrl || null,
    followed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 注意：line_users.user_id 全域 UNIQUE、跨租戶查是設計、為了避免覆蓋其他租戶綁定
  // 下方 line 237 會檢查 workspace_id 是否吻合、不吻合則拒絕
  const { data: existingLineUser } = await supabase
    .from('line_users')
    .select('id, workspace_id')
    .eq('user_id', lineUserId)
    .maybeSingle()

  if (existingLineUser) {
    // 已存在：限定原 workspace 才能更新（避免跨租戶覆寫）
    if (existingLineUser.workspace_id && existingLineUser.workspace_id !== workspaceId) {
      logger.warn(
        `[LINE] line_users user_id=${lineUserId} 已綁在 workspace ${existingLineUser.workspace_id}、忽略 ${workspaceId} 的綁定請求`
      )
      await reply(
        config,
        event.replyToken!,
        `❌ 此 LINE 帳號已綁定其他租戶、請先解除原綁定`
      )
      return
    }
    await supabase
      .from('line_users')
      .update(profilePayload)
      .eq('workspace_id', workspaceId)
      .eq('user_id', lineUserId)
  } else {
    await supabase.from('line_users').insert(profilePayload)
  }

  const name = employee.display_name || employee.chinese_name || employee.employee_number
  await reply(
    config,
    event.replyToken!,
    `✅ 綁定成功！\n\n員工：${name}（${employee.employee_number}）\n\n現在你可以傳送「上班」或「下班」來打卡了`
  )
}
