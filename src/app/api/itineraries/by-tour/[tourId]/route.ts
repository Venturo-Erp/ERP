import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('itineraries')
    .select('id, tour_id, daily_itinerary, departure_date, outbound_flight, return_flight, workspace_id, created_at, updated_at')
    .eq('tour_id', tourId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到行程表' }, { status: 404 })
  }

  return NextResponse.json(data)
}
