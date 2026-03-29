/**
 * 取得目前 LINE 登入用戶
 * GET /api/auth/line/me
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const lineUserCookie = cookieStore.get('line_user')

  if (!lineUserCookie) {
    return NextResponse.json({ user: null })
  }

  try {
    const user = JSON.parse(lineUserCookie.value)
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('line_user')
  return NextResponse.json({ ok: true })
}
