import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/bank-accounts?workspace_id=xxx
 * 取得銀行帳戶列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
