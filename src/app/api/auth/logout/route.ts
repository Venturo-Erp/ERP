import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * 清除 httpOnly auth-token cookie
 */
export async function POST() {
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
