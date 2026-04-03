#!/usr/bin/env python3
"""
清邁景點距離矩陣計算腳本
一次性計算所有景點間的距離，存入 Supabase

使用 Google Maps Distance Matrix API
成本：$5 / 1,000 次（假設 50 景點 = 2,500 次 = $12.5）

使用方式：
    python scripts/calculate-distance-matrix.py --city 清邁 --dry-run
    python scripts/calculate-distance-matrix.py --city 清邁  # 實際執行
"""

import os
import sys
import time
import argparse
from typing import List, Dict, Tuple
from datetime import datetime
import requests
from supabase import create_client, Client

# ============================================
# 設定
# ============================================
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_VISION_API_KEYS")  # 暫用 Vision Key，實際需要 Distance Matrix API Key

# Google Distance Matrix API
DISTANCE_API_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

# ============================================
# Supabase 客戶端
# ============================================
def init_supabase() -> Client:
    """初始化 Supabase 客戶端"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("❌ 環境變數未設定：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# 取得清邁景點列表
# ============================================
def get_destinations(supabase: Client, city: str = "清邁") -> List[Dict]:
    """
    從 Supabase 取得景點列表
    
    回傳格式：
    [
        {
            "id": "uuid",
            "name": "雙龍寺",
            "latitude": 18.8050,
            "longitude": 98.9219
        },
        ...
    ]
    """
    response = supabase.table("destinations").select(
        "id, name, latitude, longitude"
    ).eq("city", city).execute()
    
    destinations = response.data
    
    if not destinations:
        raise ValueError(f"❌ 找不到城市「{city}」的景點資料")
    
    print(f"✅ 找到 {len(destinations)} 個景點")
    return destinations

# ============================================
# Google Maps Distance Matrix API
# ============================================
def calculate_distance(
    origin: Tuple[float, float],
    destination: Tuple[float, float],
    api_key: str
) -> Tuple[float, int, Dict]:
    """
    計算兩點間的距離與時間
    
    參數：
        origin: (latitude, longitude)
        destination: (latitude, longitude)
        api_key: Google Maps API Key
        
    回傳：
        (distance_km, duration_minutes, raw_response)
    """
    params = {
        "origins": f"{origin[0]},{origin[1]}",
        "destinations": f"{destination[0]},{destination[1]}",
        "mode": "driving",
        "key": api_key
    }
    
    response = requests.get(DISTANCE_API_URL, params=params)
    response.raise_for_status()
    
    data = response.json()
    
    # 檢查狀態
    if data["status"] != "OK":
        raise ValueError(f"❌ API 錯誤：{data['status']}")
    
    # 提取距離與時間
    element = data["rows"][0]["elements"][0]
    
    if element["status"] != "OK":
        raise ValueError(f"❌ 路線錯誤：{element['status']}")
    
    distance_km = element["distance"]["value"] / 1000  # 公尺 → 公里
    duration_minutes = element["duration"]["value"] / 60  # 秒 → 分鐘
    
    return (distance_km, int(duration_minutes), data)

# ============================================
# 批次計算距離矩陣
# ============================================
def calculate_matrix(
    supabase: Client,
    city: str = "清邁",
    dry_run: bool = False
) -> None:
    """
    計算所有景點間的距離矩陣
    
    參數：
        supabase: Supabase 客戶端
        city: 城市名稱
        dry_run: 是否為測試模式（不寫入資料庫）
    """
    # 1. 取得景點列表
    destinations = get_destinations(supabase, city)
    n = len(destinations)
    
    print(f"\n📊 計算 {n} 個景點的距離矩陣")
    print(f"預計 API 呼叫次數：{n * n} 次")
    print(f"預估成本：${(n * n) * 0.005:.2f} USD")
    
    if dry_run:
        print("\n🧪 測試模式：不會實際呼叫 API 或寫入資料庫")
        print(f"景點列表：{[d['name'] for d in destinations[:5]]}...")
        return
    
    # 2. 計算距離矩陣
    total_calls = n * n
    current_call = 0
    errors = []
    
    for i, origin_dest in enumerate(destinations):
        for j, target_dest in enumerate(destinations):
            current_call += 1
            
            # 跳過同一景點
            if origin_dest["id"] == target_dest["id"]:
                print(f"[{current_call}/{total_calls}] ⏭️  跳過：{origin_dest['name']} → {target_dest['name']}")
                continue
            
            # 檢查是否已存在
            existing = supabase.table("distance_matrix").select("id").eq(
                "from_destination_id", origin_dest["id"]
            ).eq(
                "to_destination_id", target_dest["id"]
            ).execute()
            
            if existing.data:
                print(f"[{current_call}/{total_calls}] ⏭️  已存在：{origin_dest['name']} → {target_dest['name']}")
                continue
            
            # 呼叫 Google Maps API
            try:
                origin_coords = (origin_dest["latitude"], origin_dest["longitude"])
                target_coords = (target_dest["latitude"], target_dest["longitude"])
                
                distance_km, duration_min, raw_response = calculate_distance(
                    origin_coords,
                    target_coords,
                    GOOGLE_MAPS_API_KEY
                )
                
                # 寫入 Supabase
                supabase.table("distance_matrix").insert({
                    "city": city,
                    "from_destination_id": origin_dest["id"],
                    "to_destination_id": target_dest["id"],
                    "distance_km": distance_km,
                    "duration_minutes": duration_min,
                    "raw_response": raw_response
                }).execute()
                
                print(f"[{current_call}/{total_calls}] ✅ {origin_dest['name']} → {target_dest['name']}: {distance_km:.1f} km, {duration_min} 分鐘")
                
                # 避免超過 API 速率限制（每秒最多 100 次）
                time.sleep(0.01)
                
            except Exception as e:
                error_msg = f"❌ {origin_dest['name']} → {target_dest['name']}: {str(e)}"
                print(f"[{current_call}/{total_calls}] {error_msg}")
                errors.append(error_msg)
                continue
    
    # 3. 總結
    print(f"\n{'='*60}")
    print(f"✅ 完成！共計算 {total_calls} 次")
    if errors:
        print(f"❌ 錯誤 {len(errors)} 次：")
        for error in errors[:10]:  # 只顯示前 10 個錯誤
            print(f"  - {error}")
    else:
        print("🎉 所有距離計算成功！")

# ============================================
# 主程式
# ============================================
def main():
    parser = argparse.ArgumentParser(description="計算清邁景點距離矩陣")
    parser.add_argument("--city", default="清邁", help="城市名稱（預設：清邁）")
    parser.add_argument("--dry-run", action="store_true", help="測試模式（不實際計算）")
    
    args = parser.parse_args()
    
    print("🚀 清邁景點距離矩陣計算腳本")
    print("="*60)
    
    # 初始化 Supabase
    supabase = init_supabase()
    
    # 計算距離矩陣
    calculate_matrix(supabase, args.city, args.dry_run)

if __name__ == "__main__":
    main()
