/**
 * 車行提交司機資訊 API
 * POST /api/transport/[id]/confirm
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    const { driver_name, driver_phone, vehicle_plate, vehicle_type } = body

    if (!driver_name?.trim() || !driver_phone?.trim()) {
      return NextResponse.json({ error: '司機姓名和電話為必填' }, { status: 400 })
    }

    // 更新 DB
    const { error } = await supabase
      .from('tour_itinerary_items')
      .update({
        driver_name: driver_name.trim(),
        driver_phone: driver_phone.trim(),
        vehicle_plate: vehicle_plate?.trim() || null,
        vehicle_type: vehicle_type?.trim() || null,
        booking_confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '司機資訊已提交' 
    })

  } catch (error) {
    console.error('Confirm error:', error)
    return NextResponse.json({ error: '提交失敗', details: String(error) }, { status: 500 })
  }
}
