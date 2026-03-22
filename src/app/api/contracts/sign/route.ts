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

    // 檢查合約是否存在且未簽署（含相關資料用於通知）
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        id,
        status,
        code,
        signer_name,
        signer_type,
        company_name,
        created_by,
        tour_id,
        tours!inner(id, code, name)
      `)
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

    // 發送通知給業務
    try {
      const signerName = contract.signer_type === 'company' 
        ? contract.company_name 
        : contract.signer_name
      
      // Supabase 使用 !inner 時，tours 是物件而非陣列
      const tours = contract.tours as unknown
      const tourInfo = tours as { code: string; name: string }
      
      const notificationMessage = `✅ 合約簽署完成

合約編號：${contract.code}
簽約人：${signerName}
團名：${tourInfo.name}（${tourInfo.code}）
簽署時間：${new Date().toLocaleString('zh-TW')}

請至系統查看完整合約內容。`

      // 發送系統內通知給建立合約的業務人員
      if (contract.created_by) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/bot-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bot-secret': process.env.BOT_API_SECRET || '',
          },
          body: JSON.stringify({
            recipient_id: contract.created_by,
            message: notificationMessage,
            type: 'info',
            metadata: {
              category: 'contract_signed',
              contract_id: contractId,
              contract_code: contract.code,
              tour_id: contract.tour_id,
            },
          }),
        })
      }
    } catch (notifyError) {
      // 通知失敗不影響簽署成功
      console.error('發送通知失敗（不影響簽署）:', notifyError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('簽署 API 錯誤:', error)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
