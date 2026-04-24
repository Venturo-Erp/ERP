import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

/**
 * POST /api/contracts/sign
 *
 * 公開 API：客戶簽署合約（無需登入）
 * 注意：使用 service client 因為客戶不會登入
 *
 * ⚠️ Security: Contract signing relies on UUID secrecy as the sole auth factor.
 * This is an intentional trade-off for frictionless public signing links.
 * UUIDs (v4) have 122 bits of entropy — brute-force enumeration is infeasible.
 * Additional mitigations: signed contracts are immutable (status check on line 67),
 * and signing metadata (IP, user-agent) is recorded for audit.
 */
export async function POST(request: NextRequest) {
  try {
    // 直接建立 service client，確保繞過 RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await request.json()
    const { contractId, signature, signerPhone, signerAddress, signerIdNumber } = body

    if (!contractId || !signature) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 取得請求資訊
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // 檢查合約是否存在且未簽署

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', contractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { error: '找不到合約', details: fetchError?.message },
        { status: 404 }
      )
    }

    if (contract.status === 'signed') {
      return NextResponse.json({ error: '此合約已簽署' }, { status: 400 })
    }

    // 更新合約狀態 + 簽約人補填資訊
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_image: signature,
        ...(signerPhone && { signer_phone: signerPhone }),
        ...(signerAddress && { signer_address: signerAddress }),
        ...(signerIdNumber && { signer_id_number: signerIdNumber }),
        signature_ip: ip,
        signature_user_agent: userAgent,
        signed_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (updateError) {
      return NextResponse.json({ error: '簽署失敗，請稍後再試' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
