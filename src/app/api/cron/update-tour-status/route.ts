import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Cron job: 自動更新旅遊團狀態
 * - 出發日 <= 今天 且狀態是「待出發」 → 改成「進行中」
 * - 回程日 < 今天 且狀態是「進行中」 → 改成「已完成」
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date().toISOString().split('T')[0]

    // 1. 更新「待出發」→「進行中」
    const { data: toursToStart, error: error1 } = await supabase
      .from('tours')
      .update({ status: '進行中' })
      .eq('status', '待出發')
      .lte('departure_date', today)
      .eq('is_deleted', false)
      .select('code')

    // 2. 更新「進行中」→「已完成」
    const { data: toursToComplete, error: error2 } = await supabase
      .from('tours')
      .update({ status: '已完成' })
      .eq('status', '進行中')
      .lt('return_date', today)
      .eq('is_deleted', false)
      .select('code')

    if (error1 || error2) {
      return NextResponse.json(
        {
          error: error1?.message || error2?.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      started: toursToStart?.length || 0,
      completed: toursToComplete?.length || 0,
      tours_started: toursToStart?.map(t => t.code) || [],
      tours_completed: toursToComplete?.map(t => t.code) || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    )
  }
}
