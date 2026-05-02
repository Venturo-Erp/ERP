/**
 * 公開查詢旅遊團（透過 code）
 * GET /api/tours/by-code/[code]
 *
 * 用途：客戶透過分享連結查看旅遊團資訊
 * 🔒 安全性：只回傳公開欄位，不洩露內部資訊
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const supabase = getSupabaseAdminClient()

  // 只查詢公開欄位（不包含 workspace_id, leader_id, sales_id）
  const { data, error } = await supabase
    .from('tours')
    .select(
      'id, code, name, location, departure_date, return_date, status, current_participants, max_participants'
    )
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到旅遊團' }, { status: 404 })
  }

  return NextResponse.json(data)
}
