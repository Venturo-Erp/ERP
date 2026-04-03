#!/usr/bin/env python3
"""
清邁景點路線優化算法
使用 Google OR-Tools 解決旅行商問題（TSP）+ 多日分組

功能：
1. 輸入：客戶選擇的景點 + 飯店位置
2. 計算：最短路徑（從 distance_matrix 查詢）
3. 分組：按每日 10-12 小時限制分天
4. 輸出：每日行程 + 用車時間

使用方式：
    python scripts/optimize-route.py --session-id abc123
    python scripts/optimize-route.py --destination-ids id1,id2,id3 --hotel-lat 18.7883 --hotel-lng 98.9853
"""

import os
import sys
import argparse
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from supabase import create_client, Client

try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
except ImportError:
    print("❌ 請先安裝 OR-Tools：pip install ortools")
    sys.exit(1)

# ============================================
# 設定
# ============================================
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

MAX_DAILY_HOURS = 10  # 每日最大用車時間（小時）
MAX_DAILY_MINUTES = MAX_DAILY_HOURS * 60

# ============================================
# 資料結構
# ============================================
@dataclass
class Destination:
    """景點資料"""
    id: str
    name: str
    latitude: float
    longitude: float
    category: Optional[str] = None

@dataclass
class Route:
    """路線資料"""
    day: int
    destinations: List[Destination]
    total_distance_km: float
    total_duration_minutes: int
    segments: List[Dict]  # [{"from": "A", "to": "B", "distance_km": 10, "duration_min": 20}]

# ============================================
# Supabase 客戶端
# ============================================
def init_supabase() -> Client:
    """初始化 Supabase 客戶端"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("❌ 環境變數未設定：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# 取得景點資料
# ============================================
def get_destinations_by_ids(supabase: Client, destination_ids: List[str]) -> List[Destination]:
    """
    根據 ID 列表取得景點資料
    """
    response = supabase.table("destinations").select(
        "id, name, latitude, longitude, category"
    ).in_("id", destination_ids).execute()
    
    if not response.data:
        raise ValueError(f"❌ 找不到景點資料：{destination_ids}")
    
    destinations = [
        Destination(
            id=d["id"],
            name=d["name"],
            latitude=d["latitude"],
            longitude=d["longitude"],
            category=d.get("category")
        )
        for d in response.data
    ]
    
    return destinations

def get_destinations_by_session(supabase: Client, session_id: str) -> List[Destination]:
    """
    根據客戶會話 ID 取得選擇的景點
    """
    # 1. 取得客戶選擇的景點 ID
    response = supabase.table("customer_destination_picks").select(
        "destination_id"
    ).eq("session_id", session_id).execute()
    
    if not response.data:
        raise ValueError(f"❌ 找不到會話 {session_id} 的景點選擇")
    
    destination_ids = [pick["destination_id"] for pick in response.data]
    
    # 2. 取得景點詳細資料
    return get_destinations_by_ids(supabase, destination_ids)

# ============================================
# 取得距離矩陣
# ============================================
def get_distance_matrix(
    supabase: Client,
    destinations: List[Destination]
) -> Tuple[List[List[int]], Dict[Tuple[int, int], Dict]]:
    """
    從 Supabase 取得景點間的距離矩陣（用於 OR-Tools）
    
    回傳：
        - distance_matrix: 二維陣列（時間矩陣，單位：分鐘）
        - metadata: {(i, j): {"distance_km": 10, "duration_min": 20}}
    """
    n = len(destinations)
    destination_ids = [d.id for d in destinations]
    
    # 批次查詢所有距離
    response = supabase.rpc(
        "get_distance_matrix_for_route",
        {"p_destination_ids": destination_ids}
    ).execute()
    
    # 建立 ID → 索引的映射
    id_to_index = {d.id: i for i, d in enumerate(destinations)}
    
    # 初始化矩陣（預設 999999 表示無法到達）
    distance_matrix = [[999999 for _ in range(n)] for _ in range(n)]
    metadata = {}
    
    # 填入實際距離
    for record in response.data:
        from_idx = id_to_index[record["from_id"]]
        to_idx = id_to_index[record["to_id"]]
        
        distance_matrix[from_idx][to_idx] = record["duration_minutes"]
        
        metadata[(from_idx, to_idx)] = {
            "distance_km": float(record["distance_km"]),
            "duration_min": record["duration_minutes"]
        }
    
    # 對角線設為 0
    for i in range(n):
        distance_matrix[i][i] = 0
    
    return distance_matrix, metadata

# ============================================
# OR-Tools 路線優化
# ============================================
def optimize_route_tsp(
    destinations: List[Destination],
    distance_matrix: List[List[int]],
    metadata: Dict[Tuple[int, int], Dict],
    hotel_index: int = 0
) -> List[int]:
    """
    使用 OR-Tools 解決 TSP 問題
    
    參數：
        destinations: 景點列表
        distance_matrix: 時間矩陣（分鐘）
        metadata: 距離詳細資料
        hotel_index: 飯店索引（起點 & 終點）
        
    回傳：
        最佳路線索引列表 [0, 3, 1, 2, 0]
    """
    n = len(destinations)
    
    # 建立 OR-Tools 管理器
    manager = pywrapcp.RoutingIndexManager(n, 1, hotel_index)
    routing = pywrapcp.RoutingModel(manager)
    
    # 定義距離回調函數
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # 設定搜尋策略
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    
    # 執行優化
    solution = routing.SolveWithParameters(search_parameters)
    
    if not solution:
        raise ValueError("❌ 無法找到最佳路線")
    
    # 提取路線
    route = []
    index = routing.Start(0)
    
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route.append(node)
        index = solution.Value(routing.NextVar(index))
    
    # 加上終點（回到飯店）
    route.append(hotel_index)
    
    return route

# ============================================
# 分組多日行程
# ============================================
def split_route_by_days(
    route: List[int],
    destinations: List[Destination],
    metadata: Dict[Tuple[int, int], Dict],
    max_daily_minutes: int = MAX_DAILY_MINUTES
) -> List[Route]:
    """
    將路線按每日時間限制分組
    
    參數：
        route: 最佳路線索引 [0, 3, 1, 2, 0]
        destinations: 景點列表
        metadata: 距離詳細資料
        max_daily_minutes: 每日最大用車時間（分鐘）
        
    回傳：
        多日行程列表 [Route, Route, ...]
    """
    daily_routes = []
    current_day = 1
    current_destinations = [destinations[route[0]]]  # 起點（飯店）
    current_duration = 0
    current_distance = 0
    current_segments = []
    
    for i in range(len(route) - 1):
        from_idx = route[i]
        to_idx = route[i + 1]
        
        segment_data = metadata.get((from_idx, to_idx), {})
        segment_duration = segment_data.get("duration_min", 0)
        segment_distance = segment_data.get("distance_km", 0)
        
        # 檢查是否超過每日限制
        if current_duration + segment_duration > max_daily_minutes and len(current_destinations) > 1:
            # 保存當前天的行程
            daily_routes.append(Route(
                day=current_day,
                destinations=current_destinations,
                total_distance_km=current_distance,
                total_duration_minutes=current_duration,
                segments=current_segments
            ))
            
            # 開始新的一天
            current_day += 1
            current_destinations = [destinations[route[0]]]  # 重新從飯店出發
            current_duration = 0
            current_distance = 0
            current_segments = []
        
        # 加入當前景點
        current_destinations.append(destinations[to_idx])
        current_duration += segment_duration
        current_distance += segment_distance
        current_segments.append({
            "from": destinations[from_idx].name,
            "to": destinations[to_idx].name,
            "distance_km": segment_distance,
            "duration_min": segment_duration
        })
    
    # 保存最後一天的行程
    if len(current_destinations) > 1:
        daily_routes.append(Route(
            day=current_day,
            destinations=current_destinations,
            total_distance_km=current_distance,
            total_duration_minutes=current_duration,
            segments=current_segments
        ))
    
    return daily_routes

# ============================================
# 主函數
# ============================================
def main():
    parser = argparse.ArgumentParser(description="清邁景點路線優化")
    parser.add_argument("--session-id", help="客戶會話 ID")
    parser.add_argument("--destination-ids", help="景點 ID（逗號分隔）")
    parser.add_argument("--hotel-lat", type=float, help="飯店緯度")
    parser.add_argument("--hotel-lng", type=float, help="飯店經度")
    
    args = parser.parse_args()
    
    print("🚀 清邁景點路線優化")
    print("="*60)
    
    # 初始化 Supabase
    supabase = init_supabase()
    
    # 取得景點列表
    if args.session_id:
        destinations = get_destinations_by_session(supabase, args.session_id)
    elif args.destination_ids:
        destination_ids = args.destination_ids.split(",")
        destinations = get_destinations_by_ids(supabase, destination_ids)
    else:
        raise ValueError("❌ 請提供 --session-id 或 --destination-ids")
    
    print(f"✅ 找到 {len(destinations)} 個景點：{[d.name for d in destinations]}")
    
    # 取得距離矩陣
    distance_matrix, metadata = get_distance_matrix(supabase, destinations)
    print(f"✅ 取得距離矩陣（{len(destinations)}x{len(destinations)}）")
    
    # 優化路線
    optimal_route = optimize_route_tsp(destinations, distance_matrix, metadata)
    print(f"✅ 最佳路線：{[destinations[i].name for i in optimal_route]}")
    
    # 分組多日行程
    daily_routes = split_route_by_days(optimal_route, destinations, metadata)
    
    # 輸出結果
    print(f"\n📅 建議行程（共 {len(daily_routes)} 天）")
    print("="*60)
    
    for route in daily_routes:
        print(f"\n【Day {route.day}】")
        print(f"  景點：{' → '.join([d.name for d in route.destinations])}")
        print(f"  總距離：{route.total_distance_km:.1f} km")
        print(f"  總時間：{route.total_duration_minutes // 60} 小時 {route.total_duration_minutes % 60} 分鐘")
        print(f"  明細：")
        for seg in route.segments:
            print(f"    • {seg['from']} → {seg['to']}: {seg['distance_km']:.1f} km, {seg['duration_min']} 分鐘")

if __name__ == "__main__":
    main()
