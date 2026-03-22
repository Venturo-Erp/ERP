import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')

    if (!tourId) {
      return NextResponse.json(
        { error: '缺少 tourId' },
        { status: 400 }
      )
    }

    // 查詢訂單和團員（只查詢存在的欄位）
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
          id_number,
          phone
        )
      `)
      .eq('tour_id', tourId)
      .order('code')

    if (error) {
      console.error('查詢團員失敗:', error)
      return NextResponse.json(
        { error: '查詢失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Members API 錯誤:', error)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
