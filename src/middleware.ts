import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { verifyQuickLoginToken } from '@/lib/auth/quick-login-token'

// JWT Secret - Production 環境必須設定環境變數
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production')
}
const JWT_SECRET_KEY = JWT_SECRET || 'venturo_dev_jwt_secret_local_only'

/**
 * Next.js Middleware - 伺服器端路由保護
 *
 * 功能：
 * 1. 檢查登入狀態（驗證 auth-token cookie）
 * 2. 驗證 JWT token 有效性和過期時間
 * 3. 保護需要認證的路由
 * 4. 重定向未登入或 token 無效的使用者到登入頁
 */

/**
 * 驗證 token 是否有效
 * 支援 JWT 格式、base64 編碼格式和 Quick-Login Token
 */
async function verifyAuthToken(token: string): Promise<boolean> {
  // 處理 quick-login token 格式（帶 HMAC 簽名驗證）
  if (token.startsWith('quick-login-')) {
    return await verifyQuickLoginToken(token)
  }

  // 優先嘗試 JWT 驗證（新格式，有簽名）
  try {
    const secret = new TextEncoder().encode(JWT_SECRET_KEY)
    await jwtVerify(token, secret, {
      issuer: 'venturo-app',
    })
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth-token')
  const { pathname } = request.nextUrl

  // 根路由（Landing Page）為精確匹配
  if (pathname === '/') {
    return NextResponse.next()
  }

  // 公開路由：不需要登入即可訪問（prefix 匹配）
  const publicPaths = [
    // === 頁面 ===
    '/landing',
    '/login',
    '/confirm', // 報價確認頁面（客戶公開連結）
    '/public', // 供應商公開回覆頁面（用 token 驗證）
    '/view', // 公開行程檢視頁面
    '/p/', // 公開頁面（客製化、行程、報名等）
    '/game', // 遊戲辦公室

    // === 認證 API ===
    '/api/auth', // 登入/註冊/token
    '/api/health', // 健康檢查

    // === Webhook（第三方伺服器呼叫，有各自驗證機制）===
    '/api/line/webhook', // LINE webhook（有 signature 驗證）
    '/api/meta/webhook', // Meta webhook（有 verify token）
    '/api/linkpay/callback', // LinkPay 回調
    '/api/linkpay/webhook', // LinkPay webhook

    // === Cron Job（Vercel 排程，需在 handler 裡驗證 CRON_SECRET）===
    '/api/cron', // Vercel Cron（handler 內要檢查 Authorization header）

    // === 公開 API（有各自的 token/secret 驗證）===
    '/api/itineraries', // 公開行程 API（給 /view 頁面使用）
    '/api/contracts/sign', // 公開合約簽署（用 contractId 驗證）
    '/api/quotes/confirmation/customer', // 客戶報價確認（用 token 驗證）
    '/api/d', // 短網址下載（signed URL）

    // === App API（Bearer token 驗證）===
    '/api/my', // App API
    '/api/trips', // App 行程 API
    '/api/eyeline', // 旅人眼線 API
    '/api/join-trip', // 加入行程 API

    // === 客戶端 API（LINE 用戶操作）===
    '/api/customers/by-line', // LINE 用戶查詢
    '/api/customers/link-line', // LINE 綁定
    '/api/customers/match', // 客戶比對

    // === 靜態資源 ===
    '/_next',
    '/favicon.ico',
    '/manifest.json',
  ]

  // 檢查是否為公開路由
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // 建立重定向到登入頁的 URL
  const loginUrl = new URL('/login', request.url)
  if (pathname !== '/dashboard') {
    loginUrl.searchParams.set('redirect', pathname)
  }

  // 檢查是否有 token
  if (!authCookie?.value) {
    return NextResponse.redirect(loginUrl)
  }

  // 驗證 token 有效性
  const isValid = await verifyAuthToken(authCookie.value)

  if (!isValid) {
    // Token 無效或過期，清除 cookie 並重定向到登入頁
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth-token')
    return response
  }

  // Token 有效，允許訪問
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路由，除了：
     * - _next/static (靜態檔案)
     * - _next/image (圖片優化)
     * - favicon.ico (網站圖標)
     * - public 資料夾內的檔案
     */
    '/((?!_next/static|_next/image|favicon.ico|contract-templates|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
