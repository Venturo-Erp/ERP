import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'

/**
 * GET /api/workspaces/[workspaceId]
 * 取得租戶詳情
 * 
 * 注意：這是 Super Admin 操作，可以查看任何租戶
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, code, type, is_active, premium_enabled, premium_expires_at')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  return NextResponse.json(data)
}
