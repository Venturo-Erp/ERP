/**
 * GET /api/hr/payroll/runs/[id]
 * 拿單筆批次明細（含所有 payslips）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error.error }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const [runRes, slipsRes] = await Promise.all([
      supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', auth.data.workspaceId)
        .maybeSingle(),
      supabase
        .from('payslips')
        .select('*, employees!payslips_employee_id_fkey (display_name, employee_number)')
        .eq('payroll_run_id', id)
        .eq('workspace_id', auth.data.workspaceId)
        .order('created_at', { ascending: true }),
    ])

    if (runRes.error || !runRes.data) {
      return NextResponse.json({ error: '找不到薪資批次' }, { status: 404 })
    }
    if (slipsRes.error) {
      logger.error('查 payslips 失敗', slipsRes.error)
      return NextResponse.json({ error: '查薪資單失敗' }, { status: 500 })
    }

    return NextResponse.json({
      run: runRes.data,
      payslips: slipsRes.data ?? [],
    })
  } catch (err) {
    logger.error('GET payroll run 錯誤', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
