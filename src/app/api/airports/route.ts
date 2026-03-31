import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError } from '@/lib/api/response'

export async function POST(req: NextRequest) {
  // 🔒 安全修復 2026-03-15：需要認證
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }
  const body = await req.json()
  const { iata_code, city_name_zh, country_code } = body

  if (!iata_code || !city_name_zh || !country_code) {
    return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
  }

  if (!/^[A-Z]{3}$/.test(iata_code)) {
    return NextResponse.json({ error: 'IATA 代碼必須為 3 碼大寫英文' }, { status: 400 })
  }

  // 取得用戶的 workspace_id
  const workspace_id = auth.data.workspaceId
  if (!workspace_id) {
    return NextResponse.json({ error: '無法取得 workspace' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('ref_airports').upsert(
    {
      iata_code,
      city_name_zh,
      country_code,
      workspace_id,
      usage_count: 1,
      is_favorite: false,
    },
    { onConflict: 'iata_code,workspace_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ iata_code })
}
