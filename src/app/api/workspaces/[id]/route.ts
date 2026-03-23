import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/workspaces/[id]
 * 取得租戶詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, code, type, is_active')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  return NextResponse.json(data)
}
