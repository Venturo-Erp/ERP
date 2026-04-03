/**
 * API Route: 路線優化
 * POST /api/route-optimizer/optimize
 * 
 * Body:
 * {
 *   "destinationIds": ["uuid1", "uuid2", ...],
 *   "hotelId": "uuid",
 *   "maxDailyHours": 10
 * }
 */

import { NextResponse } from 'next/server';
import { optimizeRoute } from '@/lib/route-optimizer';
import type { RouteOptimizationOptions } from '@/lib/route-optimizer/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destinationIds, hotelId, maxDailyHours } = body as RouteOptimizationOptions;

    // 驗證參數
    if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
      return NextResponse.json(
        { error: '❌ 請提供景點 ID 列表' },
        { status: 400 }
      );
    }

    // 執行路線優化
    const result = await optimizeRoute({
      destinationIds,
      hotelId,
      maxDailyHours: maxDailyHours || 10,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ 路線優化失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}
