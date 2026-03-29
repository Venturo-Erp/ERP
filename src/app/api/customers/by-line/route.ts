/**
 * 用 LINE userId 查詢客戶
 * GET /api/customers/by-line?lineUserId=xxx
 * 
 * 回傳：
 * - 有綁定 → { customer: {...} }
 * - 沒綁定 → { customer: null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get('lineUserId')

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, code, name, phone, email, birth_date, line_user_id, line_linked_at')
    .eq('line_user_id', lineUserId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  return NextResponse.json({ customer: data || null })
}
