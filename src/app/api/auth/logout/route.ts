import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET || 'venturo_dev_jwt_secret_local_only')

/**
 * POST /api/auth/logout
 * 清除 httpOnly auth-token cookie 並清除 DB 的 active_jti（concurrent session 控制）
 */
export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
      const employeeId = payload.sub
      if (employeeId) {
        const supabase = getSupabaseAdminClient()
        await supabase
          .from('employees')
          .update({ active_jti: null })
          .eq('id', employeeId)

        await writeAuditLog({
          employee_id: employeeId,
          action: 'logout',
          resource_type: 'auth',
          resource_id: employeeId,
        })
      }
    } catch {
      // token 無效，繼續清 cookie
    }
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即過期
  })

  return response
}
