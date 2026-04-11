import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/** 取得台灣時間的日期和時間 */
function getTaiwanDateTime() {
  const now = new Date()
  const twOffset = 8 * 60 * 60 * 1000
  const twDate = new Date(now.getTime() + twOffset)
  const date = twDate.toISOString().split('T')[0]
  const time = twDate.toISOString().split('T')[1].slice(0, 8)
  return { date, time }
}

/** 動態表名查詢（繞過型別限制，新表尚未更新 types） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function from(table: string) {
  const supabase = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table as any)
}

interface ClockInBody {
  action: 'clock_in' | 'clock_out'
  latitude?: number
  longitude?: number
  source?: 'web' | 'line' | 'api'
  notes?: string
  employee_id?: string
  workspace_id?: string
}

/**
 * POST /api/hr/clock-in
 *
 * 網頁打卡：透過 session 驗證身份
 * LINE 打卡：透過 x-internal-secret header 驗證（由 webhook 呼叫）
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClockInBody = await request.json()
    const { action, latitude, longitude, source = 'web', notes } = body

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json({ error: 'action 必須是 clock_in 或 clock_out' }, { status: 400 })
    }

    let employeeId: string
    let workspaceId: string

    // LINE / 內部呼叫：用 service role key 驗證
    const internalSecret = request.headers.get('x-internal-secret')
    if (internalSecret === process.env.SUPABASE_SERVICE_ROLE_KEY && body.employee_id && body.workspace_id) {
      employeeId = body.employee_id
      workspaceId = body.workspace_id
    } else {
      // 網頁打卡：從 session 取得身份
      const auth = await getServerAuth()
      if (!auth.success) {
        return NextResponse.json({ error: '請先登入' }, { status: 401 })
      }
      employeeId = auth.data.employeeId
      workspaceId = auth.data.workspaceId
    }

    const { date: today, time: currentTime } = getTaiwanDateTime()

    // 取得租戶打卡設定
    const { data: settingsRow } = await from('workspace_attendance_settings')
      .select('work_start_time, standard_work_hours')
      .eq('workspace_id', workspaceId)
      .single()

    const settings = settingsRow as { work_start_time?: string; standard_work_hours?: number } | null

    // 不存在時自動建立預設值
    if (!settings) {
      await from('workspace_attendance_settings')
        .upsert({ workspace_id: workspaceId }, { onConflict: 'workspace_id' })
    }

    const workStartTime = settings?.work_start_time || '09:00:00'
    const standardHours = Number(settings?.standard_work_hours) || 8

    // 查詢今天是否已有紀錄
    const supabase = getSupabaseAdminClient()
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, clock_in, clock_out')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (action === 'clock_in') {
      if (existing?.clock_in) {
        return NextResponse.json(
          { error: '今天已經打過上班卡了', clock_in: existing.clock_in },
          { status: 409 }
        )
      }

      const status = currentTime > workStartTime ? 'late' : 'present'
      const locationNote = latitude && longitude
        ? `[${source}] ${latitude.toFixed(6)},${longitude.toFixed(6)}`
        : `[${source}]`
      const fullNotes = notes ? `${locationNote} ${notes}` : locationNote

      if (existing) {
        await supabase
          .from('attendance_records')
          .update({ clock_in: currentTime, status, notes: fullNotes })
          .eq('id', existing.id)
      } else {
        await supabase.from('attendance_records').insert({
          workspace_id: workspaceId,
          employee_id: employeeId,
          date: today,
          clock_in: currentTime,
          status,
          notes: fullNotes,
        })
      }

      const timeDisplay = currentTime.slice(0, 5)
      return NextResponse.json({
        success: true,
        action: 'clock_in',
        time: currentTime,
        date: today,
        status,
        message: status === 'late'
          ? `上班打卡成功（遲到）- ${timeDisplay}`
          : `上班打卡成功 - ${timeDisplay}`,
      })
    }

    if (action === 'clock_out') {
      if (!existing?.clock_in) {
        return NextResponse.json(
          { error: '今天尚未打上班卡，請先打上班卡' },
          { status: 400 }
        )
      }
      if (existing.clock_out) {
        return NextResponse.json(
          { error: '今天已經打過下班卡了', clock_out: existing.clock_out },
          { status: 409 }
        )
      }

      const clockInParts = (existing.clock_in as string).split(':').map(Number)
      const clockOutParts = currentTime.split(':').map(Number)
      const workHours =
        (clockOutParts[0] - clockInParts[0]) +
        (clockOutParts[1] - clockInParts[1]) / 60 +
        (clockOutParts[2] - clockInParts[2]) / 3600
      const overtimeHours = Math.max(0, workHours - standardHours)

      await supabase
        .from('attendance_records')
        .update({
          clock_out: currentTime,
          work_hours: Math.round(workHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
        })
        .eq('id', existing.id)

      const timeDisplay = currentTime.slice(0, 5)
      return NextResponse.json({
        success: true,
        action: 'clock_out',
        time: currentTime,
        date: today,
        work_hours: Math.round(workHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        message: `下班打卡成功 - ${timeDisplay}（工時 ${workHours.toFixed(1)} 小時）`,
      })
    }

    return NextResponse.json({ error: 'action 必須是 clock_in 或 clock_out' }, { status: 400 })
  } catch (error) {
    logger.error('打卡 API 錯誤:', error)
    return NextResponse.json({ error: '打卡失敗，請稍後再試' }, { status: 500 })
  }
}

/**
 * GET /api/hr/clock-in
 * 查詢自己今日打卡狀態（從 session 取得身份）
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const { date: twToday } = getTaiwanDateTime()
    const queryDate = searchParams.get('date') || twToday

    const { data } = await supabase
      .from('attendance_records')
      .select('id, clock_in, clock_out, work_hours, overtime_hours, status, notes')
      .eq('employee_id', auth.data.employeeId)
      .eq('date', queryDate)
      .single()

    return NextResponse.json({
      date: queryDate,
      clock_in: data?.clock_in || null,
      clock_out: data?.clock_out || null,
      work_hours: data?.work_hours || null,
      overtime_hours: data?.overtime_hours || null,
      status: data?.status || null,
    })
  } catch (error) {
    logger.error('查詢打卡狀態錯誤:', error)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}
