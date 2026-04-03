# 清邁景點路線優化系統

## 📖 功能說明

**解決問題：**
- 客戶選擇 10+ 個景點 → 如何安排最佳路線？
- 避免來回跑（A→B→C→A→D）
- 每日用車時間限制（10-12 小時）

**技術方案：**
1. **距離矩陣**：一次性計算所有景點間的距離（Google Maps API）
2. **路線優化**：使用 Google OR-Tools 解決 TSP 問題
3. **多日分組**：按每日時間限制分天

---

## 🗂️ 資料表結構

### 1. `destinations` 表（景點資料庫）

```sql
CREATE TABLE destinations (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude DECIMAL,
  longitude DECIMAL,
  category TEXT,
  ...
);
```

### 2. `distance_matrix` 表（距離矩陣）

```sql
CREATE TABLE distance_matrix (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  from_destination_id UUID REFERENCES destinations(id),
  to_destination_id UUID REFERENCES destinations(id),
  distance_km DECIMAL,
  duration_minutes INTEGER,
  calculated_at TIMESTAMP,
  UNIQUE(city, from_destination_id, to_destination_id)
);
```

**查詢函數：**
```sql
-- 查詢兩點間距離
SELECT * FROM get_distance_between('uuid1', 'uuid2');

-- 批次查詢（用於路線優化）
SELECT * FROM get_distance_matrix_for_route(ARRAY['uuid1', 'uuid2', ...]);
```

---

## 🚀 使用方式

### 1. 一次性計算距離矩陣

**安裝依賴：**
```bash
pip install supabase requests
```

**執行腳本：**
```bash
# 測試模式（不實際計算）
python scripts/calculate-distance-matrix.py --city 清邁 --dry-run

# 實際執行（會呼叫 Google Maps API）
python scripts/calculate-distance-matrix.py --city 清邁
```

**成本估算：**
- Google Distance Matrix API：$5 / 1,000 次
- 50 景點 = 2,500 次 = **$12.5**（一次性成本）

---

### 2. 路線優化

**安裝 OR-Tools：**
```bash
pip install ortools
```

**執行腳本：**
```bash
# 方式 1：使用客戶會話 ID
python scripts/optimize-route.py --session-id abc123

# 方式 2：指定景點 ID
python scripts/optimize-route.py --destination-ids uuid1,uuid2,uuid3
```

**輸出範例：**
```
📅 建議行程（共 3 天）
============================================================

【Day 1】
  景點：飯店 → 雙龍寺 → 清邁大學 → 飯店
  總距離：45.2 km
  總時間：2 小時 30 分鐘
  明細：
    • 飯店 → 雙龍寺: 15.2 km, 35 分鐘
    • 雙龍寺 → 清邁大學: 8.5 km, 20 分鐘
    • 清邁大學 → 飯店: 21.5 km, 35 分鐘
```

---

### 3. TypeScript / React 整合

**API 呼叫：**
```typescript
import { optimizeRoute } from '@/lib/route-optimizer';

const result = await optimizeRoute({
  destinationIds: ['uuid1', 'uuid2', 'uuid3'],
  hotelId: 'hotel-uuid',
  maxDailyHours: 10,
});

console.log(result.dailyRoutes);
console.log(result.warnings);
```

**React 組件：**
```tsx
import OptimizedRouteDisplay from '@/components/route-optimizer/OptimizedRouteDisplay';

<OptimizedRouteDisplay result={result} />
```

**API Route：**
```bash
curl -X POST http://localhost:3000/api/route-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "destinationIds": ["uuid1", "uuid2"],
    "hotelId": "hotel-uuid",
    "maxDailyHours": 10
  }'
```

---

## ⚙️ 設定

### Google Maps API Key

**需要啟用：**
- Distance Matrix API

**設定環境變數：**
```bash
# .env.local
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**設定額度（避免超支）：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇專案 → APIs & Services → Credentials
3. 編輯 API Key → Set application restrictions
4. 設定每日配額：例如 $20 / day

---

## 🧪 測試流程

### 1. 測試距離計算
```bash
# 先插入測試景點
psql $DATABASE_URL -c "
INSERT INTO destinations (id, city, name, latitude, longitude)
VALUES
  ('test-1', '清邁', '雙龍寺', 18.8050, 98.9219),
  ('test-2', '清邁', '清邁大學', 18.8036, 98.9528);
"

# 計算距離
python scripts/calculate-distance-matrix.py --city 清邁 --dry-run
```

### 2. 測試路線優化
```bash
python scripts/optimize-route.py --destination-ids test-1,test-2
```

### 3. 測試 API
```bash
curl -X POST http://localhost:3000/api/route-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "destinationIds": ["test-1", "test-2"],
    "maxDailyHours": 10
  }'
```

---

## ⚠️ 注意事項

### 1. Google Maps API 成本
- Distance Matrix API：$5 / 1,000 次
- 建議：一次性計算完存入資料庫，不要重複呼叫

### 2. 路線優化的「合理性」
- OR-Tools 會找「數學上最優」的路線
- 但不一定符合「旅遊邏輯」
- 建議：加入規則（例如：同區域景點優先、避開塞車時段）

### 3. 資料更新
- 新增景點 → 需要重新計算距離矩陣
- 景點位置變更 → 需要刪除舊資料並重新計算

**清除舊資料：**
```sql
DELETE FROM distance_matrix WHERE city = '清邁';
```

---

## 📚 參考資料

- [Google Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix)
- [Google OR-Tools](https://developers.google.com/optimization/routing/tsp)
- [TSP Problem (Wikipedia)](https://en.wikipedia.org/wiki/Travelling_salesman_problem)

---

## 🎯 未來改進

1. **實時交通**：Google Maps API 可查詢即時路況
2. **景點優先級**：必去景點優先安排
3. **營業時間**：避免安排到休息日
4. **用餐時間**：自動插入午餐/晚餐景點
5. **地圖視覺化**：Leaflet / Google Maps 顯示路線

---

**完成日期**：2026-04-03
**版本**：v1.0
