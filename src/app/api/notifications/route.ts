import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function from(table: string) {
  const supabase = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table as any)
}

/**
 * GET /api/notifications
 * 查詢自己的通知（未讀優先）
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit')) || 20
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = from('notifications')
      .select('*')
      .eq('recipient_id', auth.data.employeeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) throw error

    // 未讀數
    const { count } = await from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', auth.data.employeeId)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: data || [],
      unread_count: count || 0,
    })
  } catch (error) {
    logger.error('查詢通知失敗:', error)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}

/**
 * POST /api/notifications
 * 發送通知（內部呼叫）
 *
 * Body: { recipient_id, title, message, module, type, action_url?, action_data? }
 * 或批量: { recipients: [id1, id2], ... }
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證：只允許內部呼叫或已登入用戶
    const internalSecret = request.headers.get('x-internal-secret')
    let senderWorkspaceId: string
    let senderId: string | null = null

    if (internalSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // 內部呼叫（webhook 等）
      const body = await request.json()
      senderWorkspaceId = body.workspace_id
      senderId = body.sender_id || null
    } else {
      const auth = await getServerAuth()
      if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })
      senderWorkspaceId = auth.data.workspaceId
      senderId = auth.data.employeeId
    }

    const body = await request.clone().json()
    const {
      recipient_id,
      recipients,
      title,
      message,
      module = 'system',
      type = 'info',
      action_url,
      action_data,
    } = body

    const recipientIds: string[] = recipients || (recipient_id ? [recipient_id] : [])

    if (recipientIds.length === 0 || !title) {
      return NextResponse.json({ error: '缺少 recipient_id 和 title' }, { status: 400 })
    }

    // 批量插入通知
    const notifications = recipientIds.map((rid: string) => ({
      workspace_id: senderWorkspaceId,
      recipient_id: rid,
      sender_id: senderId,
      module,
      type,
      title,
      message: message || null,
      action_url: action_url || null,
      action_data: action_data || {},
      channels_sent: ['web'],
    }))

    const { error: insertError } = await from('notifications').insert(notifications)
    if (insertError) throw insertError

    // LINE 推播（如果員工有綁定 LINE）
    const supabase = getSupabaseAdminClient()
    const { data: lineUsers } = await supabase
      .from('line_users')
      .select('user_id, employee_id')
      .in('employee_id', recipientIds)
      .not('user_id', 'is', null)

    if (lineUsers?.length) {
      // 查租戶的 LINE token
      const { data: lineConfig } = await from('workspace_line_config')
        .select('channel_access_token')
        .eq('workspace_id', senderWorkspaceId)
        .single()

      const token = (lineConfig as { channel_access_token?: string } | null)?.channel_access_token

      if (token) {
        for (const lu of lineUsers) {
          try {
            await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                to: lu.user_id,
                messages: [{ type: 'text', text: `${title}\n${message || ''}`.trim() }],
              }),
            })

            // 更新 channels_sent
            await from('notifications')
              .update({ channels_sent: ['web', 'line'] })
              .eq('recipient_id', lu.employee_id)
              .eq('title', title)
              .order('created_at', { ascending: false })
              .limit(1)
          } catch (err) {
            logger.error(`LINE 推播失敗 (${lu.user_id}):`, err)
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: recipientIds.length })
  } catch (error) {
    logger.error('發送通知失敗:', error)
    return NextResponse.json({ error: '發送失敗' }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications
 * 標記已讀
 * Body: { id: "單一" } 或 { all: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const body = await request.json()

    if (body.all) {
      await from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', auth.data.employeeId)
        .eq('is_read', false)
    } else if (body.id) {
      await from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', body.id)
        .eq('recipient_id', auth.data.employeeId)
    } else {
      return NextResponse.json({ error: '需要 id 或 all' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('標記已讀失敗:', error)
    return NextResponse.json({ error: '操作失敗' }, { status: 500 })
  }
}
