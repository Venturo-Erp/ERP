import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError } from '@/lib/api/response'

// Stage 1（ref data SSOT 重構）：ref_airports 為全域表，
// 新增機場只允許 super admin（平台層）操作。一般業務遇到缺的機場應回報平台。
export async function POST(req: NextRequest) {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  const ssr = await createSupabaseServerClient()
  const { data: isSuperAdmin, error: rpcError } = await ssr.rpc('is_super_admin')
  if (rpcError || !isSuperAdmin) {
    return NextResponse.json(
      { error: '僅平台管理員可新增全域機場，請聯絡 super admin' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { iata_code, city_name_zh, country_code } = body

  if (!iata_code || !city_name_zh || !country_code) {
    return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
  }
  if (!/^[A-Z]{3}$/.test(iata_code)) {
    return NextResponse.json({ error: 'IATA 代碼必須為 3 碼大寫英文' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('ref_airports').upsert(
    {
      iata_code,
      city_name_zh,
      country_code,
      usage_count: 0,
      is_favorite: false,
    },
    { onConflict: 'iata_code' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ iata_code })
}
