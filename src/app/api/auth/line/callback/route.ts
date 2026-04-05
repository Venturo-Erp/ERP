/**
 * LINE Login Callback
 * GET /api/auth/line/callback?code=xxx&state=xxx
 * 
 * LINE 授權後跳回這裡，取得用戶資料後重導向原頁面
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET!
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`
  : 'https://erp.venturo.tw/api/auth/line/callback'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // 用戶取消授權
  if (error) {
    logger.error('LINE Login error:', error)
    return NextResponse.redirect(new URL('/p/wishlist', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/p/wishlist', request.url))
  }

  // 解析 state
  let redirect = '/p/wishlist'
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    redirect = stateData.redirect || '/p/wishlist'
  } catch {
    // ignore
  }

  try {
    // 1. 用 code 換取 access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK_URL,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET,
      }),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      logger.error('Token exchange failed:', errorText)
      return NextResponse.redirect(new URL(redirect, request.url))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // 2. 取得用戶資料
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileRes.ok) {
      logger.error('Profile fetch failed')
      return NextResponse.redirect(new URL(redirect, request.url))
    }

    const profile: LineProfile = await profileRes.json()

    // 3. 存到 cookie（7 天）
    const cookieStore = await cookies()
    cookieStore.set('line_user', JSON.stringify({
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // 4. 重導向回原頁面
    return NextResponse.redirect(new URL(redirect, request.url))

  } catch (error) {
    logger.error('LINE Login callback error:', error)
    return NextResponse.redirect(new URL(redirect, request.url))
  }
}
