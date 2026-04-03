# 清邁景點路線優化 - 快速上手

## 🚀 3 步驟完成安裝

### 1. 安裝依賴

```bash
cd ~/Projects/venturo-erp
./scripts/setup-route-optimizer.sh
```

這會自動：
- ✅ 檢查 Python 環境
- ✅ 建立虛擬環境
- ✅ 安裝 `ortools`, `supabase`, `requests`
- ✅ 執行 Supabase Migration

---

### 2. 設定 API Key

在 `.env.local` 新增：

```bash
# Google Maps API Key（需要啟用 Distance Matrix API）
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**取得 API Key：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案 → APIs & Services → Enable APIs
3. 啟用 **Distance Matrix API**
4. Credentials → Create API Key

**設定額度（避免超支）：**
- Distance Matrix API 成本：$5 / 1,000 次
- 50 景點 = 2,500 次 = **$12.5**
- 建議設定每日額度：$20 / day

---

### 3. 測試系統

```bash
# 快速測試（不實際呼叫 API）
./scripts/test-route-optimizer.sh
```

**預期輸出：**
```
✅ Supabase URL: https://...
✅ 找到 50 個清邁景點
✅ 已有 2500 筆距離資料
✅ 測試完成！
```

---

## 🎯 實際使用

### 方式 1：Python 腳本

```bash
# 一次性計算距離矩陣（只需執行一次）
python scripts/calculate-distance-matrix.py --city 清邁

# 路線優化（輸入景點 IDs）
python scripts/optimize-route.py --destination-ids uuid1,uuid2,uuid3
```

---

### 方式 2：TypeScript API

```typescript
import { optimizeRoute } from '@/lib/route-optimizer';

const result = await optimizeRoute({
  destinationIds: ['uuid1', 'uuid2', 'uuid3'],
  hotelId: 'hotel-uuid',
  maxDailyHours: 10,
});

console.log(result.dailyRoutes);
// [
//   { day: 1, destinations: [...], totalDurationMinutes: 480, ... },
//   { day: 2, destinations: [...], totalDurationMinutes: 540, ... }
// ]
```

---

### 方式 3：React 組件

```tsx
import OptimizedRouteDisplay from '@/components/route-optimizer/OptimizedRouteDisplay';

export default function RoutePage() {
  const [result, setResult] = useState<OptimizedRouteResult | null>(null);

  async function handleOptimize() {
    const response = await fetch('/api/route-optimizer/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinationIds: ['uuid1', 'uuid2'],
        maxDailyHours: 10,
      }),
    });

    const data = await response.json();
    setResult(data.data);
  }

  return (
    <div>
      <button onClick={handleOptimize}>優化路線</button>
      {result && <OptimizedRouteDisplay result={result} />}
    </div>
  );
}
```

---

## 📊 輸出範例

```
📅 建議行程（共 3 天）
============================================================

【Day 1】
  景點：飯店 → 雙龍寺 → 清邁大學 → 飯店
  總距離：45.2 km
  總時間：2 小時 30 分鐘

【Day 2】
  景點：飯店 → 大象保護區 → 夜市 → 飯店
  總距離：68.5 km
  總時間：3 小時 15 分鐘

【Day 3】
  景點：飯店 → 古城 → 週末市集 → 飯店
  總距離：32.1 km
  總時間：1 小時 50 分鐘
```

---

## ⚠️ 常見問題

### Q1：Google Maps API 錯誤 "REQUEST_DENIED"
**A1**：請確認已啟用 **Distance Matrix API**

---

### Q2：OR-Tools 安裝失敗
**A2**：請使用 Python 3.8+
```bash
python3 --version  # 確認版本
pip install --upgrade ortools
```

---

### Q3：距離矩陣為空
**A3**：需要先執行一次性計算：
```bash
python scripts/calculate-distance-matrix.py --city 清邁
```

---

## 📚 完整文件

詳細說明請參考：
- [docs/ROUTE_OPTIMIZER.md](./docs/ROUTE_OPTIMIZER.md)

---

**完成日期**：2026-04-03
**開發者**：Matthew 🔧
**委託人**：William Chien
