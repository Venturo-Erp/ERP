import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * POST /api/contracts/paper-sign
 * 
 * 標記合約為紙本簽署（需要登入）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const { contractId, signedDate } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: '缺少合約 ID' }, { status: 400 })
    }

    const signedAt = signedDate 
      ? new Date(signedDate).toISOString()
      : new Date().toISOString()

    // 更新合約狀態為已簽署（紙本）（RLS 自動過濾）
    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        signature_ip: 'paper',
        signature_user_agent: '紙本簽署',
      })
      .eq('id', contractId)

    if (error) {
      return NextResponse.json({ error: '標記失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
