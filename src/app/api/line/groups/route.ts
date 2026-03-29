import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/line/groups
 * 取得 LINE 群組列表（RLS 自動過濾）
 */
export async function GET() {
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('line_groups')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
