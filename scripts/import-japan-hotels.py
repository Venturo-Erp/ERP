#!/usr/bin/env python3
"""
匯入 318 筆日本飯店資料到 hotels 表
"""
import json
import os
import requests
from pathlib import Path

# Supabase credentials
SUPABASE_PROJECT_ID = "pfqvdacxowpgfamuvnsn"
SUPABASE_TOKEN = os.getenv("SUPABASE_TOKEN")
if not SUPABASE_TOKEN:
    creds_file = Path.home() / "Projects/venturo-erp/.claude/SUPABASE_CREDENTIALS.md"
    with open(creds_file) as f:
        for line in f:
            if line.strip().startswith("sbp_"):
                SUPABASE_TOKEN = line.strip()
                break

API_URL = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_ID}/database/query"
HEADERS = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

# 讀取日本飯店資料
json_path = Path.home() / ".openclaw/workspace-william/scraping-data/jptg-hotel-data.json"
print(f"📖 讀取 {json_path}...")

with open(json_path) as f:
    japan_hotels = json.load(f)

print(f"✅ 找到 {len(japan_hotels)} 筆日本飯店")

# 查詢現有飯店名稱（避免重複）
print("\n🔍 檢查重複...")
response = requests.post(
    API_URL,
    headers=HEADERS,
    json={"query": "SELECT name, name_local FROM hotels"}
)
existing_names = set()
if response.ok:
    for row in response.json():
        existing_names.add(row.get("name", ""))
        if row.get("name_local"):
            existing_names.add(row["name_local"])

print(f"現有 {len(existing_names)} 個飯店名稱")

# 處理資料
imported_count = 0
skipped_count = 0
error_count = 0

for hotel in japan_hotels:
    # 檢查重複
    if hotel.get("nameZh") in existing_names or hotel.get("nameJp") in existing_names:
        skipped_count += 1
        continue
    
    # 轉換區域資訊（簡化版，之後可以對應到 countries/regions/cities 表）
    region_info = hotel.get("region", {})
    prefecture = region_info.get("prefecture", "")
    city = region_info.get("city", "")
    
    # 準備 SQL
    values = {
        "name": hotel.get("nameZh", ""),
        "english_name": hotel.get("nameEn", ""),
        "name_local": hotel.get("nameJp", ""),
        "address": hotel.get("address", ""),
        "booking_phone": hotel.get("phone", ""),
        "internal_notes": hotel.get("notes", ""),  # 領隊筆記！
        "star_rating": 3,  # 預設 3 星（領隊用飯店）
        "hotel_class": "standard",
        "is_active": True,
        "country_id": "japan"
    }
    
    # 使用參數化查詢
    query = """
    INSERT INTO hotels (
        name, english_name, name_local, address, booking_phone,
        internal_notes, star_rating, hotel_class, is_active, country_id
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    )
    """
    
    try:
        # 注意：Supabase API 不支援 parameterized query，需要用字串拼接（但要 escape）
        escaped_values = {
            k: v.replace("'", "''") if isinstance(v, str) else v 
            for k, v in values.items()
        }
        
        query_str = f"""
        INSERT INTO hotels (
            name, english_name, name_local, address, booking_phone,
            internal_notes, star_rating, hotel_class, is_active, country_id
        ) VALUES (
            '{escaped_values['name']}', 
            '{escaped_values['english_name']}', 
            '{escaped_values['name_local']}', 
            '{escaped_values['address']}', 
            '{escaped_values['booking_phone']}',
            '{escaped_values['internal_notes']}',
            {escaped_values['star_rating']},
            '{escaped_values['hotel_class']}',
            {str(escaped_values['is_active']).lower()},
            '{escaped_values['country_id']}'
        )
        """
        
        response = requests.post(
            API_URL,
            headers=HEADERS,
            json={"query": query_str}
        )
        
        if response.ok:
            imported_count += 1
            if imported_count % 50 == 0:
                print(f"已匯入 {imported_count} 筆...")
        else:
            error_count += 1
            print(f"❌ 匯入失敗: {hotel['nameZh']} - {response.text[:100]}")
    
    except Exception as e:
        error_count += 1
        print(f"❌ 錯誤: {hotel.get('nameZh', 'unknown')} - {e}")

print(f"""
============================================================
📊 匯入完成

✅ 成功匯入: {imported_count} 筆
⏭️  跳過重複: {skipped_count} 筆
❌ 匯入失敗: {error_count} 筆
============================================================
""")
