import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')

    if (!tourId) {
      return NextResponse.json(
        { error: '缺少 tourId' },
        { status: 400 }
      )
    }

    // 查詢訂單和團員（RLS 自動過濾）
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        code,
        contact_person,
        contact_phone,
        order_members (
          id,
          chinese_name,
          id_number
        )
      `)
      .eq('tour_id', tourId)
      .order('code')

    if (error) {
      return NextResponse.json(
        { error: '查詢失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
