/**
 * 用 LINE userId 查詢客戶
 * GET /api/customers/by-line?lineUserId=xxx&workspaceId=xxx
 * 
 * 回傳：
 * - 有綁定 → { customer: {...} }
 * - 沒綁定 → { customer: null }
 * 
 * 🔒 安全性：需要提供 workspaceId，防止跨租戶查詢
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdminClient()
  const lineUserId = request.nextUrl.searchParams.get('lineUserId')
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, code, name, phone, email, birth_date, line_user_id, line_linked_at, workspace_id')
    .eq('line_user_id', lineUserId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    logger.error('Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  return NextResponse.json({ customer: data || null })
}
