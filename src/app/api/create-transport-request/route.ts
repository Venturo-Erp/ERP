import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
      supplierName,
      vehicleDesc,
      note,
      totalPax,
      workspaceId,
    } = body

    if (!tourId || !workspaceId) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 建立新的遊覽車需求單
    const { data: newRequest, error } = await supabase
      .from('tour_requests')
      .insert({
        workspace_id: workspaceId,
        tour_id: tourId,
        request_type: 'transport',
        request_scope: 'individual_item',
        supplier_name: supplierName || '車行',
        status: 'draft',
        note: `${vehicleDesc ? vehicleDesc + '\n' : ''}${note || ''}`.trim(),
        items: [],
        metadata: {
          vehicleDesc,
          totalPax,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('建立需求單失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, requestId: newRequest.id })
  } catch (error) {
    console.error('建立需求單錯誤:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
