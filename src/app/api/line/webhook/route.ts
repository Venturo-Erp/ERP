import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/utils/logger'
import { handleAICustomerService } from '@/lib/line/ai-customer-service'
import { checkRateLimit } from '@/lib/rate-limit'

/** LINE Webhook event type (minimal) */
interface LineEvent {
  type: string
  source?: { userId?: string; type?: string }
  message?: { type?: string; text?: string; id?: string; contentProvider?: { type?: string } }
  replyToken?: string
  postback?: { data?: string }
}

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_SECRET = process.env.LINE_CHANNEL_SECRET || ''

/** 驗證 LINE Webhook 簽名 */
function validateSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !LINE_SECRET) return false
  try {
    const hash = createHmac('SHA256', LINE_SECRET).update(rawBody).digest('base64')
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}

/** 取得用戶資料 */
async function getUserProfile(userId: string): Promise<{
  displayName: string | null
  pictureUrl: string | null
  statusMessage: string | null
} | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    })
    if (res.ok) {
      const data = await res.json()
      return {
        displayName: data.displayName || null,
        pictureUrl: data.pictureUrl || null,
        statusMessage: data.statusMessage || null,
      }
    }
  } catch {}
  return null
}

/** 儲存用戶到 DB（follow 事件） */
async function saveUserToDb(
  userId: string,
  profile: {
    displayName: string | null
    pictureUrl: string | null
    statusMessage: string | null
  } | null
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) return

  // 先查詢 LINE Bot 屬於哪個 workspace（必需）
  let workspaceId: string | null = null

  try {
    const configRes = await fetch(
      `${supabaseUrl}/rest/v1/workspace_line_config?select=workspace_id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (configRes.ok) {
      const configs = await configRes.json()
      if (configs && configs.length > 0) {
        workspaceId = configs[0].workspace_id
      }
    }
  } catch (error) {
    logger.error('[LINE] Failed to get workspace config:', error)
  }

  if (!workspaceId) {
    logger.error('[LINE] No workspace config found, cannot save user')
    return
  }

  await fetch(`${supabaseUrl}/rest/v1/line_users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      user_id: userId,
      display_name: profile?.displayName,
      picture_url: profile?.pictureUrl,
      status_message: profile?.statusMessage,
      followed_at: new Date().toISOString(),
      unfollowed_at: null, // 重新追蹤時清除
      updated_at: new Date().toISOString(),
    }),
  })
}

/** 標記用戶取消追蹤 */
async function markUserUnfollowed(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) return

  await fetch(`${supabaseUrl}/rest/v1/line_users?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      unfollowed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  })
}

/** 處理 follow/unfollow 事件 */
async function processFollowEvent(event: LineEvent) {
  const userId = event.source?.userId
  if (!userId) return

  if (event.type === 'follow') {
    const profile = await getUserProfile(userId)
    logger.info(`[LINE] Follow: ${userId} | Name: ${profile?.displayName}`)
    await saveUserToDb(userId, profile)
  } else if (event.type === 'unfollow') {
    logger.info(`[LINE] Unfollow: ${userId}`)
    await markUserUnfollowed(userId)
  }
}

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

async function saveGroupToDb(
  groupId: string,
  groupName: string | null,
  memberCount: number | null
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return

  // 先查詢 LINE Bot 屬於哪個 workspace（必需）
  let workspaceId: string | null = null

  try {
    const configRes = await fetch(
      `${supabaseUrl}/rest/v1/workspace_line_config?select=workspace_id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (configRes.ok) {
      const configs = await configRes.json()
      if (configs && configs.length > 0) {
        workspaceId = configs[0].workspace_id
      }
    }
  } catch (error) {
    logger.error('[LINE] Failed to get workspace config:', error)
  }

  if (!workspaceId) {
    logger.error('[LINE] No workspace config found, cannot save group')
    return
  }

  await fetch(`${supabaseUrl}/rest/v1/line_groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
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
    logger.info(`[LINE] Group: ${groupId} | Name: ${groupName} | Members: ${memberCount}`)
    await saveGroupToDb(groupId, groupName, memberCount)
  } catch (err) {
    logger.error('[LINE] Background process error:', err)
  }
}

/** 處理客戶 LINE 綁定 */
async function processCustomerBinding(event: LineEvent) {
  const userId = event.source?.userId
  const text = event.message?.text?.trim() || ''

  // 檢查是否為客戶綁定指令：「綁定 C0001」
  const bindMatch = text.match(/^綁定[:\s]*(C\d+)$/i)
  if (!bindMatch || !userId) return false

  const customerCode = bindMatch[1].toUpperCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return false

  try {
    // 查找客戶
    const findRes = await fetch(
      `${supabaseUrl}/rest/v1/customers?code=eq.${customerCode}&select=id,name,phone`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const customers = await findRes.json()

    if (!customers || customers.length === 0) {
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: `❌ 找不到客戶編號 ${customerCode}，請確認後重試` }],
        }),
      })
      return true
    }

    const customer = customers[0]

    // 更新客戶的 LINE User ID
    await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        line_user_id: userId,
        line_linked_at: new Date().toISOString(),
      }),
    })

    const custName = customer.name || customerCode

    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `✅ ${custName}，LINE 綁定成功！\n\n之後有行程更新或報價回覆，會透過這裡通知您 📱`,
          },
        ],
      }),
    })

    logger.info(`[LINE] Customer binding: ${customerCode} -> ${userId}`)
    return true
  } catch (error) {
    logger.error('[LINE] Customer binding error:', error)
    return false
  }
}

/** 處理員工 LINE 綁定 */
async function processEmployeeBinding(event: LineEvent) {
  const userId = event.source?.userId
  const text = event.message?.text?.trim() || ''

  // 檢查是否為綁定指令：「綁定 E001」或「綁定:E001」（但不是 C 開頭的客戶）
  const bindMatch = text.match(/^綁定[:\s]*([A-Za-z0-9]+)$/i)
  if (!bindMatch || !userId) return false

  // C 開頭是客戶，交給 processCustomerBinding 處理
  if (bindMatch[1].toUpperCase().startsWith('C')) return false

  const employeeCode = bindMatch[1].toUpperCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return false

  try {
    // 查找員工（欄位名是 employee_number）
    const findRes = await fetch(
      `${supabaseUrl}/rest/v1/employees?employee_number=eq.${employeeCode}&select=id,display_name,chinese_name,english_name`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const employees = await findRes.json()

    if (!employees || employees.length === 0) {
      // 員工不存在，回覆錯誤
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: `❌ 找不到員工編號 ${employeeCode}，請確認後重試` }],
        }),
      })
      return true
    }

    const employee = employees[0]

    // 更新員工的 LINE User ID
    await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${employee.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ line_user_id: userId }),
    })

    const empName =
      employee.chinese_name || employee.display_name || employee.english_name || employeeCode

    // 回覆成功
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `✅ ${empName}，LINE 綁定成功！\n\n之後指派給你的任務會透過這裡通知你 📱`,
          },
        ],
      }),
    })

    logger.info(`[LINE] Employee binding: ${employeeCode} -> ${userId}`)
    return true
  } catch (err) {
    logger.error('[LINE] Employee binding error:', err)
    return false
  }
}

/** 背景處理保險 PDF（不阻擋回應） */
async function processInsurancePDF(event: LineEvent) {
  try {
    // 呼叫 insurance-auto-save API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/line/insurance-auto-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
    })

    const result = await res.json()
    logger.info('[LINE] Insurance result:', result)
  } catch (err) {
    logger.error('[LINE] Insurance process error:', err)
  }
}

/** 處理「完成」指令 */

/** 儲存對話到資料庫 */
async function saveConversationToDb(
  platform: string,
  platformUserId: string,
  userMessage: string,
  aiResponse: string,
  userDisplayName: string | null
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) return

  // 先查詢 LINE Bot 屬於哪個 workspace（必需）
  let workspaceId: string | null = null

  try {
    const configRes = await fetch(
      `${supabaseUrl}/rest/v1/workspace_line_config?select=workspace_id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (configRes.ok) {
      const configs = await configRes.json()
      if (configs && configs.length > 0) {
        workspaceId = configs[0].workspace_id
      }
    }
  } catch (error) {
    logger.error('[LINE] Failed to get workspace config:', error)
  }

  if (!workspaceId) {
    logger.error('[LINE] No workspace config found, cannot save conversation')
    return
  }

  try {
    // 只儲存現有的欄位
    const conversationData: any = {
      platform: platform,
      platform_user_id: platformUserId,
      user_display_name: userDisplayName,
      user_message: userMessage,
      ai_response: aiResponse,
      created_at: new Date().toISOString(),
    }

    // 可以添加一些 AI 分析的欄位（如果有的話）
    // 例如：intent, sentiment 等

    await fetch(`${supabaseUrl}/rest/v1/customer_service_conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(conversationData),
    })

    logger.info(`[LINE] Conversation saved: ${platformUserId} - ${userMessage.substring(0, 30)}...`)
  } catch (error) {
    logger.error('[LINE] Save conversation error:', error)
  }
}

/** 處理 LINE 打卡 */
async function processClockIn(event: LineEvent): Promise<boolean> {
  const text = event.message?.text?.trim() || ''
  const userId = event.source?.userId
  if (!userId) return false

  // 支援的打卡指令
  const clockInKeywords = ['上班', '打卡', '上班打卡']
  const clockOutKeywords = ['下班', '下班打卡']

  let action: 'clock_in' | 'clock_out' | null = null
  if (clockInKeywords.includes(text)) action = 'clock_in'
  else if (clockOutKeywords.includes(text)) action = 'clock_out'
  if (!action) return false

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return false

  try {
    // 查找已綁定的員工
    const lineUserRes = await fetch(
      `${supabaseUrl}/rest/v1/line_users?select=employee_id,workspace_id&user_id=eq.${userId}&employee_id=not.is.null`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const lineUsers = await lineUserRes.json()
    if (!lineUsers?.length || !lineUsers[0].employee_id) {
      await replyText(
        event.replyToken!,
        '❌ 你尚未綁定員工帳號，請先傳送員工編號進行綁定（例如：E001）'
      )
      return true
    }

    const { employee_id, workspace_id } = lineUsers[0]

    // 呼叫打卡 API（以 internal secret 驗證身份）
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const clockRes = await fetch(`${baseUrl}/api/hr/clock-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': supabaseKey,
      },
      body: JSON.stringify({
        employee_id,
        workspace_id,
        action,
        source: 'line',
      }),
    })

    const result = await clockRes.json()

    if (clockRes.ok) {
      const emoji = action === 'clock_in' ? '✅' : '🏠'
      await replyText(event.replyToken!, `${emoji} ${result.message}`)
    } else {
      await replyText(event.replyToken!, `⚠️ ${result.error}`)
    }
    return true
  } catch (error) {
    logger.error('[LINE] 打卡處理錯誤:', error)
    await replyText(event.replyToken!, '❌ 打卡失敗，請稍後再試')
    return true
  }
}

/** LINE 回覆文字訊息 */
async function replyText(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

/** 處理 AI 客服訊息 */
async function handleAIMessage(event: LineEvent) {
  try {
    const userId = event.source?.userId
    const userMessage = event.message?.text?.trim()

    if (!userId || !userMessage) return

    // 1. 先檢查景點選擇

    // 2. 取得用戶資訊
    const profile = await getUserProfile(userId)

    // 3. 呼叫 AI 客服
    const aiResponse = await handleAICustomerService(
      'line',
      userId,
      profile?.displayName || null,
      userMessage
    )

    // 4. 儲存對話到資料庫
    await saveConversationToDb(
      'line',
      userId,
      userMessage,
      aiResponse,
      profile?.displayName || null
    )

    // 5. 回覆用戶
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: aiResponse }],
      }),
    })

    logger.info(
      `[LINE AI] User: ${userId} | Message: ${userMessage} | Response: ${aiResponse.substring(0, 50)}...`
    )
  } catch (err) {
    logger.error('[LINE AI] Handle message error:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = checkRateLimit(req, 'line-webhook', 100, 60_000)
    if (rateLimited) return rateLimited

    // 簽名驗證
    const rawBody = await req.text()
    const signature = req.headers.get('x-line-signature')
    if (!validateSignature(rawBody, signature)) {
      logger.warn('[LINE] Invalid signature')
      return NextResponse.json({ status: 'error', message: 'invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const events = body.events || []

    for (const event of events) {
      const source = event.source || {}

      // follow/unfollow 事件 → 記錄用戶
      if (event.type === 'follow' || event.type === 'unfollow') {
        await processFollowEvent(event)
      }

      // Postback 事件 → 景點選擇按鈕
      if (event.type === 'postback') {
      }

      // 私人訊息 → 檢查綁定指令（客戶或員工）或 AI 客服
      if (source.type === 'user' && event.type === 'message' && event.message?.type === 'text') {
        // 確保用戶記錄存在（補漏：follow 事件可能遺漏）
        const msgUserId = source.userId
        if (msgUserId) {
          const profile = await getUserProfile(msgUserId)
          await saveUserToDb(msgUserId, profile)
        }

        // 先嘗試打卡指令（上班/下班）
        const isClockIn = await processClockIn(event)
        if (!isClockIn) {
          // 再嘗試客戶綁定（C 開頭）
          const isCustomerBinding = await processCustomerBinding(event)
          if (!isCustomerBinding) {
            // 再嘗試員工綁定（非 C 開頭）
            const isEmployeeBinding = await processEmployeeBinding(event)
            if (!isEmployeeBinding) {
              // 都不是綁定 → AI 客服回覆（內含景點選擇邏輯）
              await handleAIMessage(event)
            }
          }
        }
      }

      if (source.type === 'group') {
        const groupId = source.groupId

        // Bot 加入群組 or 群組訊息 → 記錄 groupId
        if (event.type === 'join' || event.type === 'message') {
          await processGroupEvent(groupId)
        }

        // 檔案訊息 → 檢查是否為保險 PDF
        if (event.type === 'message' && event.message?.type === 'file') {
          await processInsurancePDF(event)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.error('[LINE] Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// LINE 驗證用
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
