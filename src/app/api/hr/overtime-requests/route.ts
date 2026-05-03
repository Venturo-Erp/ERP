/**
 * /api/hr/overtime-requests
 * GET → 列出（預設 workspace 全部、帶 ?scope=mine 拿自己）
 * POST → 員工提交加班申請
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') ?? 'workspace'
    const status = url.searchParams.get('status')

    const supabase = getSupabaseAdminClient()
    let q = supabase
      .from('overtime_requests')
      .select(
        'id, employee_id, date, start_time, end_time, hours, overtime_type, reason, status, approved_at, reject_reason, created_at, employees!overtime_requests_employee_id_fkey (display_name, employee_number)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .order('date', { ascending: false })
      .limit(50)

    if (scope === 'mine') q = q.eq('employee_id', auth.data.employeeId)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) {
      logger.error('查 overtime_requests 失敗', error)
      return NextResponse.json({ error: '查加班失敗' }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET overtime 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

interface CreatePayload {
  date: string
  start_time: string
  end_time: string
  overtime_type?: 'weekday' | 'rest_day' | 'holiday' | 'official_holiday'
  reason?: string
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const body = (await req.json()) as CreatePayload
    if (!body.date || !body.start_time || !body.end_time) {
      return NextResponse.json({ error: '日期 / 起訖時間必填' }, { status: 400 })
    }

    // 算時數
    const [sh, sm] = body.start_time.split(':').map(Number)
    const [eh, em] = body.end_time.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    const hours = (endMin - startMin) / 60
    if (hours <= 0) {
      return NextResponse.json({ error: '結束時間必須晚於開始時間' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('overtime_requests')
      .insert({
        workspace_id: auth.data.workspaceId,
        employee_id: auth.data.employeeId,
        date: body.date,
        start_time: body.start_time,
        end_time: body.end_time,
        hours: Math.round(hours * 100) / 100,
        overtime_type: body.overtime_type ?? 'weekday',
        reason: body.reason ?? null,
        status: 'pending',
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('insert overtime 失敗', error)
      return NextResponse.json({ error: '送審失敗' }, { status: 500 })
    }
    return NextResponse.json({ id: data.id, status: 'pending' })
  } catch (err) {
    logger.error('POST overtime 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
