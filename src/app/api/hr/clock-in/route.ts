import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ClockInRequest {
  employee_id: string
  workspace_id: string
  action: 'clock_in' | 'clock_out'
  latitude?: number
  longitude?: number
  source?: 'web' | 'line' | 'api'
  notes?: string
}

/**
 * 打卡 API
 * POST /api/hr/clock-in
 *
 * 支援：網頁打卡、LINE 打卡
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClockInRequest = await request.json()
    const { employee_id, workspace_id, action, latitude, longitude, source = 'web', notes } = body

    if (!employee_id || !workspace_id || !action) {
      return NextResponse.json(
        { error: '缺少必要參數：employee_id, workspace_id, action' },
        { status: 400 }
      )
    }

    // 取得台灣時間
    const now = new Date()
    const twTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
    const today = twTime.toISOString().split('T')[0]
    const currentTime = twTime.toTimeString().slice(0, 8) // HH:MM:SS

    // 取得租戶打卡設定（上班時間等）
    const { data: settings } = await supabase
      .from('workspace_attendance_settings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single()

    const workStartTime = settings?.work_start_time || '09:00'

    // 查詢今天是否已有紀錄
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, clock_in, clock_out')
      .eq('employee_id', employee_id)
      .eq('date', today)
      .single()

    if (action === 'clock_in') {
      if (existing?.clock_in) {
        return NextResponse.json(
          {
            error: '今天已經打過上班卡了',
            clock_in: existing.clock_in,
          },
          { status: 409 }
        )
      }

      // 判斷是否遲到
      const status = currentTime > workStartTime ? 'late' : 'present'

      const locationNote = latitude && longitude
        ? `[${source}] ${latitude.toFixed(6)},${longitude.toFixed(6)}`
        : `[${source}]`
      const fullNotes = notes ? `${locationNote} ${notes}` : locationNote

      if (existing) {
        // 有紀錄但沒打上班卡（例如請假後補打）
        await supabase
          .from('attendance_records')
          .update({
            clock_in: currentTime,
            status,
            notes: fullNotes,
          })
          .eq('id', existing.id)
      } else {
        // 新建紀錄
        await supabase.from('attendance_records').insert({
          workspace_id,
          employee_id,
          date: today,
          clock_in: currentTime,
          status,
          notes: fullNotes,
        })
      }

      return NextResponse.json({
        success: true,
        action: 'clock_in',
        time: currentTime,
        date: today,
        status,
        message: status === 'late'
          ? `上班打卡成功（遲到）- ${currentTime}`
          : `上班打卡成功 - ${currentTime}`,
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
          {
            error: '今天已經打過下班卡了',
            clock_out: existing.clock_out,
          },
          { status: 409 }
        )
      }

      // 計算工時
      const clockInDate = new Date(`1970-01-01T${existing.clock_in}`)
      const clockOutDate = new Date(`1970-01-01T${currentTime}`)
      const workHours = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60)
      const overtimeHours = Math.max(0, workHours - 8)

      await supabase
        .from('attendance_records')
        .update({
          clock_out: currentTime,
          work_hours: Math.round(workHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
        })
        .eq('id', existing.id)

      return NextResponse.json({
        success: true,
        action: 'clock_out',
        time: currentTime,
        date: today,
        work_hours: Math.round(workHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        message: `下班打卡成功 - ${currentTime}（工時 ${workHours.toFixed(1)} 小時）`,
      })
    }

    return NextResponse.json({ error: 'action 必須是 clock_in 或 clock_out' }, { status: 400 })
  } catch (error) {
    console.error('打卡 API 錯誤:', error)
    return NextResponse.json({ error: '打卡失敗，請稍後再試' }, { status: 500 })
  }
}

/**
 * GET /api/hr/clock-in?employee_id=xxx&date=2026-04-11
 * 查詢今日打卡狀態
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const date = searchParams.get('date')

    if (!employeeId) {
      return NextResponse.json({ error: '缺少 employee_id' }, { status: 400 })
    }

    const now = new Date()
    const twTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
    const queryDate = date || twTime.toISOString().split('T')[0]

    const { data } = await supabase
      .from('attendance_records')
      .select('id, clock_in, clock_out, work_hours, overtime_hours, status, notes')
      .eq('employee_id', employeeId)
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
    console.error('查詢打卡狀態錯誤:', error)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}
