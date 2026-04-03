/**
 * 清邁景點路線優化 - 展示組件
 * 顯示多日行程 + 用車時間 + 警告提示
 */

'use client';

import React from 'react';
import type { OptimizedRouteResult } from '@/lib/route-optimizer/types';
import { Icon } from '@iconify/react';

interface OptimizedRouteDisplayProps {
  result: OptimizedRouteResult;
}

export default function OptimizedRouteDisplay({
  result,
}: OptimizedRouteDisplayProps) {
  const { dailyRoutes, totalDays, totalDistanceKm, totalDurationMinutes, warnings } = result;

  return (
    <div className="space-y-6">
      {/* 警告提示 */}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <div className="flex items-start gap-3">
            <Icon
              icon="mdi:alert-circle"
              className="w-5 h-5 text-yellow-600 mt-0.5"
            />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-1">注意事項</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 總覽 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">總天數</div>
          <div className="text-2xl font-bold text-blue-900">{totalDays} 天</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 mb-1">總距離</div>
          <div className="text-2xl font-bold text-green-900">
            {totalDistanceKm.toFixed(1)} km
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-600 mb-1">總用車時間</div>
          <div className="text-2xl font-bold text-purple-900">
            {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m
          </div>
        </div>
      </div>

      {/* 每日行程 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">建議行程</h3>

        {dailyRoutes.map((route) => (
          <div
            key={route.day}
            className="bg-white rounded-lg border border-gray-200 p-5"
          >
            {/* 標題列 */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900">
                Day {route.day}
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Icon icon="mdi:map-marker-distance" className="w-4 h-4" />
                  {route.totalDistanceKm.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon="mdi:clock-outline" className="w-4 h-4" />
                  {Math.floor(route.totalDurationMinutes / 60)}h{' '}
                  {route.totalDurationMinutes % 60}m
                </span>
              </div>
            </div>

            {/* 景點列表 */}
            <div className="space-y-3">
              {route.destinations.map((dest, idx) => (
                <div key={dest.id} className="flex items-start gap-3">
                  {/* 序號 */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </div>

                  {/* 景點資訊 */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{dest.name}</div>
                    {dest.category && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {dest.category}
                      </div>
                    )}

                    {/* 距離資訊（到下一個景點） */}
                    {idx < route.segments.length && (
                      <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                        <Icon icon="mdi:arrow-right" className="w-4 h-4" />
                        <span>
                          {route.segments[idx].distanceKm.toFixed(1)} km •{' '}
                          {route.segments[idx].durationMinutes} 分鐘
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
