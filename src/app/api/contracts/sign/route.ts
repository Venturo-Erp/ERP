import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/contracts/sign
 *
 * 公開 API：客戶簽署合約（無需登入）
 * 注意：使用 service client 因為客戶不會登入
 *
 * 🛡️ 安全機制（2026-05-06 強化）：
 * 1. Rate limit：每 IP 5 次 / 60 秒（防 enumeration / 防連點重複送）
 * 2. UUID 122 bits entropy（brute-force 不可行）
 * 3. 已簽合約 immutable（status check）
 * 4. 30 天過期：合約建立超過 30 天無法線上簽（防舊連結被翻出來重簽）
 * 5. IP / user-agent 記錄供稽核
 */
const SIGNING_EXPIRY_DAYS = 30

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit：每 IP 5 次/60 秒
    const rateLimited = await checkRateLimit(request, 'contracts-sign', 5, 60_000)
    if (rateLimited) return rateLimited

    // 直接建立 service client，確保繞過 RLS
    const supabase = getSupabaseAdminClient()
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
      .select('id, status, created_at')
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

    // 30 天過期檢查（防舊連結被翻出來重簽）
    if (contract.created_at) {
      const createdAt = new Date(contract.created_at).getTime()
      const expiryThreshold = Date.now() - SIGNING_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      if (createdAt < expiryThreshold) {
        return NextResponse.json(
          { error: `此合約已過期（建立超過 ${SIGNING_EXPIRY_DAYS} 天）、請聯絡業務重發` },
          { status: 410 }
        )
      }
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
