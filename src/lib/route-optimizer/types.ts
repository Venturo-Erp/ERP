/**
 * 清邁景點路線優化 - TypeScript 型別定義
 */

export interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  imageUrl?: string;
}

export interface DistanceInfo {
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteSegment {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface DailyRoute {
  day: number;
  destinations: Destination[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  segments: RouteSegment[];
}

export interface OptimizedRouteResult {
  dailyRoutes: DailyRoute[];
  totalDays: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  warnings: string[];
}

export interface RouteOptimizationOptions {
  destinationIds: string[];
  hotelId?: string;
  maxDailyHours?: number;  // 預設 10 小時
}
