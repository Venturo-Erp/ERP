import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function from(table: string) {
  return getSupabaseAdminClient().from(table as any)
}

type RequestType = 'leave' | 'overtime' | 'missed_clock'
type Action = 'approve' | 'reject'

const TABLE_MAP: Record<RequestType, string> = {
  leave: 'leave_requests',
  overtime: 'overtime_requests',
  missed_clock: 'missed_clock_requests',
}

const LABEL_MAP: Record<RequestType, string> = {
  leave: '請假',
  overtime: '加班',
  missed_clock: '補打卡',
}

/**
 * POST /api/hr/approval
 * 審核申請（請假/加班/補打卡）
 *
 * Body: { request_type, request_id, action, reject_reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const body = await request.json()
    const { request_type, request_id, action, reject_reason } = body as {
      request_type: RequestType
      request_id: string
      action: Action
      reject_reason?: string
    }

    if (!request_type || !request_id || !action) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const table = TABLE_MAP[request_type]
    if (!table) {
      return NextResponse.json({ error: '無效的申請類型' }, { status: 400 })
    }

    // 查詢申請
    const { data: req } = await from(table)
      .select('id, employee_id, status')
      .eq('id', request_id)
      .single()

    if (!req) {
      return NextResponse.json({ error: '找不到申請' }, { status: 404 })
    }

    const reqData = req as unknown as { id: string; employee_id: string; status: string }

    if (reqData.status !== 'pending') {
      return NextResponse.json({ error: '此申請已被處理' }, { status: 409 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: Record<string, unknown> = {
      status: newStatus,
      approved_by: auth.data.employeeId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (action === 'reject' && reject_reason) {
      updateData.reject_reason = reject_reason
    }

    await from(table).update(updateData).eq('id', request_id)

    // 如果是補打卡且核准，自動更新出勤紀錄
    if (request_type === 'missed_clock' && action === 'approve') {
      const { data: mcReq } = await from('missed_clock_requests')
        .select('date, clock_type, requested_time, employee_id')
        .eq('id', request_id)
        .single()

      if (mcReq) {
        const mc = mcReq as unknown as {
          date: string
          clock_type: string
          requested_time: string
          employee_id: string
        }
        const supabase = getSupabaseAdminClient()
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('employee_id', mc.employee_id)
          .eq('date', mc.date)
          .single()

        if (existing) {
          await supabase
            .from('attendance_records')
            .update({ [mc.clock_type]: mc.requested_time })
            .eq('id', existing.id)
        } else if (mc.clock_type === 'clock_in') {
          await supabase.from('attendance_records').insert({
            workspace_id: auth.data.workspaceId,
            employee_id: mc.employee_id,
            date: mc.date,
            clock_in: mc.requested_time,
            status: 'present',
            notes: '[補打卡]',
          })
        }
      }
    }

    // 如果是請假且核准，更新假餘額
    if (request_type === 'leave' && action === 'approve') {
      const { data: leaveReq } = await from('leave_requests')
        .select('employee_id, leave_type_id, days, start_date')
        .eq('id', request_id)
        .single()

      if (leaveReq) {
        const lr = leaveReq as unknown as {
          employee_id: string
          leave_type_id: string
          days: number
          start_date: string
        }
        const year = new Date(lr.start_date).getFullYear()

        const { data: balance } = await from('leave_balances')
          .select('id, used_days')
          .eq('employee_id', lr.employee_id)
          .eq('leave_type_id', lr.leave_type_id)
          .eq('year', year)
          .single()

        if (balance) {
          const b = balance as unknown as { id: string; used_days: number }
          await from('leave_balances')
            .update({ used_days: b.used_days + lr.days })
            .eq('id', b.id)
        }
      }
    }

    // 發通知給申請人
    const label = LABEL_MAP[request_type]
    const resultText = action === 'approve' ? '已核准' : '已駁回'
    const notifyTitle = `${label}申請${resultText}`
    const notifyMessage =
      action === 'reject' && reject_reason ? `原因：${reject_reason}` : undefined

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        recipient_id: reqData.employee_id,
        workspace_id: auth.data.workspaceId,
        sender_id: auth.data.employeeId,
        title: notifyTitle,
        message: notifyMessage,
        module: 'hr',
        type: 'info',
        action_url: request_type === 'leave' ? '/hr/leave' : '/hr/attendance',
      }),
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    logger.error('審核 API 錯誤:', error)
    return NextResponse.json({ error: '審核失敗' }, { status: 500 })
  }
}
