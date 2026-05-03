/**
 * /api/hr/clock-in
 *
 * GET  → 拿今日打卡狀態（dashboard widget 用）
 * POST → 新增打卡（clock_in / clock_out）
 *
 * 設計決策（vault: erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
 *   - GPS 不在範圍不擋打卡、寫 is_remote = true 由 admin review
 *   - 重複打卡（同 type 同日）回 200 + 既有資料、不報錯（防連點）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

interface AttendanceSettings {
  work_start_time: string
  work_end_time: string
  late_threshold_minutes: number
  require_gps: boolean
  gps_latitude: number | null
  gps_longitude: number | null
  gps_radius_meters: number
}

interface ClockStatusResponse {
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  status: string | null
  is_remote: boolean
  late_minutes: number
}

const EARTH_RADIUS_M = 6371000

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

function calcLateMinutes(clockAt: Date, workStart: string, threshold: number): number {
  const [hh, mm] = workStart.split(':').map(Number)
  const startToday = new Date(clockAt)
  startToday.setHours(hh, mm, 0, 0)
  const diffMin = Math.floor((clockAt.getTime() - startToday.getTime()) / 60000)
  return Math.max(0, diffMin - threshold)
}

/** GET 今日打卡狀態 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: records, error } = await supabase
      .from('clock_records')
      .select('clock_type, clock_at, status, is_remote, late_minutes')
      .eq('employee_id', auth.data.employeeId)
      .eq('clock_date', today)
      .order('clock_at', { ascending: true })

    if (error) {
      logger.error('查 clock_records 失敗', error)
      return NextResponse.json({ error: '查打卡狀態失敗' }, { status: 500 })
    }

    const clockIn = records?.find(r => r.clock_type === 'clock_in')
    const clockOut = records?.findLast(r => r.clock_type === 'clock_out') ?? null

    const inTime = clockIn ? new Date(clockIn.clock_at) : null
    const outTime = clockOut ? new Date(clockOut.clock_at) : null
    const workHours =
      inTime && outTime
        ? Math.round(((outTime.getTime() - inTime.getTime()) / 3600000) * 10) / 10
        : null

    const response: ClockStatusResponse = {
      clock_in: inTime ? inTime.toISOString().slice(11, 19) : null,
      clock_out: outTime ? outTime.toISOString().slice(11, 19) : null,
      work_hours: workHours,
      status: clockIn?.status ?? null,
      is_remote: !!clockIn?.is_remote || !!clockOut?.is_remote,
      late_minutes: clockIn?.late_minutes ?? 0,
    }

    return NextResponse.json(response)
  } catch (err) {
    logger.error('GET /api/hr/clock-in 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

interface ClockPayload {
  action: 'clock_in' | 'clock_out'
  source?: 'web' | 'mobile' | 'line'
  gps_latitude?: number
  gps_longitude?: number
  gps_accuracy_meters?: number
  note?: string
}

/** POST 新增打卡 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const body = (await req.json()) as ClockPayload
    if (!body?.action || !['clock_in', 'clock_out'].includes(body.action)) {
      return NextResponse.json({ error: 'action 必須是 clock_in 或 clock_out' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // 防連點：同日同 type 已存在 → 回既有資料
    const { data: existing } = await supabase
      .from('clock_records')
      .select('id, clock_at, status, is_remote, late_minutes')
      .eq('employee_id', auth.data.employeeId)
      .eq('clock_date', today)
      .eq('clock_type', body.action)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        message: body.action === 'clock_in' ? '已上班' : '已下班',
        record_id: existing.id,
        existing: true,
      })
    }

    // 拿 workspace 打卡設定
    const { data: settings } = await supabase
      .from('workspace_attendance_settings')
      .select('work_start_time, work_end_time, late_threshold_minutes, require_gps, gps_latitude, gps_longitude, gps_radius_meters')
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    const s = (settings ?? {
      work_start_time: '09:00',
      work_end_time: '18:00',
      late_threshold_minutes: 0,
      require_gps: false,
      gps_latitude: null,
      gps_longitude: null,
      gps_radius_meters: 500,
    }) as AttendanceSettings

    // GPS 判定（不擋、只標記）
    let isWithinGeofence: boolean | null = null
    let isRemote = false
    if (
      body.gps_latitude != null &&
      body.gps_longitude != null &&
      s.gps_latitude != null &&
      s.gps_longitude != null
    ) {
      const dist = distanceMeters(
        body.gps_latitude,
        body.gps_longitude,
        s.gps_latitude,
        s.gps_longitude
      )
      isWithinGeofence = dist <= s.gps_radius_meters
      isRemote = !isWithinGeofence
    } else if (s.require_gps) {
      isRemote = true
    }

    // 遲到判定
    const now = new Date()
    let lateMinutes = 0
    let status: 'normal' | 'late' = 'normal'
    if (body.action === 'clock_in') {
      lateMinutes = calcLateMinutes(now, s.work_start_time, s.late_threshold_minutes)
      if (lateMinutes > 0) status = 'late'
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('clock_records')
      .insert({
        workspace_id: auth.data.workspaceId,
        employee_id: auth.data.employeeId,
        clock_type: body.action,
        clock_at: now.toISOString(),
        clock_date: today,
        source: body.source ?? 'web',
        gps_latitude: body.gps_latitude ?? null,
        gps_longitude: body.gps_longitude ?? null,
        gps_accuracy_meters: body.gps_accuracy_meters ?? null,
        is_within_geofence: isWithinGeofence,
        is_remote: isRemote,
        status,
        late_minutes: lateMinutes,
        note: body.note ?? null,
        created_by: auth.data.employeeId,
        updated_by: auth.data.employeeId,
      })
      .select('id, clock_at, status, is_remote, late_minutes')
      .single()

    if (insertErr) {
      logger.error('insert clock_records 失敗', insertErr)
      return NextResponse.json({ error: '打卡失敗' }, { status: 500 })
    }

    const messageParts: string[] = []
    messageParts.push(body.action === 'clock_in' ? '上班打卡成功' : '下班打卡成功')
    if (lateMinutes > 0) messageParts.push(`遲到 ${lateMinutes} 分鐘`)
    if (isRemote) messageParts.push('外勤打卡（已通知主管）')

    return NextResponse.json({
      message: messageParts.join('、'),
      record_id: inserted.id,
      status: inserted.status,
      is_remote: inserted.is_remote,
      late_minutes: inserted.late_minutes,
    })
  } catch (err) {
    logger.error('POST /api/hr/clock-in 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
