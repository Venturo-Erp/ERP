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

    const { data, error } = await supabase
      .from('contracts')
      .select('id, code, template, signer_name, status, signed_at, member_ids')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查詢合約失敗:', error)
      return NextResponse.json(
        { error: '查詢失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({ contracts: data })
  } catch (error) {
    console.error('List contracts API 錯誤:', error)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
