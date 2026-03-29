import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('code', code)
    .eq('is_deleted', false)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到旅遊團' }, { status: 404 })
  }

  return NextResponse.json(data)
}
