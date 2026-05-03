/**
 * /api/hr/missed-clock-requests
 * GET → 列出
 * POST → 員工提交補打卡申請
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })
    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') ?? 'workspace'
    const status = url.searchParams.get('status')
    const supabase = getSupabaseAdminClient()
    let q = supabase
      .from('missed_clock_requests')
      .select(
        'id, employee_id, date, clock_type, requested_time, reason, status, approved_at, reject_reason, created_at, employees!missed_clock_requests_employee_id_fkey (display_name, employee_number)'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .order('date', { ascending: false })
      .limit(50)
    if (scope === 'mine') q = q.eq('employee_id', auth.data.employeeId)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) {
      logger.error('查 missed_clock 失敗', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('GET missed_clock 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

interface CreatePayload {
  date: string
  clock_type: 'clock_in' | 'clock_out'
  requested_time: string
  reason: string
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: 401 })
    const body = (await req.json()) as CreatePayload
    if (!body.date || !body.clock_type || !body.requested_time || !body.reason?.trim()) {
      return NextResponse.json({ error: '所有欄位必填' }, { status: 400 })
    }
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('missed_clock_requests')
      .insert({
        workspace_id: auth.data.workspaceId,
        employee_id: auth.data.employeeId,
        date: body.date,
        clock_type: body.clock_type,
        requested_time: body.requested_time,
        reason: body.reason.trim(),
        status: 'pending',
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      })
      .select('id')
      .single()
    if (error) {
      logger.error('insert missed_clock 失敗', error)
      return NextResponse.json({ error: '送審失敗' }, { status: 500 })
    }
    return NextResponse.json({ id: data.id, status: 'pending' })
  } catch (err) {
    logger.error('POST missed_clock 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
