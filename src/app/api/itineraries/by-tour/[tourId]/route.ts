import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerAuth } from '@/lib/auth/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  // 🔒 D3 P0 修復：必須登入 + 限定當前 workspace
  // 之前 service_role + tour_id 純值查、未登入也能拿其他租戶整份行程
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { tourId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('itineraries')
    .select(
      'id, tour_id, title, subtitle, tour_code, daily_itinerary, departure_date, return_date, outbound_flight, return_flight, workspace_id, created_at, updated_at'
    )
    .eq('workspace_id', auth.data.workspaceId)
    .eq('tour_id', tourId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到行程表' }, { status: 404 })
  }

  return NextResponse.json(data)
}
