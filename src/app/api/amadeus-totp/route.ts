import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function DELETE() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('employees')
      .update({
        amadeus_totp_secret: null,
        amadeus_totp_account_name: null,
      } as never)
      .eq('id', auth.data.employeeId)

    if (error) {
      logger.error('Amadeus TOTP delete DB error:', error)
      return NextResponse.json({ error: '清除失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Amadeus TOTP delete error:', err)
    return NextResponse.json({ error: '清除失敗' }, { status: 500 })
  }
}
