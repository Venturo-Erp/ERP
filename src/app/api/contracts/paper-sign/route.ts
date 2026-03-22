import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { contractId, signedDate } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: '缺少合約 ID' }, { status: 400 })
    }

    // 使用傳入的日期，或預設今天
    const signedAt = signedDate 
      ? new Date(signedDate).toISOString()
      : new Date().toISOString()

    // 更新合約狀態為已簽署（紙本）
    // 用 signature_ip = 'paper' 標記為紙本簽署
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
      console.error('標記紙本簽署失敗:', error)
      return NextResponse.json({ error: '標記失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('紙本簽署 API 錯誤:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
