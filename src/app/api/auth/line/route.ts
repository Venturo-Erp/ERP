/**
 * LINE Login 起始點
 * GET /api/auth/line?redirect=/p/wishlist/thailand
 * 
 * 導向 LINE 授權頁面，授權後會回到 callback
 */

import { NextRequest, NextResponse } from 'next/server'

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`
  : 'https://erp.venturo.tw/api/auth/line/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const redirect = searchParams.get('redirect') || '/p/wishlist'
  
  // state 參數：存要跳轉的頁面 + 隨機字串防 CSRF
  const state = Buffer.from(JSON.stringify({
    redirect,
    nonce: Math.random().toString(36).slice(2),
  })).toString('base64')

  // LINE Login 授權 URL
  const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', LINE_LOGIN_CHANNEL_ID)
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', 'profile openid')

  return NextResponse.redirect(authUrl.toString())
}
