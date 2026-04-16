import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET || 'venturo_dev_jwt_secret_local_only')

/**
 * GET /api/auth/check-session
 * 驗證 jti 是否仍有效（與 DB 比對），用於 concurrent session 控制
 * 若另一裝置已登入（DB active_jti 已被更新），則回傳 401
 */
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      issuer: 'venturo-app',
    })

    const jti = payload.jti
    const employeeId = payload.sub

    if (!jti || !employeeId) {
      return NextResponse.json({ valid: false, reason: 'invalid_payload' }, { status: 401 })
    }

    // 比對 DB 的 active_jti
    const supabase = getSupabaseAdminClient()
    const { data: employee } = await supabase
      .from('employees')
      .select('active_jti, is_active')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      return NextResponse.json({ valid: false, reason: 'employee_not_found' }, { status: 401 })
    }

    if (!employee.is_active) {
      return NextResponse.json({ valid: false, reason: 'account_disabled' }, { status: 401 })
    }

    // active_jti 為 null 表示 session 未建立或已清除（例如已登出）
    if (!employee.active_jti) {
      return NextResponse.json({ valid: false, reason: 'session_cleared' }, { status: 401 })
    }

    // jti 不匹配 → 表示另一裝置已登入，此 session 已被取代
    if (employee.active_jti !== jti) {
      return NextResponse.json({ valid: false, reason: 'session_replaced' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 })
  }
}
