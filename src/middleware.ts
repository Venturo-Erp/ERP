import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js Middleware - 伺服器端路由保護
 * 認證來源：Supabase Auth（session cookies 由 @supabase/ssr 管理）
 */

// P002（2026-04-22）：公開路由改白名單。
// 精確匹配 + 子路徑 prefix 分兩組，避免 `/api/auth` 這種過寬 prefix 把敏感 API 放行。
const EXACT_PUBLIC_PATHS = new Set<string>([
  // === 頁面（無子路由者）===
  '/landing',
  '/login',
  '/confirm',
  '/public',
  '/view',
  '/game',
  // === 靜態資源 ===
  '/favicon.ico',
  '/manifest.json',
  // === 認證 API ===
  '/api/auth/validate-login',
  '/api/auth/logout',
  // sync-employee：解「登入時 session cookie 尚未就緒」的雞生蛋問題。
  // 自帶 access_token 驗證（比 cookie session 更嚴、已是 defense-in-depth）。
  '/api/auth/sync-employee',
  '/api/health',
  // === 客戶簽單確認（透過分享連結）===
  '/api/contracts/sign',
  '/api/quotes/confirmation/customer',
  // === LINE LIFF customer 登入前查詢 ===
  '/api/customers/by-line',
  '/api/customers/link-line',
  '/api/customers/match',
])

const PREFIX_PUBLIC_PATHS: readonly string[] = [
  // === 頁面子路由（帶斜線避開 /login-x 這類誤中）===
  '/login/',
  '/confirm/',
  '/public/',
  '/view/',
  '/p/',
  '/game/',
  // === LINE customer OAuth 家族 (/api/auth/line, /callback, /me) ===
  '/api/auth/line',
  // === Server-to-server webhook ===
  '/api/line/webhook',
  '/api/meta/webhook',
  '/api/linkpay/callback',
  '/api/linkpay/webhook',
  // === Cron (Vercel internal) ===
  '/api/cron/',
  // === 分享連結 ===
  '/api/itineraries/',
  '/api/d/',
  // === Next.js static ===
  '/_next/',
]

function isPublicPath(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return true
  return PREFIX_PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

async function isAuthenticated(request: NextRequest, response: NextResponse): Promise<boolean> {
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

  // P002（2026-04-22）：公開路由白名單、改精確匹配。
  // 原 `startsWith('/api/auth')` prefix 會把 admin-reset-password / create-employee-auth /
  // reset-employee-password / change-password 全放行、
  // 這些是敏感 API、必須走登入守門（endpoint 本身有 getServerAuth 是第二道、middleware 是第一道）。
  if (isPublicPath(pathname)) {
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
