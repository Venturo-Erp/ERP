import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'

interface LineConfig {
  workspace_id: string
  channel_access_token?: string
  channel_secret?: string
  bot_basic_id?: string
  bot_display_name?: string
  bot_user_id?: string
  webhook_url?: string
  is_connected: boolean
  setup_step: number
  [key: string]: unknown
}

/**
 * GET /api/line/setup — 取得當前 workspace 的 LINE 設定狀態
 */
export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    // 用 admin client 讀取，避免 RLS 阻擋（server 端已驗證 workspace）
    // 之前用 dynamicFrom（browser client）沒 session context，RLS 讀不到
    const admin = getSupabaseAdminClient()
    const { data: workspaceData } = await (admin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: LineConfig | null }> }
        }
      }
    })
      .from('workspace_line_config')
      .select(
        'setup_step, is_connected, bot_display_name, bot_basic_id, bot_user_id, webhook_url, connected_at'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (workspaceData) {
      return NextResponse.json(workspaceData)
    }

    return NextResponse.json({ setup_step: 0, is_connected: false })
  } catch (error) {
    logger.error('LINE setup GET error:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * POST /api/line/setup — 儲存 LINE 設定並測試連線
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const body = await req.json()
    const { action } = body

    const _supabase = getSupabaseAdminClient()

    // Step 2: 儲存 Messaging API credentials
    if (action === 'save_messaging') {
      const { channel_access_token, channel_secret } = body

      if (!channel_access_token || !channel_secret) {
        return NextResponse.json({ error: '請填寫完整' }, { status: 400 })
      }

      // 測試 token 是否有效
      const testRes = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${channel_access_token}` },
      })

      if (!testRes.ok) {
        return NextResponse.json({ error: 'Access Token 無效，請確認後重試' }, { status: 400 })
      }

      const botInfo = await testRes.json()

      // 找出第一個工作區 ID 或用當前工作區 ID
      // 這裡使用一個策略：如果有現有的設定，更新它；否則用當前工作區
      const { data: existingConfig } = await dynamicFrom('workspace_line_config')
        .select('workspace_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const targetWorkspaceId = existingConfig?.workspace_id || auth.data.workspaceId

      const { error: upsertError } = await dynamicFrom('workspace_line_config').upsert(
        {
          workspace_id: targetWorkspaceId,
          channel_access_token,
          channel_secret,
          bot_basic_id: botInfo.basicId || '',
          bot_display_name: botInfo.displayName || '',
          bot_user_id: botInfo.userId || '',
          setup_step: 2,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id' }
      )

      if (upsertError) {
        logger.error('LINE config upsert failed:', upsertError)
        return NextResponse.json({ error: '儲存設定失敗：' + upsertError.message }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        bot: { basicId: botInfo.basicId, displayName: botInfo.displayName },
      })
    }

    // Step 3: 設定 Webhook URL
    if (action === 'set_webhook') {
      // 找出第一個可用的設定
      const { data: config } = await dynamicFrom('workspace_line_config')
        .select('channel_access_token, workspace_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const lineConfig = config as unknown as LineConfig | null
      if (!lineConfig?.channel_access_token) {
        return NextResponse.json({ error: '請先完成 Step 2' }, { status: 400 })
      }

      const targetWorkspaceId = lineConfig.workspace_id

      // 多租戶：每個 workspace 有專屬的 webhook URL
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/line/webhook/${targetWorkspaceId}`

      // 設定 webhook
      const setRes = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineConfig.channel_access_token}`,
        },
        body: JSON.stringify({ endpoint: webhookUrl }),
      })

      if (!setRes.ok) {
        return NextResponse.json({ error: 'Webhook 設定失敗' }, { status: 400 })
      }

      // 測試 webhook
      const testRes = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineConfig.channel_access_token}`,
        },
        body: JSON.stringify({ endpoint: webhookUrl }),
      })

      const testResult = await testRes.json()

      await dynamicFrom('workspace_line_config')
        .update({
          webhook_url: webhookUrl,
          is_connected: testResult.success === true,
          connected_at: testResult.success ? new Date().toISOString() : null,
          setup_step: testResult.success ? 3 : 2,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', targetWorkspaceId)

      return NextResponse.json({
        ok: testResult.success,
        webhook_url: webhookUrl,
        test_result: testResult,
      })
    }

    // Step 4: 完成設定
    if (action === 'complete') {
      // 找出第一個可用的設定來更新
      const { data: existingConfig } = await dynamicFrom('workspace_line_config')
        .select('workspace_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (!existingConfig) {
        return NextResponse.json({ error: '找不到 LINE 設定' }, { status: 400 })
      }

      await dynamicFrom('workspace_line_config')
        .update({
          setup_step: 4,
          is_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', existingConfig.workspace_id)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error) {
    logger.error('LINE setup POST error:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
