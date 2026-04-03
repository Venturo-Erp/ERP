/**
 * 清邁景點路線優化 API
 * 從 Supabase distance_matrix 查詢距離 + Python 腳本優化路線
 */

import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import type {
  Destination,
  DistanceInfo,
  OptimizedRouteResult,
  RouteOptimizationOptions,
  DailyRoute,
  RouteSegment,
} from './types';

/**
 * 取得兩個景點間的距離與時間
 */
export async function getDistanceBetween(
  fromDestinationId: string,
  toDestinationId: string
): Promise<DistanceInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('distance_matrix')
    .select('distance_km, duration_minutes')
    .eq('from_destination_id', fromDestinationId)
    .eq('to_destination_id', toDestinationId)
    .single();

  if (error) {
    console.error('❌ 查詢距離失敗:', error);
    return null;
  }

  return {
    distanceKm: data.distance_km,
    durationMinutes: data.duration_minutes,
  };
}

/**
 * 批次取得多個景點間的距離矩陣
 */
export async function getDistanceMatrix(
  destinationIds: string[]
): Promise<Map<string, Map<string, DistanceInfo>>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_distance_matrix_for_route', {
    p_destination_ids: destinationIds,
  });

  if (error) {
    console.error('❌ 查詢距離矩陣失敗:', error);
    return new Map();
  }

  // 建立二維 Map 結構
  const matrix = new Map<string, Map<string, DistanceInfo>>();

  for (const record of data) {
    if (!matrix.has(record.from_id)) {
      matrix.set(record.from_id, new Map());
    }

    matrix.get(record.from_id)!.set(record.to_id, {
      distanceKm: record.distance_km,
      durationMinutes: record.duration_minutes,
    });
  }

  return matrix;
}

/**
 * 優化路線（呼叫 Python 腳本）
 * 
 * 注意：實際執行時需要：
 * 1. 安裝 Python + ortools
 * 2. 執行 scripts/optimize-route.py
 * 3. 或改為 Node.js 純實作（可用 tsp-solver npm 套件）
 */
export async function optimizeRoute(
  options: RouteOptimizationOptions
): Promise<OptimizedRouteResult> {
  const { destinationIds, hotelId, maxDailyHours = 10 } = options;

  // 1. 取得景點資料
  const supabase = await createClient();
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('id, name, latitude, longitude, category, image_url')
    .in('id', destinationIds);

  if (destError || !destinations) {
    throw new Error('❌ 查詢景點失敗');
  }

  // 2. 取得距離矩陣
  const distanceMatrix = await getDistanceMatrix(destinationIds);

  // 3. 簡易貪婪算法（先實作，後續可改為呼叫 Python OR-Tools）
  const dailyRoutes = await greedyRouteSplit(
    destinations,
    distanceMatrix,
    hotelId || destinations[0].id,
    maxDailyHours
  );

  // 4. 計算總和 & 警告
  const totalDistanceKm = dailyRoutes.reduce(
    (sum, route) => sum + route.totalDistanceKm,
    0
  );
  const totalDurationMinutes = dailyRoutes.reduce(
    (sum, route) => sum + route.totalDurationMinutes,
    0
  );

  const warnings: string[] = [];
  if (totalDurationMinutes > maxDailyHours * 60 * dailyRoutes.length) {
    warnings.push(
      `用車時間較長（${(totalDurationMinutes / 60).toFixed(1)} 小時），建議增加天數或減少景點`
    );
  }

  return {
    dailyRoutes,
    totalDays: dailyRoutes.length,
    totalDistanceKm,
    totalDurationMinutes,
    warnings,
  };
}

/**
 * 簡易貪婪算法：每次選擇最近的景點
 * （後續可改為 OR-Tools 最佳化）
 */
async function greedyRouteSplit(
  destinations: Destination[],
  distanceMatrix: Map<string, Map<string, DistanceInfo>>,
  hotelId: string,
  maxDailyHours: number
): Promise<DailyRoute[]> {
  const maxDailyMinutes = maxDailyHours * 60;
  const visited = new Set<string>();
  const dailyRoutes: DailyRoute[] = [];

  let currentDay = 1;
  let currentDestinations: Destination[] = [
    destinations.find((d) => d.id === hotelId)!,
  ];
  let currentDuration = 0;
  let currentDistance = 0;
  let currentSegments: RouteSegment[] = [];
  let currentLocation = hotelId;

  visited.add(hotelId);

  while (visited.size < destinations.length) {
    // 找最近的未訪問景點
    let nearestDest: Destination | null = null;
    let nearestDistance = Infinity;
    let nearestInfo: DistanceInfo | null = null;

    for (const dest of destinations) {
      if (visited.has(dest.id)) continue;

      const info = distanceMatrix.get(currentLocation)?.get(dest.id);
      if (!info) continue;

      if (info.durationMinutes < nearestDistance) {
        nearestDistance = info.durationMinutes;
        nearestDest = dest;
        nearestInfo = info;
      }
    }

    if (!nearestDest || !nearestInfo) break;

    // 檢查是否超過每日限制
    if (
      currentDuration + nearestInfo.durationMinutes > maxDailyMinutes &&
      currentDestinations.length > 1
    ) {
      // 回到飯店
      const returnInfo = distanceMatrix
        .get(currentLocation)
        ?.get(hotelId);
      if (returnInfo) {
        currentSegments.push({
          from: currentDestinations[currentDestinations.length - 1].name,
          fromId: currentLocation,
          to: currentDestinations[0].name,
          toId: hotelId,
          distanceKm: returnInfo.distanceKm,
          durationMinutes: returnInfo.durationMinutes,
        });
        currentDuration += returnInfo.durationMinutes;
        currentDistance += returnInfo.distanceKm;
      }

      // 保存當前天的行程
      dailyRoutes.push({
        day: currentDay,
        destinations: [...currentDestinations],
        totalDistanceKm: currentDistance,
        totalDurationMinutes: currentDuration,
        segments: [...currentSegments],
      });

      // 開始新的一天
      currentDay++;
      currentDestinations = [destinations.find((d) => d.id === hotelId)!];
      currentDuration = 0;
      currentDistance = 0;
      currentSegments = [];
      currentLocation = hotelId;
    }

    // 加入當前景點
    currentDestinations.push(nearestDest);
    currentSegments.push({
      from:
        currentDestinations[currentDestinations.length - 2]?.name ||
        'Hotel',
      fromId: currentLocation,
      to: nearestDest.name,
      toId: nearestDest.id,
      distanceKm: nearestInfo.distanceKm,
      durationMinutes: nearestInfo.durationMinutes,
    });
    currentDuration += nearestInfo.durationMinutes;
    currentDistance += nearestInfo.distanceKm;
    currentLocation = nearestDest.id;
    visited.add(nearestDest.id);
  }

  // 回到飯店（最後一天）
  if (currentDestinations.length > 1) {
    const returnInfo = distanceMatrix.get(currentLocation)?.get(hotelId);
    if (returnInfo) {
      currentSegments.push({
        from: currentDestinations[currentDestinations.length - 1].name,
        fromId: currentLocation,
        to: currentDestinations[0].name,
        toId: hotelId,
        distanceKm: returnInfo.distanceKm,
        durationMinutes: returnInfo.durationMinutes,
      });
      currentDuration += returnInfo.durationMinutes;
      currentDistance += returnInfo.distanceKm;
    }

    dailyRoutes.push({
      day: currentDay,
      destinations: currentDestinations,
      totalDistanceKm: currentDistance,
      totalDurationMinutes: currentDuration,
      segments: currentSegments,
    });
  }

  return dailyRoutes;
}
