import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractId, signature } = body

    if (!contractId || !signature) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 取得請求資訊
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // 檢查合約是否存在且未簽署
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', contractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { error: '找不到合約' },
        { status: 404 }
      )
    }

    if (contract.status === 'signed') {
      return NextResponse.json(
        { error: '此合約已簽署' },
        { status: 400 }
      )
    }

    // 更新合約狀態
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_image: signature,
        signature_ip: ip,
        signature_user_agent: userAgent,
        signed_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (updateError) {
      console.error('更新合約失敗:', updateError)
      return NextResponse.json(
        { error: '簽署失敗，請稍後再試' },
        { status: 500 }
      )
    }

    // TODO: 發送通知給業務
    // - LINE 通知
    // - Email 通知
    // - 系統內通知

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('簽署 API 錯誤:', error)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
