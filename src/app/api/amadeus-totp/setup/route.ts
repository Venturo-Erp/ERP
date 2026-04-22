import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptSecret } from '@/lib/crypto/totp-encryption'
import { logger } from '@/lib/utils/logger'

const BodySchema = z.object({
  secret: z
    .string()
    .min(16)
    .max(128)
    .transform(s => s.toUpperCase().replace(/\s+/g, '').replace(/=+$/, ''))
    .refine(s => /^[A-Z2-7]+$/.test(s), '種子必須是 base32 格式'),
  accountName: z.string().max(200).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'secret 格式錯誤' },
        { status: 400 }
      )
    }

    const encrypted = encryptSecret(parsed.data.secret)

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('employees')
      .update({
        amadeus_totp_secret: encrypted,
        amadeus_totp_account_name: parsed.data.accountName || null,
      } as never)
      .eq('id', auth.data.employeeId)

    if (error) {
      logger.error('Amadeus TOTP setup DB error:', error)
      return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Amadeus TOTP setup error:', err)
    return NextResponse.json({ error: '設定失敗，請稍後再試' }, { status: 500 })
  }
}
