import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 *
 * 保留此 endpoint 供 client 呼叫、維持兼容性。
 * 實際的 session 清除由 client 端的 `supabase.auth.signOut()` 處理
 * （Supabase SSR 會自動清掉 session cookies）。
 *
 * 舊的自家 JWT（auth-token cookie）已移除（2026-04-18）。
 */
export async function POST() {
  return NextResponse.json({ success: true })
}
