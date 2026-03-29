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
    // JWT 失敗，fallback 嘗試 base64 解碼（舊格式，向下相容已登入的 session）
    // TODO: 2026-04 移除 base64 fallback，屆時舊 session 會被強制重新登入
    try {
      const decoded = JSON.parse(atob(token))
      if (decoded.iss !== 'venturo-app') {
        return false
      }
      if (decoded.exp && Date.now() > decoded.exp) {
        return false
      }
      return true
    } catch {
      return false
    }
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
    '/landing',
    '/login',
    '/confirm', // 報價確認頁面（客戶公開連結）
    '/api/auth',
    '/api/health',
    '/api/finance', // 財務 API（使用 service role key）
    '/api/linkpay', // Webhook 回調
    '/api/gemini', // AI 圖片生成 API
    '/api/itineraries', // 公開行程 API（給 /view 頁面使用）
    '/api/quotes/confirmation/customer', // 客戶報價確認 API（使用 token 驗證）
    '/api/my', // App API（使用 Bearer token 驗證）
    '/public', // 供應商公開回覆頁面（用 token 驗證）
    '/api/contracts/sign', // 公開合約簽署 API
    '/api/line', // LINE Webhook + API
    '/api/d', // 短網址下載（公開，24hr signed URL）
    '/api/trips', // App API（使用 Bearer token 驗證）
    '/api/eyeline', // 旅人眼線 API（使用 Bearer token 驗證）
    '/api/join-trip', // 加入行程 API（使用 Bearer token 驗證）
    '/api/storage', // Storage API（使用 service role key 驗證）
    '/api/bot', // 機器人 API（內部使用）
    '/api/cron', // Cron Job API（Vercel 排程使用）
    '/api/workspaces', // 租戶 API（使用 service role key）
    '/test-supplier', // 供應商 UI 測試頁面（暫時）
    '/view', // 公開行程檢視頁面
    '/game', // 遊戲辦公室（隱藏彩蛋）
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
