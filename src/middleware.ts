import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyQuickLoginToken } from '@/lib/auth/quick-login-token'

/**
 * Next.js Middleware - 伺服器端路由保護
 *
 * 架構（2026-04-18 簡化）：
 * - 單一認證：Supabase Auth（session cookies 由 @supabase/ssr 管理）
 * - 保留：Quick-Login Token（特殊 one-time 登入、用 HMAC 驗）
 * - 已移除：自家 JWT（auth-token cookie）→ 現在完全由 Supabase session 管
 */

async function isAuthenticated(request: NextRequest, response: NextResponse): Promise<boolean> {
  // 1. 先看 quick-login token（一次性登入、保留原本機制）
  const quickLoginCookie = request.cookies.get('auth-token')
  if (quickLoginCookie?.value?.startsWith('quick-login-')) {
    return await verifyQuickLoginToken(quickLoginCookie.value)
  }

  // 2. 標準登入：讀 Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 讓 Supabase 刷新過期 token、把新 cookie 寫回 response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  // 根路由（Landing Page）為精確匹配
  if (pathname === '/') {
    return response
  }

  // 公開路由：不需要登入即可訪問（prefix 匹配）
  const publicPaths = [
    // === 頁面 ===
    '/landing',
    '/login',
    '/confirm',
    '/public',
    '/view',
    '/p/',
    '/game',

    // === 認證 API ===
    '/api/auth',
    '/api/health',

    // === Webhook ===
    '/api/line/webhook',
    '/api/meta/webhook',
    '/api/linkpay/callback',
    '/api/linkpay/webhook',

    // === Cron ===
    '/api/cron',

    // === 公開 API ===
    '/api/itineraries',
    '/api/contracts/sign',
    '/api/quotes/confirmation/customer',
    '/api/d',

    // === App API（Bearer token）===
    '/api/my',
    '/api/trips',
    '/api/eyeline',
    '/api/join-trip',

    // === LINE 客戶端 ===
    '/api/customers/by-line',
    '/api/customers/link-line',
    '/api/customers/match',

    // === 靜態資源 ===
    '/_next',
    '/favicon.ico',
    '/manifest.json',
  ]

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  if (isPublicPath) {
    return response
  }

  // 驗證 Supabase session
  const authed = await isAuthenticated(request, response)
  if (authed) {
    return response
  }

  // 未登入 → 重導
  const loginUrl = new URL('/login', request.url)
  if (pathname !== '/dashboard') {
    loginUrl.searchParams.set('redirect', pathname)
  }
  return NextResponse.redirect(loginUrl)
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
