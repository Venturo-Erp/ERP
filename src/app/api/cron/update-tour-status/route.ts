/**
 * Cron API: 自動更新團狀態
 * 可以用 Vercel Cron 或手動呼叫
 */

import { NextResponse } from 'next/server'
import { updateAllTourStatuses } from '@/lib/utils/tour-status-updater'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  try {
    const result = await updateAllTourStatuses()
    
    return NextResponse.json({
      success: true,
      updated: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('更新團狀態失敗:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
